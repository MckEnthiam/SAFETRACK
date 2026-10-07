// routes/contacts.js — CRUD pour l'entité ContactConfiance
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts_confiance WHERE concerneId = ? ORDER BY id DESC').all(req.userId));
});

router.post('/', (req, res) => {
  const { nom, telephone } = req.body;
  if (!nom || !telephone) {
    return res.status(400).json({ error: 'nom et telephone sont requis' });
  }
  const info = db
    .prepare(
      `INSERT INTO contacts_confiance (concerneId, nom, telephone, statut) VALUES (?,?,?, 'en attente')`
    )
    .run(req.userId, nom, telephone);
  res.status(201).json(
    db.prepare('SELECT * FROM contacts_confiance WHERE id = ? AND concerneId = ?').get(Number(info.lastInsertRowid), req.userId)
  );
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM contacts_confiance WHERE id = ? AND concerneId = ?').get(id, req.userId);
  if (!existing) return res.status(404).json({ error: 'Contact introuvable ou non autorisé' });

  const nom = req.body.nom ?? existing.nom;
  const telephone = req.body.telephone ?? existing.telephone;
  const statut = req.body.statut ?? existing.statut;

  db.prepare('UPDATE contacts_confiance SET nom=?, telephone=?, statut=? WHERE id=? AND concerneId=?').run(
    nom,
    telephone,
    statut,
    id,
    req.userId
  );
  res.json(db.prepare('SELECT * FROM contacts_confiance WHERE id = ? AND concerneId = ?').get(id, req.userId));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts_confiance WHERE id = ? AND concerneId = ?').run(req.params.id, req.userId);
  res.status(204).end();
});

module.exports = router;
