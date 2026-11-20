const jwt = require('jsonwebtoken');
const cfg = require('../config');
const AppError = require('../utils/AppError');
const users = require('../repositories/users');
const tokens = require('../repositories/tokens');

const authenticate = (req, res, next) => {
  const h = req.headers.authorization || '';
  if (!h.startsWith('Bearer ')) throw new AppError(401, 'Please log in again.', 'UNAUTHENTICATED');
  let p;
  try { p = jwt.verify(h.slice(7), cfg.jwtSecret); } catch { throw new AppError(401, 'Your session has expired. Please log in again.', 'TOKEN_EXPIRED'); }
  const u = users.findById(p.id);
  if (!u || u.status !== 'active' || !tokens.familyAlive(p.sid)) throw new AppError(401, 'Your session is no longer valid. Please log in again.', 'SESSION_REVOKED');
  req.user = { id: u.id, name: u.name, role: u.role, department_id: u.department_id, sid: p.sid };
  next();
};
const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) throw new AppError(403, 'You do not have permission to do that.', 'FORBIDDEN');
  next();
};
module.exports = { authenticate, requireRole };
