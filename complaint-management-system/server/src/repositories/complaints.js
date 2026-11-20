const db = require('../db');

const BASE = `SELECT c.*, cat.name AS category, d.name AS department, u.name AS student_name, s.name AS staff_name,
  CASE WHEN c.status NOT IN ('Resolved','Closed','Rejected') AND c.due_at IS NOT NULL AND c.due_at < datetime('now') THEN 1 ELSE 0 END AS overdue
  FROM complaints c JOIN categories cat ON cat.id=c.category_id LEFT JOIN departments d ON d.id=c.department_id
  JOIN users u ON u.id=c.user_id LEFT JOIN users s ON s.id=c.assigned_to`;

const scope = (u) => ({
  student: ['c.user_id=?', [u.id]], staff: ['c.assigned_to=?', [u.id]],
  dept_head: u.department_id ? ['c.department_id=?', [u.department_id]] : ['1=0', []], admin: ['1=1', []],
}[u.role] || ['1=0', []]);

function list(user, f) {
  const [sql, args] = scope(user);
  const where = [sql];
  if (f.status) { where.push('c.status=?'); args.push(f.status); }
  if (f.category_id) { where.push('c.category_id=?'); args.push(f.category_id); }
  if (f.priority) { where.push('c.priority=?'); args.push(f.priority); }
  if (f.q) { where.push('(c.title LIKE ? OR c.description LIKE ? OR c.ticket_no LIKE ?)'); args.push(`%${f.q}%`, `%${f.q}%`, `%${f.q}%`); }
  return db.prepare(`${BASE} WHERE ${where.join(' AND ')} ORDER BY c.created_at DESC, c.id DESC`).all(...args);
}
const byId = (id) => db.prepare(`${BASE} WHERE c.id=?`).get(id);
const raw = (id) => db.prepare('SELECT * FROM complaints WHERE id=?').get(id);
const category = (id) => db.prepare('SELECT * FROM categories WHERE id=?').get(id);
const insert = (d) => {
  const id = db.prepare(`INSERT INTO complaints(user_id,category_id,department_id,title,description,priority,anonymous,attachment,due_at)
    VALUES (?,?,?,?,?,?,?,?,datetime('now', ?))`).run(d.user_id, d.category_id, d.department_id, d.title, d.description, d.priority, d.anonymous ? 1 : 0, d.attachment, `+${d.hours} hours`).lastInsertRowid;
  db.prepare("UPDATE complaints SET ticket_no='CMS-' || strftime('%Y','now') || '-' || printf('%06d', id) WHERE id=?").run(id);
  return id;
};
const history = (id, includeInternal) => db.prepare(`SELECT cu.id, cu.status, cu.remark, cu.visibility, cu.created_at, u.name AS by_name FROM complaint_updates cu
  LEFT JOIN users u ON u.id=cu.updated_by WHERE cu.complaint_id=? ${includeInternal ? '' : "AND cu.visibility='public'"} ORDER BY cu.id`).all(id);
const addUpdate = ({ complaint_id, updated_by = null, remark, status, visibility = 'public' }) =>
  db.prepare('INSERT INTO complaint_updates(complaint_id,updated_by,remark,status,visibility) VALUES (?,?,?,?,?)').run(complaint_id, updated_by, remark, status, visibility);
const attachments = (id) => db.prepare('SELECT id, filename, original_name, mime, size FROM complaint_attachments WHERE complaint_id=?').all(id);
const addAttachment = (a) => db.prepare('INSERT INTO complaint_attachments(complaint_id,filename,original_name,mime,size,uploaded_by) VALUES (?,?,?,?,?,?)').run(a.complaint_id, a.filename, a.original, a.mime, a.size, a.uploaded_by);
const feedbackFor = (id) => db.prepare('SELECT rating, comments FROM feedback WHERE complaint_id=?').get(id) || null;
const insertFeedback = (id, rating, comments) => db.prepare('INSERT INTO feedback(complaint_id,rating,comments) VALUES (?,?,?)').run(id, rating, comments || '');
const updateState = (id, status, assignedTo) => db.prepare(`UPDATE complaints SET status=?, assigned_to=?, updated_at=CURRENT_TIMESTAMP,
  resolved_at = CASE WHEN ?='Resolved' THEN datetime('now') WHEN ?='Reopened' THEN NULL ELSE resolved_at END WHERE id=?`).run(status, assignedTo, status, status, id);
const reopenBookkeeping = (id, hours) => db.prepare(`UPDATE complaints SET reopen_count=reopen_count+1, reopened_at=datetime('now'), escalated=0,
  due_at=datetime('now', ?) WHERE id=?`).run(`+${hours} hours`, id);
const deactivateAssignments = (id) => db.prepare('UPDATE complaint_assignments SET is_active=0 WHERE complaint_id=?').run(id);
const addAssignment = (complaintId, staffId, by) => db.prepare('INSERT INTO complaint_assignments(complaint_id,staff_id,assigned_by) VALUES (?,?,?)').run(complaintId, staffId, by);
const setCategory = (id, categoryId, departmentId) => db.prepare('UPDATE complaints SET category_id=?, department_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(categoryId, departmentId, id);
const setPriority = (id, priority, hours) => db.prepare(`UPDATE complaints SET priority=?, due_at=datetime(COALESCE(reopened_at, created_at), ?), updated_at=CURRENT_TIMESTAMP WHERE id=?`).run(priority, `+${hours} hours`, id);
module.exports = { setCategory, setPriority, list, byId, raw, category, insert, history, addUpdate, attachments, addAttachment, feedbackFor, insertFeedback, updateState, reopenBookkeeping, deactivateAssignments, addAssignment };
