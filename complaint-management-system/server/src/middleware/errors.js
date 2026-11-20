const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

const notFound = (req, res, next) => next(new AppError(404, 'Route not found.'));
const errorHandler = (err, req, res, next) => { // eslint-disable-line no-unused-vars
  let status = 500, message = 'Something went wrong on our side.', code = err.code, details;
  if (err instanceof AppError) ({ status, message, details } = err);
  else if (err.code === 'LIMIT_FILE_SIZE') { status = 413; message = 'File is too large (max 2 MB).'; }
  else if (err.type === 'entity.parse.failed') { status = 400; message = 'Malformed JSON body.'; }
  else if (String(err.code).startsWith('SQLITE_CONSTRAINT')) { status = 409; message = 'That conflicts with existing data.'; }
  else logger.error('unhandled', { path: req.path, error: err.message, stack: err.stack });
  res.status(status).json({ error: message, code: status === 500 ? undefined : code, details });
};
module.exports = { notFound, errorHandler };
