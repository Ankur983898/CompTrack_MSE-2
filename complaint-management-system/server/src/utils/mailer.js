const cfg = require('../config');
const logger = require('./logger');
const outbox = [];

// SMTP delivery plugs in here in a later stage. For now: dev console, test outbox.
function sendMail({ to, subject, text }) {
  logger.info('mail', { to, subject });
  if (cfg.isTest) outbox.push({ to, subject, text });
  else if (!cfg.isProd) console.log(`\n[DEV MAIL] To: ${to}\nSubject: ${subject}\n${text}\n`);
}
module.exports = { sendMail, outbox };
