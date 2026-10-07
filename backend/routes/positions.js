// routes/positions.js — CRUD (lecture + ajout) pour l'entité Position
// GET /api/positions?trackerId=1 — historique, du plus récent au plus ancien
'use strict';

const express = require('express');
const db = require('../db');
const { CreatePositionSchema, parseBody } = require('../schemas');

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

// POST /api/positions — enregistrer un nouveau point (simulateur GPS, app mobile...)
router.post('/', (req, res) => {
  const data = parseBody(CreatePositionSchema, req.body, res);
  if (!data) return;

  const tracker = db.prepare('SELECT id FROM trackers WHERE id = ? AND concerneId = ?').get(data.trackerId, req.userId);
  if (!tracker) {
    return res.status(403).json({ error: 'Tracker non autorisé' });
  }

  const info = db
    .prepare(
      `INSERT INTO positions (trackerId, lat, lon, precisionM, horodatage)
       VALUES (?, ?, ?, ?, datetime('now'))`
    )
    .run(data.trackerId, data.lat, data.lon, data.precisionM);

  db.prepare(`UPDATE trackers SET lat=?, lon=?, majLe=datetime('now') WHERE id=? AND concerneId=?`).run(
    data.lat,
    data.lon,
    data.trackerId,
    req.userId
  );

  res
    .status(201)
    .json(db.prepare('SELECT * FROM positions WHERE id = ?').get(Number(info.lastInsertRowid)));
});

module.exports = router;
