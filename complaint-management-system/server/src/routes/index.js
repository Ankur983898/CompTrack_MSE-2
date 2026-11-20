const router = require('express').Router();
const { authenticate, requireRole } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { attachments } = require('../middleware/upload');
const { authLimiter } = require('../middleware/security');
const s = require('../validators/schemas');
const auth = require('../controllers/auth');
const complaints = require('../controllers/complaints');
const admin = require('../controllers/admin');
const misc = require('../controllers/misc');

const any = authenticate;
const only = (...roles) => [authenticate, requireRole(...roles)];
const STAFF = ['staff', 'dept_head', 'admin'];

router.get('/health', misc.health);

router.post('/auth/register', authLimiter, validate(s.register), auth.register);
router.post('/auth/login', authLimiter, validate(s.login), auth.login);
router.post('/auth/refresh', authLimiter, auth.refresh);
router.post('/auth/logout', (req, res, next) => { try { authenticate(req, res, () => {}); } catch { req.user = null; } next(); }, auth.logout);
router.post('/auth/forgot-password', authLimiter, validate(s.forgot), auth.forgot);
router.post('/auth/reset-password', authLimiter, validate(s.reset), auth.reset);
router.get('/auth/me', any, auth.me);

router.get('/categories', any, admin.categories);
router.get('/departments', any, admin.departments);
router.post('/departments', ...only('admin'), validate(s.department), admin.createDepartment);
router.get('/staff', ...only('admin', 'dept_head'), admin.staff);
router.get('/users', ...only('admin'), admin.listUsers);
router.post('/users', ...only('admin'), validate(s.userCreate), admin.createUser);
router.patch('/users/:id', ...only('admin'), validate(s.userPatch), admin.patchUser);

router.get('/complaints', any, validate(s.listQuery, 'query'), complaints.list);
router.post('/complaints', ...only('student'), attachments, validate(s.complaintCreate), complaints.create);
router.get('/complaints/:id', any, complaints.get);
router.patch('/complaints/:id', ...only(...STAFF), validate(s.complaintPatch), complaints.patch);
router.patch('/complaints/:id/category', ...only('admin', 'dept_head'), validate(s.categoryChange), complaints.setCategory);
router.post('/complaints/:id/reopen', ...only('student', 'admin'), validate(s.reopen), complaints.reopen);
router.post('/complaints/:id/feedback', ...only('student'), validate(s.feedback), complaints.feedback);

router.get('/notifications', any, misc.notifications);
router.post('/notifications/read', any, misc.readAll);
router.post('/notifications/:id/read', any, misc.readOne);

router.get('/stats', ...only('admin'), validate(s.range, 'query'), misc.stats);
router.get('/reports/complaints.csv', ...only('admin'), validate(s.range, 'query'), misc.csv);
router.get('/escalation-rules', ...only('admin', 'dept_head'), admin.rules);
router.put('/escalation-rules', ...only('admin'), validate(s.rules), admin.setRules);
router.post('/escalation/run', ...only('admin'), admin.runEscalation);
router.get('/audit-logs', ...only('admin'), admin.auditLogs);
module.exports = router;
