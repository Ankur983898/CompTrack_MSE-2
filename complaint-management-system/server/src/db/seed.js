const bcrypt = require('bcryptjs');
const cfg = require('../config');

const DEPTS = ['Hostel Administration', 'Mess Committee', 'Library', 'Academic Affairs', 'Transport', 'IT Services', 'Maintenance'];
const CATS = { Hostel: 'Hostel Administration', Mess: 'Mess Committee', Library: 'Library', Classroom: 'Academic Affairs', Faculty: 'Academic Affairs', Transport: 'Transport', 'IT Services': 'IT Services', Electricity: 'Maintenance', Infrastructure: 'Maintenance', Other: 'Maintenance' };

function seed(db) {
  db.transaction(() => {
    DEPTS.forEach((d) => db.prepare('INSERT OR IGNORE INTO departments(name) VALUES (?)').run(d));
    const dep = (n) => db.prepare('SELECT id FROM departments WHERE name=?').get(n).id;
    for (const [c, d] of Object.entries(CATS)) {
      db.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)').run(c);
      db.prepare('UPDATE categories SET department_id=? WHERE name=? AND department_id IS NULL').run(dep(d), c);
    }
    [['High', 24], ['Medium', 48], ['Low', 72]].forEach(([p, h]) => db.prepare('INSERT OR IGNORE INTO escalation_rules(priority,hours) VALUES (?,?)').run(p, h));
    db.prepare('UPDATE complaints SET department_id=(SELECT department_id FROM categories WHERE id=complaints.category_id) WHERE department_id IS NULL').run();
    if (!cfg.seedDemo) return;
    const hash = bcrypt.hashSync('password123', cfg.bcryptCost);
    const hostel = dep('Hostel Administration');
    [['Admin', 'admin@college.edu', 'admin', null], ['Support Staff', 'staff@college.edu', 'staff', hostel],
      ['Hostel Head', 'depthead@college.edu', 'dept_head', hostel], ['Demo Student', 'student@college.edu', 'student', null]].forEach(([n, e, r, d]) => {
      if (!db.prepare('SELECT 1 FROM users WHERE email=?').get(e)) db.prepare('INSERT INTO users(name,email,password_hash,role,department_id) VALUES (?,?,?,?,?)').run(n, e, hash, r, d);
    });
    db.prepare("UPDATE users SET department_id=? WHERE email='staff@college.edu' AND department_id IS NULL").run(hostel);
  })();
}
module.exports = { seed };
