const fs = require('fs');
const path = require('path');
const db = require('./index');
const { migrate } = require('./migrate');
const { seed } = require('./seed');

const cmd = process.argv[2];
(async () => {
  if (cmd === 'migrate') console.log('Applied:', migrate(db).join(', ') || 'nothing new');
  else if (cmd === 'seed') { migrate(db); seed(db); console.log('Seed data ensured.'); }
  else if (cmd === 'backup') {
    const dir = path.join(__dirname, '../../backups');
    fs.mkdirSync(dir, { recursive: true });
    const file = path.join(dir, `cms-${new Date().toISOString().replace(/[:.]/g, '-')}.db`);
    await db.backup(file);
    console.log('Backup written to', file, '\nTo restore: stop the server, then copy this file over cms.db.');
  } else console.log('Usage: node src/db/cli.js migrate | seed | backup');
})();
