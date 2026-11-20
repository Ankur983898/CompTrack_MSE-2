const repo = require('../repositories/audit');
module.exports = { record: (req, action, entity, entityId, meta) => repo.log({ userId: req && req.user && req.user.id, action, entity, entityId, meta, ip: req && req.ip }) };
