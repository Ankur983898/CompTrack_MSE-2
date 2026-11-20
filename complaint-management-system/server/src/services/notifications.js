const repo = require('../repositories/notifications');
const users = require('../repositories/users');

// Single choke point for notifications: a real-time (Socket.IO) emitter plugs in here later.
const staffSide = (c) => [...new Set([...users.adminIds(), ...(c.department_id ? users.headIds(c.department_id) : []), ...(c.assigned_to ? [c.assigned_to] : [])])];
const toStaffSide = (c, message, type, exceptId) => staffSide(c).filter((id) => id !== exceptId).forEach((id) => repo.add(id, message, { type, complaintId: c.id }));
const toUser = (userId, message, type, complaintId) => repo.add(userId, message, { type, complaintId });
module.exports = { toStaffSide, toUser, staffSide };
