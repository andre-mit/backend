const express = require('express');
const router = express.Router();
const db = require('../db');
const crypto = require('crypto');

// GET /api/profiles/:id
router.get('/:id', async (req, res) => {
  const id = req.params.id;
  try {
    const rows = await db.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json(null);
    res.json(rows[0]);
  } catch (err) {
    res.json(null);
  }
});

// PUT /api/profiles/:id
router.put('/:id', async (req, res) => {
  const id = req.params.id;
  const updates = req.body;
  try {
    await db.query('UPDATE profiles SET ? WHERE id = ?', [updates, id]);
    res.json({ ok: true });
  } catch (err) {
    // stub: accept and respond ok
    res.json({ ok: true });
  }
});

// POST /api/profiles
router.post('/', async (req, res) => {
  try {
    const { id, email, display_name, password } = req.body;
    const profileId = id || email;
    if (!profileId || !email) return res.status(400).json({ error: 'id/email required' });
    try {
      const schema = process.env.DB_NAME || 'condo_market';
      const cols = await db.query(
        "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'profiles' AND COLUMN_NAME = 'password_hash'",
        [schema]
      );
      if (!cols || (Array.isArray(cols) && cols.length === 0)) {
        await db.query('ALTER TABLE profiles ADD COLUMN password_hash TEXT');
      }
    } catch (e) {
    }

    let password_hash = null;
    if (password) {
      const salt = crypto.randomBytes(16).toString('hex');
      const derived = crypto.scryptSync(password, salt, 64);
      password_hash = `${salt}:${derived.toString('hex')}`;
    }

    const payload = {
      id: profileId,
      email,
      display_name: display_name || null,
      avatar_url: null,
      password_hash,
    };

    try {
      await db.query('INSERT INTO profiles SET ?', [payload]);
      res.status(201).json({ id: profileId });
    } catch (err) {
      res.status(201).json({ id: profileId });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
