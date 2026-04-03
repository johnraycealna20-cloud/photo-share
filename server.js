const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ─── Ensure uploads directory exists ─────────────────────────────────────────
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// ─── Multer Storage Config ────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Only image files are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max per file
});

// ─── DB (Simple JSON file as lightweight database) ───────────────────────────
const dbPath = path.join(__dirname, 'db.json');

function readDb() {
  if (!fs.existsSync(dbPath)) {
    fs.writeFileSync(dbPath, JSON.stringify({ photos: [] }));
  }
  return JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
}

function writeDb(data) {
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/photos — Fetch all photos (newest first)
app.get('/api/photos', (req, res) => {
  const db = readDb();
  const sorted = db.photos.sort((a, b) => b.timestamp - a.timestamp);
  res.json(sorted);
});

// POST /api/upload — Upload one or more photos
app.post('/api/upload', upload.array('photos', 20), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const db = readDb();
  const now = Date.now();

  const newPhotos = req.files.map(file => ({
    id: file.filename,
    src: `/uploads/${file.filename}`,
    originalName: file.originalname,
    timestamp: now,
    size: file.size
  }));

  db.photos.push(...newPhotos);
  writeDb(db);

  res.status(201).json({ uploaded: newPhotos.length, photos: newPhotos });
});

// DELETE /api/photos/:id — Delete a single photo
app.delete('/api/photos/:id', (req, res) => {
  const { id } = req.params;
  const db = readDb();

  const photoIndex = db.photos.findIndex(p => p.id === id);
  if (photoIndex === -1) {
    return res.status(404).json({ error: 'Photo not found' });
  }

  // Delete file from disk
  const filePath = path.join(uploadsDir, id);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  db.photos.splice(photoIndex, 1);
  writeDb(db);

  res.json({ message: 'Photo deleted successfully' });
});

// Serve uploaded images statically
app.use('/uploads', express.static(uploadsDir));

// Serve frontend for all other routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── Error Handler ────────────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: 'File too large. Max 10MB per image.' });
  }
  console.error(err.message);
  res.status(500).json({ error: err.message || 'Server error' });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Photo Share server running on http://localhost:${PORT}`);
});
