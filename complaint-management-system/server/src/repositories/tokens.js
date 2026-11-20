const db = require('../db');

const create = ({ userId, family, hash, days, ua }) =>
  db.prepare(`INSERT INTO refresh_tokens(user_id,family,token_hash,expires_at,user_agent) VALUES (?,?,?,datetime('now', ?),?)`)
    .run(userId, family, hash, `+${days} days`, (ua || '').slice(0, 200));
const findByHash = (hash) => db.prepare(`SELECT *, (expires_at <= datetime('now')) AS expired FROM refresh_tokens WHERE token_hash=?`).get(hash);
const revoke = (id) => db.prepare("UPDATE refresh_tokens SET revoked_at=datetime('now') WHERE id=?").run(id);
const revokeFamily = (family) => db.prepare("UPDATE refresh_tokens SET revoked_at=datetime('now') WHERE family=? AND revoked_at IS NULL").run(family);
const revokeAllForUser = (userId) => db.prepare("UPDATE refresh_tokens SET revoked_at=datetime('now') WHERE user_id=? AND revoked_at IS NULL").run(userId);
const familyAlive = (family) => !!db.prepare("SELECT 1 FROM refresh_tokens WHERE family=? AND revoked_at IS NULL AND expires_at > datetime('now')").get(family);
const createReset = (userId, hash, minutes) =>
  db.prepare(`INSERT INTO password_resets(user_id,token_hash,expires_at) VALUES (?,?,datetime('now', ?))`).run(userId, hash, `+${minutes} minutes`);
const findReset = (hash) => db.prepare("SELECT * FROM password_resets WHERE token_hash=? AND used_at IS NULL AND expires_at > datetime('now')").get(hash);
const markReset = (id) => db.prepare("UPDATE password_resets SET used_at=datetime('now') WHERE id=?").run(id);
module.exports = { create, findByHash, revoke, revokeFamily, revokeAllForUser, familyAlive, createReset, findReset, markReset };
