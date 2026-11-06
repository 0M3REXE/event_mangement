const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'data', 'app.db');
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('student','admin')),
  email TEXT
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  description TEXT,
  event_date TEXT NOT NULL,
  venue TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 50,
  created_by INTEGER,
  FOREIGN KEY(created_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS registrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  registered_at TEXT NOT NULL,
  UNIQUE(event_id, user_id),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

function hash(p){ return crypto.scryptSync(p,'salt',32).toString('hex'); }

const adminExists = db.prepare('SELECT id FROM users WHERE username=?').get('admin');
if (!adminExists) {
  db.prepare('INSERT INTO users (username,password,name,role,email) VALUES (?,?,?,?,?)')
    .run('admin', hash('admin123'), 'Administrator', 'admin', 'admin@example.com');
}

// Seed a demo student
const stuExists = db.prepare('SELECT id FROM users WHERE username=?').get('student1');
if (!stuExists) {
  db.prepare('INSERT INTO users (username,password,name,role,email) VALUES (?,?,?,?,?)')
    .run('student1', hash('pass123'), 'Student One', 'student', 'student1@example.com');
}

// Seed events
const evCount = db.prepare('SELECT COUNT(*) AS c FROM events').get().c;
if (evCount === 0) {
  const adminId = db.prepare('SELECT id FROM users WHERE username=?').get('admin').id;
  const insEv = db.prepare('INSERT INTO events (title,description,event_date,venue,capacity,created_by) VALUES (?,?,?,?,?,?)');
  insEv.run('Tech Fest 2026','Annual technology festival with workshops and competitions.','2026-12-05','Main Auditorium',200,adminId);
  insEv.run('AI Workshop','Hands-on workshop on AI and machine learning.','2026-12-12','Lab 3',50,adminId);
  insEv.run('Hackathon','24-hour coding hackathon for students.','2026-12-20','Innovation Center',80,adminId);
  insEv.run('Career Fair','Meet recruiters and explore job opportunities.','2027-01-10','Convention Hall',300,adminId);
}

// Seed a registration for demo student
const regCount = db.prepare('SELECT COUNT(*) AS c FROM registrations').get().c;
if (regCount === 0) {
  const sid = db.prepare('SELECT id FROM users WHERE username=?').get('student1');
  const eid = db.prepare('SELECT id FROM events LIMIT 1').get();
  if (sid && eid) {
    try {
      db.prepare('INSERT INTO registrations (event_id,user_id,registered_at) VALUES (?,?,?)')
        .run(eid.id, sid.id, new Date().toISOString());
    } catch(e) {}
  }
}

module.exports = { db, hash };
