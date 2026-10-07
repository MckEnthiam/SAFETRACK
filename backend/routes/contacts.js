// routes/contacts.js — CRUD pour l'entité ContactConfiance
'use strict';

const express = require('express');
const db = require('../db');
const { CreateContactSchema, UpdateContactSchema, parseBody } = require('../schemas');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts_confiance WHERE concerneId = ? ORDER BY id DESC').all(req.userId));
});

router.post('/', (req, res) => {
  const data = parseBody(CreateContactSchema, req.body, res);
  if (!data) return;

  const info = db
    .prepare(
      `INSERT INTO contacts_confiance (concerneId, nom, telephone, statut) VALUES (?,?,?, 'en attente')`
    )
    .run(req.userId, data.nom, data.telephone);
  res.status(201).json(
    db.prepare('SELECT * FROM contacts_confiance WHERE id = ? AND concerneId = ?').get(Number(info.lastInsertRowid), req.userId)
  );
});

router.put('/:id', (req, res) => {
  const data = parseBody(UpdateContactSchema, req.body, res);
  if (!data) return;

  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM contacts_confiance WHERE id = ? AND concerneId = ?').get(id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Contact introuvable ou non autorisé' });

  const nom = data.nom ?? existing.nom;
  const telephone = data.telephone ?? existing.telephone;
  const statut = data.statut ?? existing.statut;

  db.prepare('UPDATE contacts_confiance SET nom=?, telephone=?, statut=? WHERE id=? AND concerneId=?').run(
    nom, telephone, statut, id, req.userId
  );
  res.json(db.prepare('SELECT * FROM contacts_confiance WHERE id = ? AND concerneId = ?').get(id, req.userId));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts_confiance WHERE id = ? AND concerneId = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

module.exports = router;
