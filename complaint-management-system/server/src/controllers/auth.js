const cfg = require('../config');
const service = require('../services/auth');

const cookie = { httpOnly: true, sameSite: 'strict', secure: cfg.isProd, path: '/api/auth', maxAge: cfg.refreshDays * 864e5 };
const respond = (res, s, status = 200) => {
  res.cookie('rt', s.refreshToken, cookie);
  res.status(status).json({ token: s.token, user: s.user });
};
module.exports = {
  register: (req, res) => respond(res, service.register(req, req.body), 201),
  login: (req, res) => respond(res, service.login(req, req.body)),
  refresh: (req, res) => respond(res, service.refresh(req.cookies.rt, req.headers['user-agent'])),
  logout: (req, res) => { service.logout(req, req.cookies.rt); res.clearCookie('rt', { path: '/api/auth' }); res.json({ ok: true }); },
  me: (req, res) => res.json({ user: { id: req.user.id, name: req.user.name, role: req.user.role } }),
  forgot: (req, res) => res.json(service.forgot(req.body.email)),
  reset: (req, res) => res.json(service.reset(req, req.body)),
};
