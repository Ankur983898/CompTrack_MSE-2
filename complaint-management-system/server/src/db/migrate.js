const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, '../../migrations');

function migrate(db) {
  db.exec('CREATE TABLE IF NOT EXISTS schema_migrations(version TEXT PRIMARY KEY, applied_at TEXT DEFAULT CURRENT_TIMESTAMP)');
  const done = new Set(db.prepare('SELECT version FROM schema_migrations').pluck().all());
  const applied = [];
  for (const f of fs.readdirSync(dir).filter((x) => x.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    db.transaction(() => {
      db.exec(fs.readFileSync(path.join(dir, f), 'utf8'));
      db.prepare('INSERT INTO schema_migrations(version) VALUES (?)').run(f);
    })();
    applied.push(f);
  }
  return applied;
}
module.exports = { migrate };
