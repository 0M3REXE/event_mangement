const express = require('express');
const session = require('express-session');
const path = require('path');
const { db, hash } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
  secret: 'events-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000*60*60*2 }
}));

function requireAuth(req, res, next) {
  if (!req.session.user) return res.redirect('/login');
  next();
}
function requireAdmin(req, res, next) {
  if (!req.session.user || req.session.user.role !== 'admin') return res.redirect('/login');
  next();
}

app.get('/', (req, res) => res.redirect(req.session.user ? '/events' : '/login'));
app.get('/health', (req, res) => res.status(200).send('OK'));

// ---------- Auth ----------
app.get('/register', (req, res) => res.render('register', { error: null }));
app.post('/register', (req, res) => {
  const { username, password, name, email } = req.body;
  try {
    db.prepare('INSERT INTO users (username,password,name,role,email) VALUES (?,?,?,?,?)')
      .run(username, hash(password), name, 'student', email);
    res.redirect('/login');
  } catch (e) {
    res.render('register', { error: 'Username already exists' });
  }
});
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const u = db.prepare('SELECT * FROM users WHERE username=?').get(username);
  if (!u || u.password !== hash(password)) {
    return res.render('login', { error: 'Invalid credentials' });
  }
  req.session.user = { id: u.id, username: u.username, name: u.name, role: u.role };
  res.redirect(u.role === 'admin' ? '/admin' : '/events');
});
app.get('/logout', (req, res) => { req.session.destroy(()=>{}); res.redirect('/login'); });

// ---------- Events (student) ----------
app.get('/events', requireAuth, (req, res) => {
  const events = db.prepare(`
    SELECT e.*, 
      (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id) AS reg_count,
      (SELECT 1 FROM registrations r WHERE r.event_id=e.id AND r.user_id=?) AS registered
    FROM events e ORDER BY e.event_date
  `).all(req.session.user.id);
  res.render('events', { user: req.session.user, events });
});
app.post('/events/:id/register', requireAuth, (req, res) => {
  const eventId = parseInt(req.params.id);
  const userId = req.session.user.id;
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(eventId);
  if (!ev) return res.redirect('/events');
  const count = db.prepare('SELECT COUNT(*) AS c FROM registrations WHERE event_id=?').get(eventId).c;
  if (count >= ev.capacity) {
    return res.render('confirm', { user: req.session.user, event: ev, status: 'full' });
  }
  try {
    db.prepare('INSERT INTO registrations (event_id,user_id,registered_at) VALUES (?,?,?)')
      .run(eventId, userId, new Date().toISOString());
    res.render('confirm', { user: req.session.user, event: ev, status: 'success' });
  } catch (e) {
    res.render('confirm', { user: req.session.user, event: ev, status: 'already' });
  }
});
app.get('/my-registrations', requireAuth, (req, res) => {
  const regs = db.prepare(`
    SELECT e.*, r.registered_at FROM registrations r JOIN events e ON e.id=r.event_id
    WHERE r.user_id=? ORDER BY e.event_date
  `).all(req.session.user.id);
  res.render('my_regs', { user: req.session.user, regs });
});

// ---------- Admin ----------
app.get('/admin', requireAdmin, (req, res) => {
  const events = db.prepare(`
    SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id=e.id) AS reg_count
    FROM events e ORDER BY e.event_date
  `).all();
  res.render('admin', { user: req.session.user, events });
});
app.get('/admin/events/new', requireAdmin, (req, res) => res.render('event_new', { user: req.session.user, error: null }));
app.post('/admin/events', requireAdmin, (req, res) => {
  const { title, description, event_date, venue, capacity } = req.body;
  db.prepare('INSERT INTO events (title,description,event_date,venue,capacity,created_by) VALUES (?,?,?,?,?,?)')
    .run(title, description, event_date, venue, parseInt(capacity||50), req.session.user.id);
  res.redirect('/admin');
});
app.get('/admin/events/:id/participants', requireAdmin, (req, res) => {
  const ev = db.prepare('SELECT * FROM events WHERE id=?').get(req.params.id);
  const parts = db.prepare(`
    SELECT u.name, u.username, u.email, r.registered_at
    FROM registrations r JOIN users u ON u.id=r.user_id
    WHERE r.event_id=? ORDER BY r.registered_at
  `).all(req.params.id);
  res.render('participants', { user: req.session.user, event: ev, parts });
});

app.listen(PORT, () => console.log(`Events app running on http://localhost:${PORT}`));
