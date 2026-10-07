// routes/trackers.js — CRUD pour l'entité TrackerObjet
'use strict';

const express = require('express');
const db = require('../db');
const { CreateTrackerSchema, UpdateTrackerSchema, parseBody } = require('../schemas');

const router = express.Router();

// GET /api/trackers — liste tous les trackers
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM trackers WHERE concerneId = ? ORDER BY id DESC').all(req.userId);
  res.json(rows);
});

// POST /api/trackers — créer un tracker
router.post('/', (req, res) => {
  const data = parseBody(CreateTrackerSchema, req.body, res);
  if (!data) return;

  const stmt = db.prepare(
    `INSERT INTO trackers (concerneId, nom, typeSignal, statut, lat, lon) VALUES (?,?,?, 'actif', ?, ?)`
  );
  const info = stmt.run(req.userId, data.nom, data.typeSignal, data.lat, data.lon);
  const created = db
    .prepare('SELECT * FROM trackers WHERE id = ? AND concerneId = ?')
    .get(Number(info.lastInsertRowid), req.userId);
  res.status(201).json(created);
});

// PUT /api/trackers/:id — mettre à jour (statut, position, nom...)
router.put('/:id', (req, res) => {
  const data = parseBody(UpdateTrackerSchema, req.body, res);
  if (!data) return;

  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM trackers WHERE id = ? AND concerneId = ?').get(id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Tracker introuvable ou non autorisé' });

  const nom = data.nom ?? existing.nom;
  const typeSignal = data.typeSignal ?? existing.typeSignal;
  const statut = data.statut ?? existing.statut;
  const lat = data.lat ?? existing.lat;
  const lon = data.lon ?? existing.lon;

  db.prepare(
    `UPDATE trackers SET nom=?, typeSignal=?, statut=?, lat=?, lon=?, majLe=datetime('now') WHERE id=? AND concerneId=?`
  ).run(nom, typeSignal, statut, lat, lon, id, req.userId);

  res.json(db.prepare('SELECT * FROM trackers WHERE id = ? AND concerneId = ?').get(id, req.userId));
});

// DELETE /api/trackers/:id
router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM trackers WHERE id = ? AND concerneId = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

module.exports = router;
