const Database = require('better-sqlite3');
const cfg = require('../config');

const db = new Database(cfg.dbPath);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');
module.exports = db;
