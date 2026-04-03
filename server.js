const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Uploads dir ───────────────────────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// ─── Multer ────────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + '-' + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    file.mimetype.startsWith('image/') ? cb(null, true) : cb(new Error('Images only'));
  },
  limits: { fileSize: 10 * 1024 * 1024 }
});

// ─── DB helpers ───────────────────────────────────────────────────────────
const dbPath = path.join(__dirname, 'db.json');
function readDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ users: [], photos: [], notes: [], sessions: {} }));
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
  if (!db.notes) db.notes = [];
  if (!db.sessions) db.sessions = {};
  return db;
}
function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ─── Auth helpers ──────────────────────────────────────────────────────────
function hashPassword(password) {
  return crypto.createHash('sha256').update(password + 'photoshare_salt').digest('hex');
}
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}
function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'];
  if (!token) return res.status(401).json({ error: 'Not authenticated' });
  const db = readDb();
  const session = db.sessions[token];
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' });
  req.username = session.username;
  next();
}

// ─── AUTH ROUTES ──────────────────────────────────────────────────────────

// Register
app.post('/api/register', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (username.length < 3) return res.status(400).json({ error: 'Username must be at least 3 characters' });
  if (password.length < 4) return res.status(400).json({ error: 'Password must be at least 4 characters' });

  const db = readDb();
  if (db.users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already taken' });
  }

  db.users.push({ username, password: hashPassword(password), createdAt: Date.now() });
  writeDb(db);
  res.status(201).json({ message: 'Account created successfully' });
});

// Login
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  const db = readDb();
  const user = db.users.find(u => u.username === username && u.password === hashPassword(password));
  if (!user) return res.status(401).json({ error: 'Invalid username or password' });

  const token = generateToken();
  db.sessions[token] = { username, createdAt: Date.now() };
  writeDb(db);
  res.json({ token, username });
});

// Logout
app.post('/api/logout', requireAuth, (req, res) => {
  const token = req.headers['x-auth-token'];
  const db = readDb();
  delete db.sessions[token];
  writeDb(db);
  res.json({ message: 'Logged out' });
});

// Who am I
app.get('/api/me', requireAuth, (req, res) => {
  res.json({ username: req.username });
});

// ─── PHOTO ROUTES ─────────────────────────────────────────────────────────

app.get('/api/photos', requireAuth, (req, res) => {
  const db = readDb();
  const myPhotos = db.photos
    .filter(p => p.owner === req.username)
    .sort((a, b) => b.timestamp - a.timestamp);
  res.json(myPhotos);
});

app.post('/api/upload', requireAuth, upload.array('photos', 20), (req, res) => {
  if (!req.files || req.files.length === 0) return res.status(400).json({ error: 'No files uploaded' });
  const db = readDb();
  const now = Date.now();
  const newPhotos = req.files.map(file => ({
    id: file.filename,
    src: `/uploads/${file.filename}`,
    originalName: file.originalname,
    timestamp: now,
    size: file.size,
    owner: req.username
  }));
  db.photos.push(...newPhotos);
  writeDb(db);
  res.status(201).json({ uploaded: newPhotos.length, photos: newPhotos });
});

app.delete('/api/photos/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const idx = db.photos.findIndex(p => p.id === id && p.owner === req.username);
  if (idx === -1) return res.status(404).json({ error: 'Photo not found' });
  const filePath = path.join(uploadsDir, id);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  db.photos.splice(idx, 1);
  writeDb(db);
  res.json({ message: 'Deleted' });
});

app.use('/uploads', express.static(uploadsDir));

// ─── NOTES ROUTES ─────────────────────────────────────────────────────────

app.get('/api/notes', requireAuth, (req, res) => {
  const db = readDb();
  const myNotes = db.notes
    .filter(n => n.owner === req.username)
    .sort((a, b) => b.updatedAt - a.updatedAt);
  res.json(myNotes);
});

app.post('/api/notes', requireAuth, (req, res) => {
  const { title, content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  const db = readDb();
  const note = {
    id: crypto.randomBytes(8).toString('hex'),
    title: title || 'Untitled Note',
    content,
    owner: req.username,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };
  db.notes.push(note);
  writeDb(db);
  res.status(201).json(note);
});

app.put('/api/notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { title, content } = req.body;
  const db = readDb();
  const note = db.notes.find(n => n.id === id && n.owner === req.username);
  if (!note) return res.status(404).json({ error: 'Note not found' });
  if (title !== undefined) note.title = title;
  if (content !== undefined) note.content = content;
  note.updatedAt = Date.now();
  writeDb(db);
  res.json(note);
});

app.delete('/api/notes/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const db = readDb();
  const idx = db.notes.findIndex(n => n.id === id && n.owner === req.username);
  if (idx === -1) return res.status(404).json({ error: 'Note not found' });
  db.notes.splice(idx, 1);
  writeDb(db);
  res.json({ message: 'Deleted' });
});

// ─── Fallback ─────────────────────────────────────────────────────────────
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'Max 10MB per file' });
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => console.log(`✅ Server running on http://localhost:${PORT}`));
