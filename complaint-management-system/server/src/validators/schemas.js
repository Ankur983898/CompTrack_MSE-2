const { z } = require('zod');
const { STATUSES } = require('../utils/status');

const id = z.coerce.number().int().positive();
const optId = z.preprocess((v) => (v === '' || v == null ? undefined : v), id.optional());
const bool = z.preprocess((v) => v === true || v === 'true' || v === '1', z.boolean());
const email = z.string().trim().toLowerCase().email('Enter a valid email').max(120);
const password = z.string().min(8, 'Password must be at least 8 characters').max(100)
  .regex(/[A-Za-z]/, 'Password needs a letter').regex(/\d/, 'Password needs a number');
const priority = z.enum(['Low', 'Medium', 'High']);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD').optional();

module.exports = {
  register: z.object({ name: z.string().trim().min(2).max(80), email, password }),
  login: z.object({ email, password: z.string().min(1).max(100) }),
  forgot: z.object({ email }),
  reset: z.object({ token: z.string().min(20).max(200), password }),
  complaintCreate: z.object({
    title: z.string().trim().min(3).max(120), description: z.string().trim().min(10, 'Please describe the problem in a bit more detail').max(2000),
    category_id: id, priority: priority.default('Medium'), anonymous: bool,
  }),
  complaintPatch: z.object({
    status: z.enum(STATUSES).optional(), priority: priority.optional(), remark: z.string().trim().max(500).optional(), assigned_to: optId, internal: bool,
  }),
  categoryChange: z.object({ category_id: id }),
  reopen: z.object({ reason: z.string().trim().min(5, 'Please tell us why it needs reopening').max(500) }),
  feedback: z.object({ rating: z.coerce.number().int().min(1).max(5), comments: z.string().trim().max(500).optional() }),
  listQuery: z.object({
    status: z.string().max(30).optional(), category_id: optId, priority: priority.optional(), q: z.string().trim().max(100).optional(),
  }),
  range: z.object({ from: date, to: date }),
  rules: z.object({ rules: z.array(z.object({ priority, hours: z.coerce.number().int().min(1).max(720) })).min(1) }),
  department: z.object({ name: z.string().trim().min(2).max(80), description: z.string().trim().max(300).optional() }),
  userCreate: z.object({ name: z.string().trim().min(2).max(80), email, password, role: z.enum(['staff', 'dept_head', 'admin']), department_id: optId }),
  userPatch: z.object({
    role: z.enum(['student', 'staff', 'dept_head', 'admin']).optional(), status: z.enum(['active', 'suspended', 'disabled']).optional(),
    department_id: z.preprocess((v) => (v === '' ? null : v), id.nullable().optional()),
  }),
};
