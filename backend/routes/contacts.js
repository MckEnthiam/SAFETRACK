// routes/contacts.js — CRUD pour l'entité ContactConfiance
const express = require('express');
const db = require('../db');

const router = express.Router();

router.get('/', (req, res) => {
  res.json(db.prepare('SELECT * FROM contacts_confiance ORDER BY id DESC').all());
});

router.post('/', (req, res) => {
  const { nom, telephone, concerneId = 1 } = req.body;
  if (!nom || !telephone) {
    return res.status(400).json({ error: 'nom et telephone sont requis' });
  }
  const info = db
    .prepare(
      `INSERT INTO contacts_confiance (concerneId, nom, telephone, statut) VALUES (?,?,?, 'en attente')`
    )
    .run(concerneId, nom, telephone);
  res.status(201).json(
    db.prepare('SELECT * FROM contacts_confiance WHERE id = ?').get(Number(info.lastInsertRowid))
  );
});

router.put('/:id', (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM contacts_confiance WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Contact introuvable' });

  const nom = req.body.nom ?? existing.nom;
  const telephone = req.body.telephone ?? existing.telephone;
  const statut = req.body.statut ?? existing.statut;

  db.prepare('UPDATE contacts_confiance SET nom=?, telephone=?, statut=? WHERE id=?').run(
    nom,
    telephone,
    statut,
    id
  );
  res.json(db.prepare('SELECT * FROM contacts_confiance WHERE id = ?').get(id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM contacts_confiance WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

module.exports = router;
