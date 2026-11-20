const db = require('../db');
const repo = require('../repositories/escalation');
const complaints = require('../repositories/complaints');
const notify = require('./notifications');
const audit = require('./audit');
const logger = require('../utils/logger');

// Idempotent: the UNIQUE(complaint_id, cycle) row guarantees one escalation per open cycle, even with several workers.
function run() {
  const rules = repo.rules();
  let count = 0;
  for (const c of repo.candidates()) {
    const hours = rules[c.priority];
    if (!hours || c.age_hours < hours) continue;
    db.transaction(() => {
      if (!repo.record(c.id, c.reopen_count, hours, `Unresolved for more than ${hours} hours`)) return;
      repo.markEscalated(c.id);
      complaints.addUpdate({ complaint_id: c.id, remark: `Escalated automatically: unresolved for more than ${hours} hours.`, status: 'Escalated' });
      notify.toStaffSide(c, `Complaint #${c.id} was escalated: unresolved for more than ${hours} hours.`, 'complaint.escalated');
      notify.toUser(c.user_id, `Complaint #${c.id} was escalated for faster attention.`, 'complaint.escalated', c.id);
      audit.record(null, 'complaint.escalated', 'complaint', c.id, { hours });
      count += 1;
    })();
  }
  if (count) logger.info('escalation', { escalated: count });
  return count;
}
const start = (ms) => { run(); return setInterval(run, ms).unref(); };
module.exports = { run, start };
