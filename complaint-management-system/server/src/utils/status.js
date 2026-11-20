const STATUSES = ['Submitted', 'Under Review', 'Assigned', 'In Progress', 'Resolved', 'Closed', 'Rejected', 'Reopened', 'Escalated'];
const TERMINAL = ['Resolved', 'Closed', 'Rejected'];
const TRANSITIONS = {
  Submitted: ['Under Review', 'Assigned', 'Rejected'],
  'Under Review': ['Assigned', 'In Progress', 'Rejected'],
  Assigned: ['In Progress', 'Under Review', 'Rejected'],
  'In Progress': ['Resolved', 'Assigned', 'Rejected'],
  Escalated: ['Assigned', 'In Progress', 'Resolved', 'Rejected'],
  Resolved: ['Closed', 'Reopened'],
  Closed: ['Reopened'],
  Rejected: ['Reopened'],
  Reopened: ['Under Review', 'Assigned', 'In Progress', 'Rejected'],
};
const ROLE_TARGETS = {
  student: ['Reopened'],
  staff: ['In Progress', 'Resolved'],
  dept_head: STATUSES.filter((s) => !['Reopened', 'Escalated'].includes(s)),
  admin: STATUSES.filter((s) => s !== 'Escalated'),
};
const allowedFor = (role, current) => (TRANSITIONS[current] || []).filter((s) => (ROLE_TARGETS[role] || []).includes(s));
module.exports = { STATUSES, TERMINAL, allowedFor };
