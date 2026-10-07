// routes/positions.js — CRUD (lecture + ajout) pour l'entité Position
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/positions?trackerId=1 — historique, du plus récent au plus ancien
router.get('/', (req, res) => {
  const { trackerId } = req.query;
  const rows = trackerId
    ? db
        .prepare('SELECT * FROM positions WHERE trackerId = ? ORDER BY id DESC LIMIT 50')
        .all(trackerId)
    : db.prepare('SELECT * FROM positions ORDER BY id DESC LIMIT 50').all();
  res.json(rows);
});

// POST /api/positions — enregistrer un nouveau point (simulateur GPS, app mobile...)
router.post('/', (req, res) => {
  const { trackerId, lat, lon, precisionM = 5 } = req.body;
  if (!trackerId || lat === undefined || lon === undefined) {
    return res.status(400).json({ error: 'trackerId, lat et lon sont requis' });
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
