const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const env = process.env.NODE_ENV || 'development';
const cfg = {
  env,
  isProd: env === 'production',
  isTest: env === 'test',
  port: Number(process.env.PORT) || 5000,
  dbPath: process.env.DB_PATH || path.join(__dirname, '../../cms.db'),
  uploadDir: process.env.UPLOAD_DIR || path.join(__dirname, '../../uploads'),
  jwtSecret: process.env.JWT_SECRET || (env === 'production' ? '' : 'dev-only-secret-change-me'),
  accessTtl: process.env.ACCESS_TOKEN_TTL || '15m',
  refreshDays: Number(process.env.REFRESH_TOKEN_DAYS) || 7,
  clientOrigin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  bcryptCost: env === 'test' ? 4 : 10,
  maxLoginAttempts: 5,
  lockMinutes: 15,
  escalationIntervalMs: Number(process.env.ESCALATION_INTERVAL_MS) || 300000,
  seedDemo: process.env.SEED_DEMO ? process.env.SEED_DEMO === 'true' : env !== 'production',
};
if (cfg.isProd && cfg.jwtSecret.length < 32) throw new Error('JWT_SECRET (32+ characters) is required in production.');
module.exports = cfg;
