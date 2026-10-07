// routes/positions.js — CRUD (lecture + ajout) pour l'entité Position
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  const { trackerId } = req.query;
  const rows = trackerId
    ? db
        .prepare('SELECT p.* FROM positions p JOIN trackers t ON t.id = p.trackerId WHERE p.trackerId = ? AND t.concerneId = ? ORDER BY p.id DESC LIMIT 50')
        .all(trackerId, req.userId)
    : db.prepare('SELECT p.* FROM positions p JOIN trackers t ON t.id = p.trackerId WHERE t.concerneId = ? ORDER BY p.id DESC LIMIT 50').all(req.userId);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { trackerId, lat, lon, precisionM = 5 } = req.body;
  if (!trackerId || lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'trackerId, lat et lon sont requis' });
  }

  const tracker = db.prepare('SELECT id FROM trackers WHERE id = ? AND concerneId = ?').get(trackerId, req.userId);
  if (!tracker) {
    return res.status(403).json({ error: 'Tracker non autorisé' });
  }
  const info = db
    .prepare(
      `INSERT INTO positions (trackerId, lat, lon, precisionM, horodatage)
       VALUES (?, ?, ?, ?, strftime('%H:%M','now'))`
    )
    .run(trackerId, lat, lon, precisionM);

  db.prepare(`UPDATE trackers SET lat=?, lon=?, majLe=datetime('now') WHERE id=?`).run(
    lat,
    lon,
    trackerId
  );

  res
    .status(201)
    .json(db.prepare('SELECT * FROM positions WHERE id = ?').get(Number(info.lastInsertRowid)));
});

module.exports = router;
