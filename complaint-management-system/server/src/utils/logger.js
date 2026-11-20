const cfg = require('../config');
const SECRET = /pass|token|secret|authorization|cookie|hash/i;
const clean = (v, d = 0) => {
  if (d > 4 || v == null || typeof v !== 'object') return v;
  if (Array.isArray(v)) return v.map((x) => clean(x, d + 1));
  return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, SECRET.test(k) ? '[redacted]' : clean(x, d + 1)]));
};
const write = (level) => (msg, meta = {}) => {
  if (cfg.isTest) return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...clean(meta) }));
};
module.exports = { info: write('info'), warn: write('warn'), error: write('error') };
