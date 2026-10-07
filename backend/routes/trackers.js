// routes/trackers.js — CRUD pour l'entité TrackerObjet
const express = require('express');
const db = require('../db');

const router = express.Router();

// GET /api/trackers — liste tous les trackers
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM trackers ORDER BY id DESC').all();
  res.json(rows);
});

// POST /api/trackers — créer un tracker
router.post('/', (req, res) => {
  const { nom, typeSignal, lat, lon, concerneId = 1 } = req.body;
  if (!nom || !typeSignal) {
    return res.status(400).json({ error: 'nom et typeSignal sont requis' });
  }
  const stmt = db.prepare(
    `INSERT INTO trackers (concerneId, nom, typeSignal, statut, lat, lon) VALUES (?,?,?, 'actif', ?, ?)`
  );
  const info = stmt.run(concerneId, nom, typeSignal, lat ?? 6.13, lon ?? 1.22);
  const created = db
    .prepare('SELECT * FROM trackers WHERE id = ?')
    .get(Number(info.lastInsertRowid));
  res.status(201).json(created);
});

// PUT /api/trackers/:id — mettre à jour (statut, position, nom...)
router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM trackers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Tracker introuvable' });

  const nom = req.body.nom ?? existing.nom;
  const typeSignal = req.body.typeSignal ?? existing.typeSignal;
  const statut = req.body.statut ?? existing.statut;
  const lat = req.body.lat ?? existing.lat;
  const lon = req.body.lon ?? existing.lon;

  db.prepare(
    `UPDATE trackers SET nom=?, typeSignal=?, statut=?, lat=?, lon=?, majLe=datetime('now') WHERE id=?`
  ).run(nom, typeSignal, statut, lat, lon, id);

  res.json(db.prepare('SELECT * FROM trackers WHERE id = ?').get(id));
});

// DELETE /api/trackers/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM trackers WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
