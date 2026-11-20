const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cfg = require('../config');
const AppError = require('../utils/AppError');
const { sha256, randomToken, uuid } = require('../utils/crypto');
const { sendMail } = require('../utils/mailer');
const users = require('../repositories/users');
const tokens = require('../repositories/tokens');
const audit = require('./audit');

const publicUser = (u) => ({ id: u.id, name: u.name, role: u.role });
function issue(user, family, ua) {
  const refresh = randomToken(48);
  tokens.create({ userId: user.id, family, hash: sha256(refresh), days: cfg.refreshDays, ua });
  const access = jwt.sign({ id: user.id, role: user.role, sid: family }, cfg.jwtSecret, { expiresIn: cfg.accessTtl });
  return { token: access, refreshToken: refresh, user: publicUser(user) };
}

function register(req, { name, email, password }) {
  if (users.findByEmail(email)) throw new AppError(409, 'That email is already registered.', 'EMAIL_TAKEN');
  const id = users.create({ name, email, hash: bcrypt.hashSync(password, cfg.bcryptCost) });
  audit.record({ user: { id }, ip: req.ip }, 'auth.register', 'user', id);
  return issue(users.findById(id), uuid(), req.headers['user-agent']);
}

function login(req, { email, password }) {
  const u = users.findByEmail(email);
  const bad = () => new AppError(401, 'Wrong email or password.', 'BAD_CREDENTIALS');
  if (!u) throw bad();
  if (u.status !== 'active') throw new AppError(403, 'This account is not active. Please contact the administrator.', 'ACCOUNT_INACTIVE');
  if (u.is_locked) throw new AppError(423, `Too many failed attempts. Try again in ${u.lock_minutes} minute(s).`, 'ACCOUNT_LOCKED');
  if (!bcrypt.compareSync(password, u.password_hash)) {
    users.recordFailure(u.id, cfg.maxLoginAttempts, cfg.lockMinutes);
    audit.record({ user: { id: u.id }, ip: req.ip }, 'auth.login_failed', 'user', u.id);
    throw bad();
  }
  users.clearFailures(u.id);
  audit.record({ user: u, ip: req.ip }, 'auth.login', 'user', u.id);
  return issue(u, uuid(), req.headers['user-agent']);
}

function refresh(raw, ua) {
  const row = raw && tokens.findByHash(sha256(raw));
  if (!row) throw new AppError(401, 'Please log in again.', 'BAD_REFRESH');
  if (row.revoked_at) { tokens.revokeFamily(row.family); throw new AppError(401, 'Session revoked. Please log in again.', 'REFRESH_REUSE'); }
  const u = users.findById(row.user_id);
  if (row.expired || !u || u.status !== 'active') throw new AppError(401, 'Please log in again.', 'BAD_REFRESH');
  tokens.revoke(row.id);
  return issue(u, row.family, ua);
}

function logout(req, raw) {
  const row = raw && tokens.findByHash(sha256(raw));
  const family = (req.user && req.user.sid) || (row && row.family);
  if (family) tokens.revokeFamily(family);
  if (req.user) audit.record(req, 'auth.logout', 'user', req.user.id);
}

function forgot(email) {
  const u = users.findByEmail(email);
  if (u && u.status === 'active') {
    const raw = randomToken(32);
    tokens.createReset(u.id, sha256(raw), 30);
    sendMail({ to: u.email, subject: 'Reset your Complaint Desk password',
      text: `Use this token to reset your password (valid for 30 minutes):\n\n${raw}\n\nIf you did not ask for this, ignore this email.` });
  }
  return { message: 'If that email is registered, a reset link has been sent.' };
}

function reset(req, { token, password }) {
  const row = tokens.findReset(sha256(token));
  if (!row) throw new AppError(400, 'This reset link is invalid or has expired.', 'BAD_RESET');
  users.setPassword(row.user_id, bcrypt.hashSync(password, cfg.bcryptCost));
  users.clearFailures(row.user_id);
  tokens.markReset(row.id);
  tokens.revokeAllForUser(row.user_id);
  audit.record({ user: { id: row.user_id }, ip: req.ip }, 'auth.password_reset', 'user', row.user_id);
  return { message: 'Password updated. Please log in.' };
}
module.exports = { register, login, refresh, logout, forgot, reset, publicUser };
