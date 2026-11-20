CREATE TABLE departments(id INTEGER PRIMARY KEY, name TEXT UNIQUE NOT NULL, description TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);

ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE users ADD COLUMN department_id INTEGER REFERENCES departments(id);
ALTER TABLE users ADD COLUMN failed_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN locked_until TEXT;
ALTER TABLE categories ADD COLUMN department_id INTEGER REFERENCES departments(id);
ALTER TABLE complaints ADD COLUMN ticket_no TEXT;
ALTER TABLE complaints ADD COLUMN department_id INTEGER REFERENCES departments(id);
ALTER TABLE complaints ADD COLUMN due_at TEXT;
ALTER TABLE complaints ADD COLUMN resolved_at TEXT;
ALTER TABLE complaints ADD COLUMN reopen_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE complaints ADD COLUMN reopened_at TEXT;
ALTER TABLE complaints ADD COLUMN escalated INTEGER NOT NULL DEFAULT 0;
ALTER TABLE complaint_updates ADD COLUMN visibility TEXT NOT NULL DEFAULT 'public';
ALTER TABLE notifications ADD COLUMN type TEXT;
ALTER TABLE notifications ADD COLUMN complaint_id INTEGER;

UPDATE complaints SET resolved_at = updated_at WHERE status IN ('Resolved','Closed');
UPDATE complaints SET ticket_no = 'CMS-' || strftime('%Y', created_at) || '-' || printf('%06d', id);
UPDATE complaints SET due_at = datetime(created_at, '+' || CASE priority WHEN 'High' THEN 24 WHEN 'Medium' THEN 48 ELSE 72 END || ' hours');
CREATE UNIQUE INDEX idx_complaints_ticket ON complaints(ticket_no);

CREATE TABLE complaint_assignments(
  id INTEGER PRIMARY KEY, complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES users(id), assigned_by INTEGER REFERENCES users(id),
  is_active INTEGER NOT NULL DEFAULT 1, assigned_at TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT INTO complaint_assignments(complaint_id, staff_id) SELECT id, assigned_to FROM complaints WHERE assigned_to IS NOT NULL;

CREATE TABLE complaint_attachments(
  id INTEGER PRIMARY KEY, complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  filename TEXT NOT NULL, original_name TEXT, mime TEXT, size INTEGER,
  uploaded_by INTEGER REFERENCES users(id), created_at TEXT DEFAULT CURRENT_TIMESTAMP);
INSERT INTO complaint_attachments(complaint_id, filename) SELECT id, attachment FROM complaints WHERE attachment IS NOT NULL;

CREATE TABLE refresh_tokens(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), family TEXT NOT NULL,
  token_hash TEXT UNIQUE NOT NULL, expires_at TEXT NOT NULL, revoked_at TEXT, user_agent TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE password_resets(
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), token_hash TEXT UNIQUE NOT NULL,
  expires_at TEXT NOT NULL, used_at TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE audit_logs(
  id INTEGER PRIMARY KEY, user_id INTEGER, action TEXT NOT NULL, entity TEXT, entity_id INTEGER,
  meta TEXT, ip TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE escalation_rules(
  priority TEXT PRIMARY KEY, hours INTEGER NOT NULL CHECK(hours > 0), updated_by INTEGER, updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
CREATE TABLE complaint_escalations(
  id INTEGER PRIMARY KEY, complaint_id INTEGER NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
  cycle INTEGER NOT NULL, rule_hours INTEGER, reason TEXT, escalated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(complaint_id, cycle));

CREATE TRIGGER complaint_updates_no_update BEFORE UPDATE ON complaint_updates BEGIN SELECT RAISE(ABORT, 'complaint history is immutable'); END;
CREATE TRIGGER complaint_updates_no_delete BEFORE DELETE ON complaint_updates BEGIN SELECT RAISE(ABORT, 'complaint history is immutable'); END;

CREATE INDEX idx_complaints_user ON complaints(user_id);
CREATE INDEX idx_complaints_status ON complaints(status);
CREATE INDEX idx_complaints_assigned ON complaints(assigned_to);
CREATE INDEX idx_complaints_category ON complaints(category_id);
CREATE INDEX idx_complaints_department ON complaints(department_id);
CREATE INDEX idx_complaints_created ON complaints(created_at);
CREATE INDEX idx_updates_complaint ON complaint_updates(complaint_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_assignments_complaint ON complaint_assignments(complaint_id, is_active);
CREATE INDEX idx_attachments_complaint ON complaint_attachments(complaint_id);
CREATE INDEX idx_refresh_family ON refresh_tokens(family);
CREATE INDEX idx_audit_entity ON audit_logs(entity, entity_id);
