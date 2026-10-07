// routes/notifications.js — lecture du journal des notifications envoyées
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT n.*, c.nom AS contactNom
       FROM notifications n
       LEFT JOIN contacts_confiance c ON c.id = n.contactId
       ORDER BY n.id DESC`
    )
    .all();
  res.json(rows);
});

router.put('/:id/accuser', (req, res) => {
  db.prepare(`UPDATE notifications SET statut = 'accusée' WHERE id = ?`).run(req.params.id);
  res.json(db.prepare('SELECT * FROM notifications WHERE id = ?').get(req.params.id));
});

module.exports = router;
