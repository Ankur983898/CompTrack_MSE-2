# SmartResolve - Complaint Management and Resolution System

React + Node.js/Express + SQLite. Students file complaints, administrators and department heads route them, staff resolve them, and the system escalates anything left unattended.

**Status: Core complaint management is complete.** Real-time notifications, Swagger and Docker are planned next. See `docs/ARCHITECTURE.md`.

## Run it (Windows PowerShell)
Use two terminals. PowerShell 5 does not support `&&`, so run commands one per line.

```powershell
# Terminal 1 - API on http://localhost:5000
cd server
npm install
npm start
```
```powershell
# Terminal 2 - UI on http://localhost:5173
cd client
npm install
npm run dev
```
Open http://localhost:5173

## Deploy to Vercel
The root `vercel.json` deploys the Vite client and Express API as separate services on one domain. The client is public at `/`; `/api/*` and `/uploads/*` route to the API. No private service bindings are needed because the browser calls the API through the same-origin public route.

On Vercel, SQLite and uploaded files use the function's temporary filesystem. They are not durable and may differ between function instances, so this configuration is for a demo only; use persistent database and file storage before production. Automatic escalation still uses the existing in-process interval and is not guaranteed to run reliably in serverless functions.

## Demo accounts (password `password123`)
| Email | Role |
|---|---|
| admin@college.edu | Administrator |
| depthead@college.edu | Department head (Hostel Administration) |
| staff@college.edu | Staff (Hostel Administration) |
| student@college.edu | Student |

Demo accounts are created only when `SEED_DEMO` is true (the default outside production).

## Your existing data is kept
The API upgrades `server/cms.db` in place when it starts (versioned migrations in `server/migrations`). Complaints, history, ratings and assignments are preserved and gain ticket numbers, departments and deadlines. The migration also removes retired ML analysis and duplicate metadata. Old sessions simply ask you to log in again.

## Useful commands (run inside `server`)
```powershell
npm test            # API tests (Jest + Supertest)
npm run backup      # consistent copy of the database into server/backups
npm run migrate     # apply pending migrations
```
To restore a backup: stop the server, then copy the backup file over `server/cms.db`.

## Configuration
Copy `server/.env.example` to `server/.env`. In production `JWT_SECRET` (32+ random characters) is mandatory and the server refuses to start without it.

## Roles
| Role | Can do |
|---|---|
| Student | File complaints (optionally anonymous), track them, rate and close, reopen with a reason |
| Staff | See assigned complaints, move them to In Progress / Resolved, add public or internal notes |
| Department head | Everything for their department, assign staff in the department, close, reject, receive escalations |
| Administrator | Everything, plus users, departments, escalation rules, analytics, CSV export, audit log |

Every route checks the role on the server. Hiding a button in the UI is never the only protection.

## Complaint lifecycle
`Submitted > Under Review > Assigned > In Progress > Resolved > Closed`, plus `Rejected`, `Reopened` and `Escalated`. Allowed moves are enforced by the server (`server/src/utils/status.js`). History rows cannot be edited or deleted, even directly in SQL.

## Automatic escalation
Defaults: High 24 h, Medium 48 h, Low 72 h (change via `PUT /api/escalation-rules` as admin). A scheduled job checks every 5 minutes. A database uniqueness rule guarantees one escalation per open cycle, so restarts or multiple servers never duplicate it. Admins can trigger a check on demand with `POST /api/escalation/run`.

## API overview
`/api/auth/*` (register, login, refresh, logout, forgot/reset password, me) | `/api/complaints` (list, create, get, patch, reopen, feedback) | `/api/notifications` | `/api/stats?from=&to=` | `/api/reports/complaints.csv` | `/api/users` | `/api/departments` | `/api/staff` | `/api/escalation-rules` | `/api/audit-logs` | `/api/health`
Swagger documentation arrives in Stage 3.
