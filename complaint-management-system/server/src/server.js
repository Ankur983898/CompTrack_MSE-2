const cfg = require('./config');
const logger = require('./utils/logger');
const { setup } = require('./db/setup');

setup();
const app = require('./app');
const escalation = require('./services/escalation');

app.listen(cfg.port, () => {
  console.log(`API running on http://localhost:${cfg.port} (${cfg.env})`);
  escalation.start(cfg.escalationIntervalMs);
  logger.info('started', { port: cfg.port });
});
