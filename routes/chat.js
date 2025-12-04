const express = require('express');
const router = express.Router();
const db = require('../db');

router.get('/sessions', async (req, res) => {
  const { product_id, buyer_id, seller_id } = req.query;
  try {
    try {
      const rows = await db.query(`
        SELECT cs.*, b.display_name AS buyer_name, b.avatar_url AS buyer_avatar,
               s.display_name AS seller_name, s.avatar_url AS seller_avatar
        FROM chat_sessions cs
        LEFT JOIN profiles b ON b.id = cs.buyer_id
        LEFT JOIN profiles s ON s.id = cs.seller_id
        WHERE cs.product_id = ? AND cs.buyer_id = ? AND cs.seller_id = ?
        LIMIT 1
      `, [product_id, buyer_id, seller_id]);
      const mapped = rows.map(r => ({
        id: r.id,
        product_id: r.product_id,
        buyer_id: r.buyer_id,
        seller_id: r.seller_id,
        created_at: r.created_at,
        buyer: r.buyer_name ? { id: r.buyer_id, display_name: r.buyer_name, avatar_url: r.buyer_avatar } : null,
        seller: r.seller_name ? { id: r.seller_id, display_name: r.seller_name, avatar_url: r.seller_avatar } : null
      }));
      res.json(mapped);
    } catch (err) {
      res.json([]);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/chat/sessions
router.post('/sessions', async (req, res) => {
  const payload = req.body;
  try {
    try {
      const result = await db.query('INSERT INTO chat_sessions SET ?', [payload]);
      const insertId = result && result.insertId ? result.insertId : (result && result[0] && result[0].insertId ? result[0].insertId : -1);
      res.status(201).json({ id: insertId });
    } catch (err) {
      res.status(201).json({ id: -1 });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// GET /api/chat/messages?chat_id=
router.get('/messages', async (req, res) => {
  const { chat_id } = req.query;
  try {
    try {
      const rows = await db.query(`
        SELECT m.*, s.display_name AS sender_name, s.avatar_url AS sender_avatar
        FROM chat_messages m
        LEFT JOIN profiles s ON s.id = m.sender_id
        WHERE m.chat_id = ?
        ORDER BY m.created_at ASC
      `, [chat_id]);
      const mapped = rows.map(r => ({
        id: r.id,
        chat_id: r.chat_id,
        sender_id: r.sender_id,
        message: r.message,
        created_at: r.created_at,
        sender: r.sender_name ? { id: r.sender_id, display_name: r.sender_name, avatar_url: r.sender_avatar } : null
      }));
      res.json(mapped);
    } catch (err) {
      res.json([]);
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/chat/messages
router.post('/messages', async (req, res) => {
  const payload = req.body;
  try {
    try {
      const result = await db.query('INSERT INTO chat_messages SET ?', [payload]);
      const insertId = result && result.insertId ? result.insertId : (result && result[0] && result[0].insertId ? result[0].insertId : -1);
      res.status(201).json({ id: insertId });
    } catch (err) {
      res.status(201).json({ id: -1 });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
