const bcrypt = require('bcryptjs');
const db = require('../db');
const cfg = require('../config');
const AppError = require('../utils/AppError');
const users = require('../repositories/users');
const tokens = require('../repositories/tokens');
const esc = require('../repositories/escalation');
const auditRepo = require('../repositories/audit');
const audit = require('../services/audit');
const escalation = require('../services/escalation');

module.exports = {
  categories: (req, res) => res.json(db.prepare('SELECT c.id, c.name, c.department_id, d.name AS department FROM categories c LEFT JOIN departments d ON d.id=c.department_id ORDER BY c.name').all()),
  departments: (req, res) => res.json(db.prepare('SELECT * FROM departments ORDER BY name').all()),
  createDepartment: (req, res) => {
    const r = db.prepare('INSERT INTO departments(name,description) VALUES (?,?)').run(req.body.name, req.body.description || null);
    audit.record(req, 'department.create', 'department', r.lastInsertRowid);
    res.status(201).json({ id: r.lastInsertRowid });
  },
  staff: (req, res) => res.json(users.staff(req.user.role === 'dept_head' ? req.user.department_id : null)),
  listUsers: (req, res) => res.json(users.list()),
  createUser: (req, res) => {
    if (users.findByEmail(req.body.email)) throw new AppError(409, 'That email is already registered.', 'EMAIL_TAKEN');
    const id = users.create({ ...req.body, hash: bcrypt.hashSync(req.body.password, cfg.bcryptCost) });
    audit.record(req, 'user.create', 'user', id, { role: req.body.role });
    res.status(201).json({ id });
  },
  patchUser: (req, res) => {
    const id = Number(req.params.id);
    if (!users.findById(id)) throw new AppError(404, 'User not found.', 'NOT_FOUND');
    if (id === req.user.id && (req.body.role || req.body.status)) throw new AppError(400, 'You can’t change your own role or status.', 'SELF_CHANGE');
    users.update(id, req.body);
    if (req.body.status && req.body.status !== 'active') tokens.revokeAllForUser(id);
    audit.record(req, 'user.update', 'user', id, req.body);
    res.json({ ok: true });
  },
  rules: (req, res) => res.json(esc.rulesList()),
  setRules: (req, res) => {
    db.transaction(() => req.body.rules.forEach((r) => esc.setRule(r.priority, r.hours, req.user.id)))();
    audit.record(req, 'escalation.rules', 'escalation_rules', null, req.body.rules);
    res.json(esc.rulesList());
  },
  runEscalation: (req, res) => res.json({ escalated: escalation.run() }),
  auditLogs: (req, res) => res.json(auditRepo.list({ action: req.query.action, limit: Math.min(Number(req.query.limit) || 100, 500), offset: Number(req.query.offset) || 0 })),
};
