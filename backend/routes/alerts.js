// routes/alerts.js — CRUD pour l'entité Alerte.
// La création d'une alerte génère automatiquement une Notification vers le
// premier contact de confiance actif (simulation simplifiée).
'use strict';

const express = require('express');
const db = require('../db');
const { CreateAlerteSchema, parseBody } = require('../schemas');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, t.nom AS trackerNom
       FROM alertes a
       LEFT JOIN trackers t ON t.id = a.trackerId
       WHERE a.concerneId = ?
       ORDER BY a.id DESC`
    )
    .all(req.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const data = parseBody(CreateAlerteSchema, req.body, res);
  if (!data) return;

  const info = db
    .prepare(`INSERT INTO alertes (concerneId, trackerId, type, mode) VALUES (?,?,?,?)`)
    .run(req.userId, data.trackerId, data.type, data.mode);
  const alerteId = Number(info.lastInsertRowid);

  // Notifie le premier contact actif trouvé (canal Push par défaut, Appel pour un SOS)
  const contact = db
    .prepare(`SELECT * FROM contacts_confiance WHERE statut = 'actif' AND concerneId = ? ORDER BY id LIMIT 1`)
    .get(req.userId);
  if (contact) {
    const notifType = data.type === 'SOS' ? 'Appel' : 'Push';
    const canal = notifType === 'Appel' ? 'GSM' : 'App';
    db.prepare(
      `INSERT INTO notifications (alerteId, contactId, type, canal, statut) VALUES (?,?,?,?, 'envoyée')`
    ).run(alerteId, contact.id, notifType, canal);
  }

  const alerte = db.prepare('SELECT * FROM alertes WHERE id = ? AND concerneId = ?').get(alerteId, req.userId);
  res.status(201).json(alerte);
});

router.put('/:id/cloturer', (req, res) => {
  db.prepare(`UPDATE alertes SET dateFin = datetime('now') WHERE id = ? AND concerneId = ?`).run(req.params.id, req.userId);
  res.json(db.prepare('SELECT * FROM alertes WHERE id = ? AND concerneId = ?').get(req.params.id, req.userId));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM alertes WHERE id = ? AND concerneId = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

module.exports = router;
