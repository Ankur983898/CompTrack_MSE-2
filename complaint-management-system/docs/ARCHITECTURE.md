# Architecture

```
React client (Vite)  --/api-->  Express app
                                  routes -> controllers -> services -> repositories -> SQLite
                                  middleware: helmet, CORS, rate limit, auth (JWT + session check), RBAC, validation (zod), upload signature check, error handler
                                  jobs: escalation scheduler
```
Layers: **routes** map URLs to controllers; **controllers** are thin HTTP adapters; **services** hold business rules (status workflow, permissions, escalation, analytics); **repositories** hold all SQL (prepared statements only). SQL is isolated in repositories so a PostgreSQL move touches one layer.

## Security measures
- bcrypt password hashing; password policy; lockout after 5 failed logins (15 min); generic login errors.
- Short-lived access token (15 min) + rotating refresh token in an HttpOnly, SameSite=Strict cookie. Refresh tokens are stored hashed. Reusing an old refresh token revokes the whole session. Logout, password reset and account suspension revoke sessions immediately (each request checks the session is alive).
- RBAC enforced per route and again inside services (ownership, department scope, assignment).
- Anonymous complaints hide the student's identity (name and id) from everyone except the owner and admins.
- Uploads: extension allow-list, 2 MB limit, real file-signature check, random stored names, `nosniff`.
- CSV export neutralises spreadsheet-formula injection. Logs redact secrets. Errors never leak internals.
- Audit log for logins, status changes, assignments, user and rule changes.

## Data model (12 tables)
users, departments, categories, complaints, complaint_assignments, complaint_updates (immutable), complaint_attachments, notifications, feedback, audit_logs, escalation_rules, complaint_escalations, plus refresh_tokens, password_resets, schema_migrations.

## Roadmap
| Stage | Scope | State |
|---|---|---|
| 1 | Modular backend, migrations, auth/RBAC, lifecycle, escalation, analytics, CSV, audit, tests | Done |
| 2 | Socket.IO notifications, email (SMTP), analytics UI with date filters, PDF export, Swagger/OpenAPI | Next |
| 3 | Docker + compose, deployment guide, ER/DFD/UML diagrams, final report | Planned |
