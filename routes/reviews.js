const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/reviews?to_user_id=...
router.get('/', async (req, res) => {
  const { to_user_id } = req.query;
  try {
    if (to_user_id) {
      try {
        const rows = await db.query(`
          SELECT r.*, f.display_name AS from_display_name, f.avatar_url AS from_avatar, f.email AS from_email
          FROM reviews r
          LEFT JOIN profiles f ON f.id = r.from_user_id
          WHERE r.to_user_id = ?
          ORDER BY r.created_at DESC
        `, [to_user_id]);
        const mapped = rows.map(r => ({
          id: r.id,
          from_user_id: r.from_user_id,
          to_user_id: r.to_user_id,
          rating: r.rating,
          comment: r.comment,
          created_at: r.created_at,
          from_user: r.from_display_name ? { id: r.from_user_id, display_name: r.from_display_name, avatar_url: r.from_avatar, email: r.from_email } : null
        }));
        return res.json(mapped);
      } catch (err) {
        return res.json([]);
      }
    }
    try {
      const rows = await db.query(`
        SELECT r.*, f.display_name AS from_display_name, f.avatar_url AS from_avatar, f.email AS from_email
        FROM reviews r
        LEFT JOIN profiles f ON f.id = r.from_user_id
        ORDER BY r.created_at DESC
        LIMIT 100
      `);
      const mapped = rows.map(r => ({
        id: r.id,
        from_user_id: r.from_user_id,
        to_user_id: r.to_user_id,
        rating: r.rating,
        comment: r.comment,
        created_at: r.created_at,
        from_user: r.from_display_name ? { id: r.from_user_id, display_name: r.from_display_name, avatar_url: r.from_avatar, email: r.from_email } : null
      }));
      res.json(mapped);
    } catch (err) {
      res.json([]);
    }
  } catch (err) {
    res.json([]);
  }
});

// POST /api/reviews
router.post('/', async (req, res) => {
  const payload = req.body;
  try {
    const result = await db.query('INSERT INTO reviews SET ?', [payload]);
    res.status(201).json({ id: result.insertId });
  } catch (err) {
    res.status(201).json({ id: -1 });
  }
});

module.exports = router;
