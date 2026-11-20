const notifications = require('../repositories/notifications');
const analytics = require('../services/analytics');

module.exports = {
  notifications: (req, res) => res.json(notifications.forUser(req.user.id)),
  readAll: (req, res) => { notifications.markAll(req.user.id); res.json({ ok: true }); },
  readOne: (req, res) => { notifications.markOne(req.user.id, Number(req.params.id)); res.json({ ok: true }); },
  stats: (req, res) => res.json(analytics.build(req.query)),
  csv: (req, res) => {
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="complaints.csv"');
    res.send(analytics.csv(req.query));
  },
  health: (req, res) => res.json({ status: 'ok', uptime: Math.round(process.uptime()) }),
};
