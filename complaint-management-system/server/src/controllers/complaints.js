const service = require('../services/complaints');

module.exports = {
  list: (req, res) => res.json(service.list(req.user, req.query)),
  create: (req, res) => res.status(201).json(service.create(req, req.body, req.savedFiles || [])),
  get: (req, res) => res.json(service.detail(req.user, Number(req.params.id))),
  patch: (req, res) => res.json(service.update(req, Number(req.params.id), req.body)),
  reopen: (req, res) => res.json(service.update(req, Number(req.params.id), { status: 'Reopened', remark: req.body.reason, internal: false })),
  setCategory: (req, res) => res.json(service.setCategory(req, Number(req.params.id), req.body)),
  feedback: (req, res) => res.json(service.feedback(req, Number(req.params.id), req.body)),
};
