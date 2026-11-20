const rateLimit = require('express-rate-limit');
const cfg = require('../config');

const limiter = (limit, windowMs = 15 * 60 * 1000) => cfg.isTest ? (req, res, next) => next()
  : rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { error: 'Too many requests. Please try again later.' } });
module.exports = { apiLimiter: limiter(600), authLimiter: limiter(30) };
