const db = require('./index');
const { migrate } = require('./migrate');
const { seed } = require('./seed');

function setup() { migrate(db); seed(db); return db; }
module.exports = { setup };
