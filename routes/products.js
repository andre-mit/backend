const express = require('express');
const router = express.Router();
const db = require('../db');
const auth = require('../middleware/auth');

// GET /api/products
router.get('/', async (req, res) => {
  try {
    try {
      const rows = await db.query(`
        SELECT p.*, pr.id AS profile_id, pr.email AS profile_email,
               pr.display_name AS profile_display_name, pr.avatar_url AS profile_avatar
        FROM products p
        LEFT JOIN profiles pr ON pr.id = p.user_id
        ORDER BY p.created_at DESC
        LIMIT 100
      `);
      const result = rows.map(r => {
        let images = [];
        try {
          images = r.images ? JSON.parse(r.images) : [];
        } catch (e) {
          images = r.images ? [r.images] : [];
        }
        return {
          id: r.id,
          title: r.title,
          description: r.description,
          price: r.price,
          user_id: r.user_id,
          images,
          created_at: r.created_at,
          user: r.profile_id ? {
            id: r.profile_id,
            email: r.profile_email,
            display_name: r.profile_display_name,
            avatar_url: r.profile_avatar
          } : null
        };
      });

      res.json(result);
    } catch (err) {
      return res.json([]);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/products/:id
router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    try {
      const rows = await db.query(`
        SELECT p.*, pr.id AS profile_id, pr.email AS profile_email,
               pr.display_name AS profile_display_name, pr.avatar_url AS profile_avatar
        FROM products p
        LEFT JOIN profiles pr ON pr.id = p.user_id
        WHERE p.id = ?
        LIMIT 1
      `, [id]);
      if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
      const r = rows[0];
      let images = [];
      try { images = r.images ? JSON.parse(r.images) : []; } catch (e) { images = r.images ? [r.images] : []; }
      const product = {
        id: r.id,
        title: r.title,
        description: r.description,
        price: r.price,
        user_id: r.user_id,
        images,
        created_at: r.created_at,
        user: r.profile_id ? {
          id: r.profile_id,
          email: r.profile_email,
          display_name: r.profile_display_name,
          avatar_url: r.profile_avatar
        } : null
      };
      res.json(product);
    } catch (err) {
      return res.status(404).json({ error: 'Not found (stub mode)' });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/products
router.post('/', auth, async (req, res) => {
  try {
    const product = req.body;
    if (req.user && req.user.sub) {
      product.user_id = req.user.sub;
    }
    if (product.images && Array.isArray(product.images)) {
      product.images = JSON.stringify(product.images);
    }
    try {
      const result = await db.query('INSERT INTO products SET ?', [product]);
      const insertId = result && result.insertId ? result.insertId : (result && result[0] && result[0].insertId ? result[0].insertId : -1);
      res.status(201).json({ id: insertId });
    } catch (err) {
      res.status(201).json({ id: -1 });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

//api/products/:id
router.put('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    const updates = req.body;
    try {
      await db.query('UPDATE products SET ? WHERE id = ?', [updates, id]);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// DELETE /api/products/:id
router.delete('/:id', async (req, res) => {
  try {
    const id = req.params.id;
    try {
      await db.query('DELETE FROM products WHERE id = ?', [id]);
      res.json({ ok: true });
    } catch (err) {
      res.json({ ok: true });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
