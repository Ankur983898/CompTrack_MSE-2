const db = require('../db');

const log = ({ userId = null, action, entity = null, entityId = null, meta = null, ip = null }) =>
  db.prepare('INSERT INTO audit_logs(user_id,action,entity,entity_id,meta,ip) VALUES (?,?,?,?,?,?)')
    .run(userId, action, entity, entityId, meta ? JSON.stringify(meta) : null, ip);
const list = ({ action, limit = 100, offset = 0 }) => db.prepare(`SELECT a.*, u.name AS user_name FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id
  ${action ? 'WHERE a.action=?' : ''} ORDER BY a.id DESC LIMIT ? OFFSET ?`).all(...(action ? [action] : []), limit, offset);
module.exports = { log, list };
