// routes/alerts.js — CRUD pour l'entité Alerte.
// La création d'une alerte génère automatiquement une Notification vers le
// premier contact de confiance actif (simulation simplifiée du dossier
// d'analyse : diffusion aux contacts de confiance lors d'une alerte).
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const rows = db
    .prepare(
      `SELECT a.*, t.nom AS trackerNom
       FROM alertes a
       LEFT JOIN trackers t ON t.id = a.trackerId
       ORDER BY a.id DESC`
    )
    .all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { type, mode = 'Manuel', trackerId = null, concerneId = 1 } = req.body;
  if (!type) return res.status(400).json({ error: 'type est requis' });

  const info = db
    .prepare(
      `INSERT INTO alertes (concerneId, trackerId, type, mode) VALUES (?,?,?,?)`
    )
    .run(concerneId, trackerId, type, mode);
  const alerteId = Number(info.lastInsertRowid);

  // Notifie le premier contact actif trouvé (canal Push par défaut, Appel pour un SOS)
  const contact = db
    .prepare(`SELECT * FROM contacts_confiance WHERE statut = 'actif' ORDER BY id LIMIT 1`)
    .get();
  if (contact) {
    const notifType = type === 'SOS' ? 'Appel' : 'Push';
    const canal = notifType === 'Appel' ? 'GSM' : 'App';
    db.prepare(
      `INSERT INTO notifications (alerteId, contactId, type, canal, statut) VALUES (?,?,?,?, 'envoyée')`
    ).run(alerteId, contact.id, notifType, canal);
  }

  const alerte = db.prepare('SELECT * FROM alertes WHERE id = ?').get(alerteId);
  res.status(201).json(alerte);
});

router.put('/:id/cloturer', (req, res) => {
  db.prepare(`UPDATE alertes SET dateFin = datetime('now') WHERE id = ?`).run(req.params.id);
  res.json(db.prepare('SELECT * FROM alertes WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM alertes WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
