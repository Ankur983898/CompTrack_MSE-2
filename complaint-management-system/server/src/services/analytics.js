const db = require('../db');

const OPEN = "c.status NOT IN ('Resolved','Closed','Rejected')";
function build({ from, to }) {
  const W = ` WHERE (? IS NULL OR c.created_at >= ?) AND (? IS NULL OR c.created_at < datetime(?, '+1 day'))`;
  const a = [from || null, from || null, to || null, to || null];
  const all = (sql) => db.prepare(sql).all(...a);
  const t = db.prepare(`SELECT COUNT(*) total,
    COALESCE(SUM(c.status IN ('Submitted','Under Review','Assigned','In Progress','Reopened','Escalated')),0) pending,
    COALESCE(SUM(c.status IN ('Resolved','Closed')),0) resolved, COALESCE(SUM(c.status='Rejected'),0) rejected,
    COALESCE(SUM(c.escalated=1),0) escalated, COALESCE(SUM(${OPEN} AND c.due_at < datetime('now')),0) overdue FROM complaints c${W}`).get(...a);
  const r = db.prepare(`SELECT ROUND(AVG(f.rating),1) avg, COUNT(*) n FROM feedback f JOIN complaints c ON c.id=f.complaint_id${W}`).get(...a);
  return {
    ...t,
    avgResolutionDays: db.prepare(`SELECT ROUND(AVG(julianday(c.resolved_at)-julianday(c.created_at)),1) d FROM complaints c${W} AND c.resolved_at IS NOT NULL`).get(...a).d,
    avgRating: r.avg, ratingCount: r.n,
    byStatus: all(`SELECT c.status name, COUNT(*) n FROM complaints c${W} GROUP BY c.status ORDER BY n DESC`),
    byCategory: all(`SELECT cat.name, COUNT(*) n FROM complaints c JOIN categories cat ON cat.id=c.category_id${W} GROUP BY cat.id ORDER BY n DESC`),
    byPriority: all(`SELECT c.priority name, COUNT(*) n FROM complaints c${W} GROUP BY c.priority`),
    byDepartment: all(`SELECT COALESCE(d.name,'Unrouted') name, COUNT(*) total, SUM(c.status IN ('Resolved','Closed')) resolved,
      ROUND(AVG(CASE WHEN c.resolved_at IS NOT NULL THEN julianday(c.resolved_at)-julianday(c.created_at) END),1) avgDays,
      SUM(${OPEN} AND c.due_at < datetime('now')) overdue FROM complaints c LEFT JOIN departments d ON d.id=c.department_id${W} GROUP BY d.id ORDER BY total DESC`),
    staffWorkload: all(`SELECT u.name, SUM(${OPEN}) open, SUM(c.status IN ('Resolved','Closed')) resolved FROM complaints c JOIN users u ON u.id=c.assigned_to${W} GROUP BY u.id ORDER BY open DESC`),
    monthly: all(`SELECT strftime('%Y-%m', c.created_at) month, COUNT(*) filed, SUM(c.status IN ('Resolved','Closed')) resolved FROM complaints c${W} GROUP BY month ORDER BY month`),
    ratings: all(`SELECT f.rating, COUNT(*) n FROM feedback f JOIN complaints c ON c.id=f.complaint_id${W} GROUP BY f.rating ORDER BY f.rating`),
  };
}

const cell = (v) => { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
function csv({ from, to }) {
  const rows = db.prepare(`SELECT c.ticket_no, c.title, cat.name category, d.name department, c.priority, c.status,
    CASE WHEN c.anonymous=1 THEN 'Anonymous' ELSE u.name END student, s.name assigned_to, c.created_at, c.due_at, c.resolved_at,
    CASE WHEN ${OPEN} AND c.due_at < datetime('now') THEN 'yes' ELSE 'no' END overdue, f.rating
    FROM complaints c JOIN categories cat ON cat.id=c.category_id LEFT JOIN departments d ON d.id=c.department_id JOIN users u ON u.id=c.user_id
    LEFT JOIN users s ON s.id=c.assigned_to LEFT JOIN feedback f ON f.complaint_id=c.id
    WHERE (? IS NULL OR c.created_at >= ?) AND (? IS NULL OR c.created_at < datetime(?, '+1 day')) ORDER BY c.id`).all(from || null, from || null, to || null, to || null);
  const cols = ['ticket_no', 'title', 'category', 'department', 'priority', 'status', 'student', 'assigned_to', 'created_at', 'due_at', 'resolved_at', 'overdue', 'rating'];
  return [cols.join(','), ...rows.map((r) => cols.map((k) => cell(r[k])).join(','))].join('\n');
}
module.exports = { build, csv };
