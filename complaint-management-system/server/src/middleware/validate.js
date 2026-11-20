const AppError = require('../utils/AppError');

module.exports = (schema, src = 'body') => (req, res, next) => {
  const r = schema.safeParse(req[src] || {});
  if (!r.success) {
    const details = r.error.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
    const d = details[0];
    throw new AppError(400, d.field ? `${d.field}: ${d.message}` : d.message, 'VALIDATION', details);
  }
  req[src] = r.data;
  next();
};
