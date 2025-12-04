const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config();

const STORAGE_PATH = process.env.STORAGE_PATH || path.join(__dirname, '..', 'storage');

if (!fs.existsSync(STORAGE_PATH)) {
  fs.mkdirSync(STORAGE_PATH, { recursive: true });
}

const upload = multer({ dest: STORAGE_PATH });

// POST /api/storage/upload - upload
router.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'file required' });
  const relPath = path.relative(process.cwd(), req.file.path).replace(/\\/g, '/');
  const publicUrl = `/api/storage/public/${path.basename(req.file.path)}`;
  res.json({ url: publicUrl, path: relPath });
});

router.get('/public/:name', (req, res) => {
  const name = req.params.name;
  const filePath = path.join(STORAGE_PATH, name);
  if (!fs.existsSync(filePath)) return res.status(404).end();
  res.sendFile(path.resolve(filePath));
});

module.exports = router;
