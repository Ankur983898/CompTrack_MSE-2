const db = require('../db');
const AppError = require('../utils/AppError');
const { allowedFor } = require('../utils/status');
const repo = require('../repositories/complaints');
const users = require('../repositories/users');
const esc = require('../repositories/escalation');
const notify = require('./notifications');
const audit = require('./audit');

const canAccess = (u, c) => ({
  student: c.user_id === u.id, staff: c.assigned_to === u.id,
  dept_head: !!u.department_id && c.department_id === u.department_id, admin: true,
}[u.role] || false);
const mask = (c, v) => (c.anonymous && v.role !== 'admin' && v.id !== c.user_id ? { ...c, student_name: 'Anonymous', user_id: null } : c);
const hoursFor = (p) => esc.rules()[p] || 48;
const load = (user, id) => {
  const c = repo.raw(id);
  if (!c) throw new AppError(404, 'Complaint not found.', 'NOT_FOUND');
  if (!canAccess(user, c)) throw new AppError(403, 'Not allowed.', 'FORBIDDEN');
  return c;
};

const list = (user, filters) => repo.list(user, filters).map((c) => mask(c, user));

function detail(user, id) {
  load(user, id);
  const c = repo.byId(id);
  return { ...mask(c, user), updates: repo.history(id, user.role !== 'student'), feedback: repo.feedbackFor(id),
    attachments: repo.attachments(id), allowed: allowedFor(user.role, c.status), overdue: !!c.overdue };
}

function create(req, data, files) {
  const user = req.user;
  const cat = repo.category(data.category_id);
  if (!cat) throw new AppError(400, 'Choose a valid category.', 'BAD_CATEGORY');
  const id = db.transaction(() => {
    const cid = repo.insert({ ...data, user_id: user.id, department_id: cat.department_id, attachment: files[0] ? files[0].filename : null, hours: hoursFor(data.priority) });
    repo.addUpdate({ complaint_id: cid, updated_by: user.id, remark: 'Complaint submitted', status: 'Submitted' });
    files.forEach((f) => repo.addAttachment({ ...f, complaint_id: cid, uploaded_by: user.id }));
    const c = repo.raw(cid);
    notify.toStaffSide(c, `New ${data.priority.toLowerCase()}-priority complaint #${cid}: ${data.title}`, 'complaint.created');
    audit.record(req, 'complaint.create', 'complaint', cid);
    return cid;
  })();
  return { id, ticket_no: repo.raw(id).ticket_no };
}

function update(req, id, body) {
  const user = req.user;
  const c = load(user, id);
  if (user.role === 'student' && (body.status !== 'Reopened' || body.assigned_to)) throw new AppError(403, 'You can only reopen your own complaint.', 'FORBIDDEN');
  if (user.role === 'staff' && body.assigned_to && body.assigned_to !== c.assigned_to) throw new AppError(403, 'Only an administrator or department head can assign complaints.', 'FORBIDDEN');

  if (body.priority && !['admin', 'dept_head'].includes(user.role)) throw new AppError(403, 'Only an administrator or department head can change priority.', 'FORBIDDEN');
  const priorityChanged = !!body.priority && body.priority !== c.priority;
  let assignee = c.assigned_to, reassigned = false, assigneeName = null;
  if (body.assigned_to) {
    const s = users.findById(body.assigned_to);
    if (!s || s.role !== 'staff' || s.status !== 'active') throw new AppError(400, 'Choose an active staff member.', 'BAD_ASSIGNEE');
    if (user.role === 'dept_head' && s.department_id !== user.department_id) throw new AppError(403, 'You can only assign staff from your own department.', 'FORBIDDEN');
    if (s.id !== c.assigned_to) { assignee = s.id; reassigned = true; assigneeName = s.name; }
  }
  let target = body.status || c.status;
  if (reassigned && target === c.status && ['Submitted', 'Under Review', 'Reopened', 'Escalated'].includes(c.status)) target = 'Assigned';
  const statusChanged = target !== c.status;
  if (statusChanged && !allowedFor(user.role, c.status).includes(target)) throw new AppError(400, `A complaint that is "${c.status}" can't be moved to "${target}".`, 'BAD_TRANSITION');
  if (target === 'Assigned' && !assignee) throw new AppError(400, 'Choose a staff member to assign this complaint to.', 'NEEDS_ASSIGNEE');
  if (['Resolved', 'Rejected'].includes(target) && statusChanged && !body.remark) throw new AppError(400, target === 'Resolved' ? 'Please add a resolution note.' : 'Please give a reason for rejecting.', 'NEEDS_REMARK');
  if (!statusChanged && !reassigned && !priorityChanged && !body.remark) throw new AppError(400, 'Nothing to update.', 'NO_CHANGE');

  db.transaction(() => {
    if (reassigned) { repo.deactivateAssignments(id); repo.addAssignment(id, assignee, user.id); }
    repo.updateState(id, target, assignee);
    if (target === 'Reopened' && statusChanged) repo.reopenBookkeeping(id, hoursFor(c.priority));
    if (priorityChanged) {
      repo.setPriority(id, body.priority, hoursFor(body.priority));
      repo.addUpdate({ complaint_id: id, updated_by: user.id, status: target, remark: `Priority changed from ${c.priority} to ${body.priority}`, visibility: 'public' });
    }
    const publicRemark = body.internal ? null : body.remark;
    if (statusChanged || reassigned || publicRemark) {
      repo.addUpdate({ complaint_id: id, updated_by: user.id, status: target, visibility: 'public',
        remark: publicRemark || (reassigned && !statusChanged ? `Assigned to ${assigneeName}` : statusChanged ? `Status changed to ${target}` : 'Update') });
    }
    if (body.internal && body.remark) repo.addUpdate({ complaint_id: id, updated_by: user.id, status: target, remark: body.remark, visibility: 'internal' });
    const fresh = repo.raw(id);
    if (statusChanged && user.role !== 'student') notify.toUser(c.user_id, `Complaint #${id} is now "${target}".`, 'complaint.status', id);
    else if (publicRemark && !statusChanged && user.role !== 'student') notify.toUser(c.user_id, `New update on complaint #${id}.`, 'complaint.update', id);
    if (reassigned) notify.toUser(assignee, `Complaint #${id} was assigned to you.`, 'complaint.assigned', id);
    if (target === 'Reopened' && statusChanged) notify.toStaffSide(fresh, `Complaint #${id} was reopened.`, 'complaint.reopened', user.id);
    audit.record(req, statusChanged ? 'complaint.status' : 'complaint.update', 'complaint', id, { from: c.status, to: target, priority: priorityChanged ? body.priority : undefined, assignee: reassigned ? assignee : undefined, internal: body.internal || undefined });
  })();
  return { ok: true };
}

function feedback(req, id, { rating, comments }) {
  const user = req.user;
  const c = load(user, id);
  if (c.status !== 'Resolved') throw new AppError(400, 'You can rate a complaint once it is resolved.', 'NOT_RESOLVED');
  if (repo.feedbackFor(id)) throw new AppError(409, 'You already rated this complaint.', 'ALREADY_RATED');
  db.transaction(() => {
    repo.insertFeedback(id, rating, comments);
    repo.updateState(id, 'Closed', c.assigned_to);
    repo.addUpdate({ complaint_id: id, updated_by: user.id, remark: `Rated ${rating}/5. Complaint closed.`, status: 'Closed' });
    notify.toStaffSide(c, `Complaint #${id} was rated ${rating}/5 and closed.`, 'complaint.feedback', user.id);
    audit.record(req, 'complaint.feedback', 'complaint', id, { rating });
  })();
  return { ok: true };
}
function setCategory(req, id, { category_id: categoryId }) {
  const c = load(req.user, id);
  const cat = repo.category(categoryId);
  if (!cat) throw new AppError(400, 'Choose a valid category.', 'BAD_CATEGORY');
  if (cat.id === c.category_id) throw new AppError(400, 'That is already the category.', 'NO_CHANGE');
  const old = repo.category(c.category_id);
  db.transaction(() => {
    repo.setCategory(id, cat.id, cat.department_id);
    repo.addUpdate({ complaint_id: id, updated_by: req.user.id, status: c.status, remark: `Category changed from ${old.name} to ${cat.name}`, visibility: 'public' });
    if (cat.department_id !== c.department_id) notify.toStaffSide({ ...c, department_id: cat.department_id, assigned_to: null }, `Complaint #${id} was moved to your department (${cat.name}).`, 'complaint.moved', req.user.id);
    audit.record(req, 'complaint.category', 'complaint', id, { from: old.name, to: cat.name });
  })();
  return { ok: true };
}

module.exports = { list, detail, create, update, feedback, setCategory };
