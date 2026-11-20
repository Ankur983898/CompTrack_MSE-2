const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const cfg = require('./config');
const AppError = require('./utils/AppError');
const logger = require('./utils/logger');
const routes = require('./routes');
const { apiLimiter } = require('./middleware/security');
const { notFound, errorHandler } = require('./middleware/errors');

const app = express();
app.disable('x-powered-by');
if (cfg.isProd) app.set('trust proxy', 1);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: cfg.clientOrigin, credentials: true }));
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use((req, res, next) => {
  const t = Date.now();
  res.on('finish', () => logger.info('request', { method: req.method, path: req.path, status: res.statusCode, ms: Date.now() - t, user: req.user && req.user.id }));
  next();
});
app.get('/uploads/:filename', (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.sendFile(req.params.filename, { root: cfg.uploadDir }, (err) => {
    if (!err) return;
    if (err.statusCode === 404) return next(new AppError(404, 'Attachment not found.'));
    next(err);
  });
});
app.use('/api', apiLimiter, routes);
app.use(notFound);
app.use(errorHandler);
module.exports = app;
