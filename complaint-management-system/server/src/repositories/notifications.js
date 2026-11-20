const db = require('../db');

const add = (userId, message, { type = null, complaintId = null } = {}) =>
  userId && db.prepare('INSERT INTO notifications(user_id,message,type,complaint_id) VALUES (?,?,?,?)').run(userId, message, type, complaintId);
const forUser = (userId) => db.prepare('SELECT id,message,is_read,type,complaint_id,created_at FROM notifications WHERE user_id=? ORDER BY id DESC LIMIT 50').all(userId);
const markAll = (userId) => db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=?').run(userId);
const markOne = (userId, id) => db.prepare('UPDATE notifications SET is_read=1 WHERE user_id=? AND id=?').run(userId, id);
module.exports = { add, forUser, markAll, markOne };
