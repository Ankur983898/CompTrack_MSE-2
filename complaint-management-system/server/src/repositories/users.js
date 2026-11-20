const db = require('../db');

const findById = (id) => db.prepare('SELECT * FROM users WHERE id=?').get(id);
const findByEmail = (email) => db.prepare(`SELECT *, (locked_until IS NOT NULL AND locked_until > datetime('now')) AS is_locked,
  CAST((julianday(locked_until) - julianday('now')) * 1440 AS INTEGER) + 1 AS lock_minutes FROM users WHERE email=?`).get(email);
const create = ({ name, email, hash, role = 'student', department_id = null }) =>
  db.prepare('INSERT INTO users(name,email,password_hash,role,department_id) VALUES (?,?,?,?,?)').run(name, email, hash, role, department_id).lastInsertRowid;
const list = () => db.prepare(`SELECT u.id,u.name,u.email,u.role,u.status,u.department_id,d.name AS department,u.created_at
  FROM users u LEFT JOIN departments d ON d.id=u.department_id ORDER BY u.id`).all();
const staff = (departmentId) => db.prepare(`SELECT u.id,u.name,d.name AS department FROM users u LEFT JOIN departments d ON d.id=u.department_id
  WHERE u.role='staff' AND u.status='active' ${departmentId ? 'AND u.department_id=?' : ''} ORDER BY u.name`).all(...(departmentId ? [departmentId] : []));
const adminIds = () => db.prepare("SELECT id FROM users WHERE role='admin' AND status='active'").pluck().all();
const headIds = (deptId) => db.prepare("SELECT id FROM users WHERE role='dept_head' AND status='active' AND department_id=?").pluck().all(deptId);
const recordFailure = (id, max, minutes) => {
  db.prepare('UPDATE users SET failed_attempts=failed_attempts+1 WHERE id=?').run(id);
  db.prepare(`UPDATE users SET locked_until=datetime('now', ?), failed_attempts=0 WHERE id=? AND failed_attempts>=?`).run(`+${minutes} minutes`, id, max);
};
const clearFailures = (id) => db.prepare('UPDATE users SET failed_attempts=0, locked_until=NULL WHERE id=?').run(id);
const setPassword = (id, hash) => db.prepare('UPDATE users SET password_hash=? WHERE id=?').run(hash, id);
const update = (id, f) => {
  const keys = ['role', 'status', 'department_id'].filter((k) => f[k] !== undefined);
  if (!keys.length) return;
  db.prepare(`UPDATE users SET ${keys.map((k) => `${k}=?`).join(', ')} WHERE id=?`).run(...keys.map((k) => f[k]), id);
};
module.exports = { findById, findByEmail, create, list, staff, adminIds, headIds, recordFailure, clearFailures, setPassword, update };
