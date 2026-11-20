const db = require('../db');

const rules = () => Object.fromEntries(db.prepare('SELECT priority, hours FROM escalation_rules').all().map((r) => [r.priority, r.hours]));
const rulesList = () => db.prepare('SELECT priority, hours, updated_at FROM escalation_rules ORDER BY hours').all();
const setRule = (priority, hours, userId) => db.prepare(`INSERT INTO escalation_rules(priority,hours,updated_by) VALUES (?,?,?)
  ON CONFLICT(priority) DO UPDATE SET hours=excluded.hours, updated_by=excluded.updated_by, updated_at=CURRENT_TIMESTAMP`).run(priority, hours, userId);
const candidates = () => db.prepare(`SELECT c.*, (julianday('now') - julianday(COALESCE(c.reopened_at, c.created_at))) * 24 AS age_hours FROM complaints c
  WHERE c.status NOT IN ('Resolved','Closed','Rejected','Escalated') AND c.escalated=0`).all();
const record = (complaintId, cycle, hours, reason) => db.prepare('INSERT OR IGNORE INTO complaint_escalations(complaint_id,cycle,rule_hours,reason) VALUES (?,?,?,?)').run(complaintId, cycle, hours, reason).changes;
const markEscalated = (id) => db.prepare("UPDATE complaints SET status='Escalated', escalated=1, updated_at=CURRENT_TIMESTAMP WHERE id=?").run(id);
module.exports = { rules, rulesList, setRule, candidates, record, markEscalated };
