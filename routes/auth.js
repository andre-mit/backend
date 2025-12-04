const express = require('express');
const router = express.Router();
const db = require('../db');
const fetch = global.fetch || require('node-fetch');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt_secret_change_me';
const JWT_EXPIRES = process.env.JWT_EXPIRES || '7d';
const FRONTEND_BASE = process.env.FRONTEND_BASE || 'http://localhost:5555';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER || 'no-reply@localhost';

function getMailer() {
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_PORT === 465, // true for 465, false for other ports
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}
// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });

    try {
      const rows = await db.query('SELECT * FROM profiles WHERE email = ? LIMIT 1', [email]);
      if (!rows || rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
      const profile = rows[0];
      const stored = profile.password_hash || '';
      if (!stored) return res.status(401).json({ error: 'Invalid credentials' });
      const parts = stored.split(':');
      if (parts.length !== 2) return res.status(401).json({ error: 'Invalid credentials' });
      const salt = parts[0];
      const hashHex = parts[1];
      const crypto = require('crypto');
      const derived = crypto.scryptSync(password, salt, 64);
      if (derived.toString('hex') !== hashHex) return res.status(401).json({ error: 'Invalid credentials' });
      // Email confirmation disabled: allow login without confirmed_at
      const token = jwt.sign({ sub: profile.id, email: profile.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      const safeProfile = { id: profile.id, email: profile.email, display_name: profile.display_name, avatar_url: profile.avatar_url };
      return res.json({ token, profile: safeProfile });
    } catch (e) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});
// POST /api/auth/google
router.post('/google', async (req, res) => {
  try {
    const { id_token } = req.body || req.body.idToken || req.body.idToken;
    if (!id_token) return res.status(400).json({ error: 'id_token required' });

    // Verifica id_token do Google
    const verifyUrl = `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(id_token)}`;
    let claim;
    try {
      const r = await fetch(verifyUrl);
      if (!r.ok) {
        const txt = await r.text().catch(() => '');
        return res.status(401).json({ error: 'Invalid id_token', detail: txt });
      }
      claim = await r.json();
    } catch (e) {
      return res.status(500).json({ error: 'Failed to validate id_token', detail: e.message });
    }

    const googleId = claim.sub;
    const email = claim.email;
    const displayName = claim.name || claim.given_name || null;
    const avatar = claim.picture || null;

    if (!googleId || !email) {
      return res.status(400).json({ error: 'id_token missing required claims' });
    }
    try {
      let rows = await db.query('SELECT * FROM profiles WHERE id = ? LIMIT 1', [googleId]);
      let profileId = googleId;
      if (!rows || rows.length === 0) {
        rows = await db.query('SELECT * FROM profiles WHERE email = ? LIMIT 1', [email]);
        if (rows && rows.length > 0) {
          profileId = rows[0].id;
          await db.query('UPDATE profiles SET id = ?, display_name = ?, avatar_url = ?, email = ? WHERE id = ?', [googleId, displayName, avatar, email, profileId]);
          profileId = googleId; 
        } else {
          await db.query('INSERT INTO profiles SET ?', [{ id: googleId, email, display_name: displayName, avatar_url: avatar }]);
          profileId = googleId;
        }
      } else {
        await db.query('UPDATE profiles SET email = ?, display_name = ?, avatar_url = ? WHERE id = ?', [email, displayName, avatar, googleId]);
      }

      const final = await db.query('SELECT id, email, display_name, avatar_url, created_at FROM profiles WHERE id = ? LIMIT 1', [googleId]);
      const profile = (final && final[0]) || null;
      const token = jwt.sign({ sub: googleId, email: email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });

      return res.json({ token, profile });
    } catch (e) {
      const token = jwt.sign({ sub: googleId, email: email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
      const profile = { id: googleId, email, display_name: displayName, avatar_url: avatar };
      return res.json({ token, profile });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, password, display_name } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: 'email and password required' });
    const profileId = email;
    const salt = crypto.randomBytes(16).toString('hex');
    const derived = crypto.scryptSync(password, salt, 64);
    const password_hash = `${salt}:${derived.toString('hex')}`;

    // Email confirmation disabled: mark as confirmed immediately
    const payload = { id: profileId, email, display_name: display_name || null, avatar_url: null, password_hash, confirmed_at: new Date() };
    try {
      await db.query('INSERT INTO profiles SET ?', [payload]);
    } catch (e) {
      return res.status(409).json({ error: 'Profile already exists' });
    }

    // Issue login token immediately since confirmation is disabled
    const token = jwt.sign({ sub: profileId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.status(201).json({ id: profileId, token });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// GET or POST /api/auth/confirm?token=... (accept both)
router.get('/confirm', async (req, res) => {
  const token = req.query.token || req.query.refresh_token;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'confirm') return res.status(400).json({ error: 'invalid token' });
    const userId = decoded.sub || decoded.user || decoded.email;
    await db.query('UPDATE profiles SET confirmed_at = NOW() WHERE id = ?', [userId]);
    // issue login token
    const loginToken = jwt.sign({ sub: userId, email: decoded.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token: loginToken });
  } catch (e) {
    return res.status(400).json({ error: 'invalid or expired token' });
  }
});

router.post('/confirm', async (req, res) => {
  const token = req.body?.token || req.body?.refresh_token;
  if (!token) return res.status(400).json({ error: 'token required' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (!decoded || decoded.type !== 'confirm') return res.status(400).json({ error: 'invalid token' });
    const userId = decoded.sub || decoded.user || decoded.email;
    await db.query('UPDATE profiles SET confirmed_at = NOW() WHERE id = ?', [userId]);
    const loginToken = jwt.sign({ sub: userId, email: decoded.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
    return res.json({ token: loginToken });
  } catch (e) {
    return res.status(400).json({ error: 'invalid or expired token' });
  }
});

// POST /api/auth/resend { email }
router.post('/resend', async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'email required' });
    // ensure profile exists
    const rows = await db.query('SELECT id FROM profiles WHERE email = ? LIMIT 1', [email]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Profile not found' });
    const profileId = rows[0].id;

    // Confirmation disabled; simply report OK
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

