process.env.NODE_ENV = 'test';
process.env.DB_PATH = ':memory:';
process.env.UPLOAD_DIR = require('os').tmpdir() + '/cms-test-uploads';

const request = require('supertest');
const { setup } = require('../src/db/setup');
const db = setup();
const app = require('../src/app');
const escalation = require('../src/services/escalation');
const { outbox } = require('../src/utils/mailer');

const PW = 'password123';
const login = async (email, password = PW) => {
  const r = await request(app).post('/api/auth/login').send({ email, password });
  return { res: r, token: r.body.token, cookie: (r.headers['set-cookie'] || [])[0] };
};
const as = (t) => ({ Authorization: `Bearer ${t}` });
let admin, staff, head, student, other;
const catId = (n) => db.prepare('SELECT id FROM categories WHERE name=?').get(n).id;
const file = (t, id, extra = {}) => ({ title: 'Wi-Fi down in block C', description: 'Wi-Fi has been down for two days now.', category_id: catId('Hostel'), priority: 'High', ...extra });
const submit = (t, body = {}) => request(app).post('/api/complaints').set(as(t)).send({ ...file(), ...body });

beforeAll(async () => {
  admin = (await login('admin@college.edu')).token;
  staff = (await login('staff@college.edu')).token;
  head = (await login('depthead@college.edu')).token;
  student = (await login('student@college.edu')).token;
  const r = await request(app).post('/api/auth/register').send({ name: 'Other Student', email: 'other@college.edu', password: 'secret123' });
  other = r.body.token;
});

describe('auth', () => {
  test('health check', async () => { expect((await request(app).get('/api/health')).body.status).toBe('ok'); });
  test('rejects weak passwords and duplicate emails', async () => {
    expect((await request(app).post('/api/auth/register').send({ name: 'Weak', email: 'w@x.edu', password: 'short' })).status).toBe(400);
    expect((await request(app).post('/api/auth/register').send({ name: 'Dup', email: 'other@college.edu', password: 'secret123' })).status).toBe(409);
  });
  test('never returns password hashes', async () => {
    const r = await request(app).get('/api/users').set(as(admin));
    expect(JSON.stringify(r.body)).not.toMatch(/password|hash/i);
  });
  test('locks the account after repeated failures', async () => {
    await request(app).post('/api/auth/register').send({ name: 'Lock Me', email: 'lock@college.edu', password: 'secret123' });
    for (let i = 0; i < 5; i++) expect((await login('lock@college.edu', 'wrongpass1')).res.status).toBe(401);
    expect((await login('lock@college.edu', 'secret123')).res.status).toBe(423);
  });
  test('refresh rotates, reuse revokes the session, logout revokes', async () => {
    const a = await login('student@college.edu');
    const r1 = await request(app).post('/api/auth/refresh').set('Cookie', a.cookie);
    expect(r1.status).toBe(200);
    const newCookie = r1.headers['set-cookie'][0];
    expect((await request(app).post('/api/auth/refresh').set('Cookie', a.cookie)).status).toBe(401); // reuse
    expect((await request(app).get('/api/auth/me').set(as(r1.body.token))).status).toBe(401); // family revoked
    expect(newCookie).toMatch(/HttpOnly/);
    const b = await login('student@college.edu');
    await request(app).post('/api/auth/logout').set(as(b.token)).set('Cookie', b.cookie);
    expect((await request(app).get('/api/auth/me').set(as(b.token))).status).toBe(401);
  });
  test('password reset flow', async () => {
    await request(app).post('/api/auth/forgot-password').send({ email: 'other@college.edu' });
    const token = outbox[outbox.length - 1].text.match(/\n\n(\S+)\n\n/)[1];
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'newpass123' })).status).toBe(200);
    expect((await request(app).post('/api/auth/reset-password').send({ token, password: 'newpass123' })).status).toBe(400);
    expect((await login('other@college.edu', 'newpass123')).res.status).toBe(200);
    other = (await login('other@college.edu', 'newpass123')).token;
  });
});

describe('role based access', () => {
  test('requires a token', async () => { expect((await request(app).get('/api/complaints')).status).toBe(401); });
  test('students cannot reach admin APIs', async () => {
    for (const p of ['/api/stats', '/api/users', '/api/audit-logs', '/api/reports/complaints.csv']) expect((await request(app).get(p).set(as(student))).status).toBe(403);
    expect((await request(app).put('/api/escalation-rules').set(as(student)).send({ rules: [{ priority: 'High', hours: 1 }] })).status).toBe(403);
  });
  test('only students can file complaints', async () => { expect((await submit(admin)).status).toBe(403); });
});

describe('complaint lifecycle', () => {
  let id;
  test('submit generates ticket, department and deadline', async () => {
    const r = await submit(student, { anonymous: true });
    expect(r.status).toBe(201);
    id = r.body.id;
    const d = (await request(app).get(`/api/complaints/${id}`).set(as(student))).body;
    expect(d.ticket_no).toMatch(/^CMS-\d{4}-\d{6}$/);
    expect(d.department).toBe('Hostel Administration');
    expect(d.due_at).toBeTruthy();
  });
  test('validation errors are friendly', async () => {
    const r = await submit(student, { title: 'x' });
    expect(r.status).toBe(400);
    expect(r.body.error).toMatch(/title/);
  });
  test('other students cannot see it; anonymous is hidden from staff, visible to admin', async () => {
    expect((await request(app).get(`/api/complaints/${id}`).set(as(other))).status).toBe(403);
    expect((await request(app).get(`/api/complaints/${id}`).set(as(admin))).body.student_name).toBe('Demo Student');
    expect((await request(app).get(`/api/complaints?q=Wi-Fi`).set(as(head))).body[0].student_name).toBe('Anonymous');
  });
  test('assignment moves to Assigned; bad transitions are rejected', async () => {
    const sid = db.prepare("SELECT id FROM users WHERE email='staff@college.edu'").get().id;
    expect((await request(app).patch(`/api/complaints/${id}`).set(as(staff)).send({ status: 'In Progress' })).status).toBe(403); // not assigned to staff yet
    expect((await request(app).patch(`/api/complaints/${id}`).set(as(head)).send({ assigned_to: sid })).status).toBe(200);
    expect((await request(app).get(`/api/complaints/${id}`).set(as(admin))).body.status).toBe('Assigned');
    const bad = await request(app).patch(`/api/complaints/${id}`).set(as(admin)).send({ status: 'Closed' });
    expect(bad.status).toBe(400);
    expect(bad.body.code).toBe('BAD_TRANSITION');
  });
  test('staff cannot assign; resolution needs a note; internal notes stay hidden from students', async () => {
    expect((await request(app).patch(`/api/complaints/${id}`).set(as(staff)).send({ assigned_to: 1 })).status).toBe(403);
    expect((await request(app).patch(`/api/complaints/${id}`).set(as(staff)).send({ status: 'In Progress', remark: 'Checking routers' })).status).toBe(200);
    await request(app).patch(`/api/complaints/${id}`).set(as(staff)).send({ remark: 'Vendor says part is on backorder', internal: true });
    expect((await request(app).patch(`/api/complaints/${id}`).set(as(staff)).send({ status: 'Resolved' })).status).toBe(400);
    expect((await request(app).patch(`/api/complaints/${id}`).set(as(staff)).send({ status: 'Resolved', remark: 'Router replaced' })).status).toBe(200);
    const sh = (await request(app).get(`/api/complaints/${id}`).set(as(student))).body.updates.map((u) => u.remark).join('|');
    expect(sh).not.toMatch(/backorder/);
    expect((await request(app).get(`/api/complaints/${id}`).set(as(staff))).body.updates.map((u) => u.remark).join('|')).toMatch(/backorder/);
  });
  test('student rates it and it closes; can then reopen with a reason', async () => {
    expect((await request(app).post(`/api/complaints/${id}/feedback`).set(as(other)).send({ rating: 5 })).status).toBe(403);
    expect((await request(app).post(`/api/complaints/${id}/feedback`).set(as(student)).send({ rating: 4, comments: 'ok' })).status).toBe(200);
    expect((await request(app).post(`/api/complaints/${id}/feedback`).set(as(student)).send({ rating: 4 })).status).toBe(400);
    expect((await request(app).post(`/api/complaints/${id}/reopen`).set(as(student)).send({ reason: 'x' })).status).toBe(400);
    expect((await request(app).post(`/api/complaints/${id}/reopen`).set(as(student)).send({ reason: 'Problem is back again' })).status).toBe(200);
    const d = (await request(app).get(`/api/complaints/${id}`).set(as(student))).body;
    expect(d.status).toBe('Reopened');
    expect(d.allowed).toEqual([]);
  });
  test('history is immutable at the database level', () => {
    expect(() => db.prepare('UPDATE complaint_updates SET remark=? WHERE complaint_id=?').run('tampered', id)).toThrow(/immutable/);
    expect(() => db.prepare('DELETE FROM complaint_updates WHERE complaint_id=?').run(id)).toThrow(/immutable/);
  });
});

describe('uploads', () => {
  const send = (t, buf, name) => request(app).post('/api/complaints').set(as(t)).field('title', 'Broken fan').field('description', 'The fan in room 12 is broken.')
    .field('category_id', String(catId('Hostel'))).attach('attachment', buf, name);
  test('rejects wrong extension and fake content, accepts a real PNG', async () => {
    expect((await send(student, Buffer.from('hello'), 'x.exe')).status).toBe(400);
    expect((await send(student, Buffer.from('not really a png'), 'x.png')).status).toBe(400);
    const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(20)]);
    const r = await send(student, png, 'photo.png');
    expect(r.status).toBe(201);
    const complaint = (await request(app).get(`/api/complaints/${r.body.id}`).set(as(student))).body;
    expect(complaint.attachments).toHaveLength(1);
    const attachment = await request(app).get(`/uploads/${complaint.attachments[0].filename}`);
    expect(attachment.status).toBe(200);
    expect(attachment.headers['x-content-type-options']).toBe('nosniff');
    expect(attachment.body).toEqual(png);
  });
});

describe('escalation', () => {
  test('escalates once, notifies the department head, and is idempotent', async () => {
    const r = await submit(student, { title: 'Water leak in corridor', description: 'Water is leaking from the ceiling.', priority: 'High' });
    db.prepare("UPDATE complaints SET created_at=datetime('now','-30 hours') WHERE id=?").run(r.body.id);
    expect(escalation.run()).toBeGreaterThanOrEqual(1);
    expect(escalation.run()).toBe(0);
    const d = (await request(app).get(`/api/complaints/${r.body.id}`).set(as(head))).body;
    expect(d.status).toBe('Escalated');
    expect(db.prepare('SELECT COUNT(*) n FROM complaint_escalations WHERE complaint_id=?').get(r.body.id).n).toBe(1);
    const n = (await request(app).get('/api/notifications').set(as(head))).body.map((x) => x.message).join('|');
    expect(n).toMatch(/escalated/);
  });
  test('admins can configure rules', async () => {
    const r = await request(app).put('/api/escalation-rules').set(as(admin)).send({ rules: [{ priority: 'Low', hours: 96 }] });
    expect(r.body.find((x) => x.priority === 'Low').hours).toBe(96);
    expect((await request(app).put('/api/escalation-rules').set(as(admin)).send({ rules: [{ priority: 'Low', hours: 0 }] })).status).toBe(400);
  });
});

describe('analytics', () => {
  test('figures match the database', async () => {
    const s = (await request(app).get('/api/stats').set(as(admin))).body;
    expect(s.total).toBe(db.prepare('SELECT COUNT(*) n FROM complaints').get().n);
    expect(s.byStatus.reduce((a, x) => a + x.n, 0)).toBe(s.total);
    expect(s.pending + s.resolved + s.rejected).toBe(s.total);
    expect(s.avgRating).toBe(4);
    expect((await request(app).get('/api/stats?from=2999-01-01').set(as(admin))).body.total).toBe(0);
  });
  test('CSV export neutralises formula injection', async () => {
    await submit(student, { title: '=HYPERLINK("http://evil")', description: 'A title that looks like a spreadsheet formula.' });
    const r = await request(app).get('/api/reports/complaints.csv').set(as(admin));
    expect(r.headers['content-type']).toMatch(/text\/csv/);
    expect(r.text).toMatch(/'=HYPERLINK/);
  });
  test('audit log records key actions', async () => {
    const r = await request(app).get('/api/audit-logs').set(as(admin));
    expect(r.body.map((a) => a.action)).toEqual(expect.arrayContaining(['auth.login', 'complaint.create', 'complaint.status']));
  });
});

describe('category reassignment and retired ML features', () => {
  test('admins can change a complaint category and its department', async () => {
    const r = await submit(student);
    const changed = await request(app).patch(`/api/complaints/${r.body.id}/category`).set(as(admin)).send({ category_id: catId('Electricity') });
    expect(changed.status).toBe(200);
    const detail = (await request(app).get(`/api/complaints/${r.body.id}`).set(as(admin))).body;
    expect(detail.category).toBe('Electricity');
    expect(detail.department).toBe('Maintenance');
    expect(detail.updates.map((u) => u.remark).join('|')).toMatch(/Category changed from Hostel to Electricity/);
  });
  test('ML routes and schema are removed', async () => {
    expect((await request(app).get('/api/ml/metrics').set(as(admin))).status).toBe(404);
    expect((await request(app).post('/api/ml/analyze').set(as(student)).send({})).status).toBe(404);
    expect((await request(app).post('/api/complaints/1/reanalyze').set(as(admin))).status).toBe(404);
    expect((await request(app).post('/api/complaints/1/duplicates/2').set(as(admin)).send({ action: 'link' })).status).toBe(404);

    const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name IN ('complaint_similarities', 'ml_corrections')").all();
    const columns = db.pragma('table_info(complaints)').map((column) => column.name);
    expect(tables).toEqual([]);
    expect(columns).not.toEqual(expect.arrayContaining([
      'predicted_category_id', 'ml_confidence', 'sentiment', 'sentiment_score',
      'recommended_priority', 'priority_score', 'priority_reasons',
    ]));
  });
});
