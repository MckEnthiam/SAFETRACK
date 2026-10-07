'use strict';
const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const { PasswordUpdateSchema, parseBody } = require('../schemas');

const router = express.Router();

// GET /api/me
router.get('/', (req, res) => {
  const user = db.prepare('SELECT id, nom, email, deuxFacteursActif, creeLe FROM concernes WHERE id = ?').get(req.userId);
  res.json(user);
});

// PATCH /api/me/password
router.patch('/password', (req, res) => {
  const data = parseBody(PasswordUpdateSchema, req.body, res);
  if (!data) return;

  const user = db.prepare('SELECT id, motDePasseHash, sel FROM concernes WHERE id = ?').get(req.userId);
  if (!user || user.motDePasseHash === 'LEGACY') {
    return res.status(403).json({ error: 'Opération non autorisée sur compte legacy' });
  }

  const hashToVerify = crypto.scryptSync(data.currentPassword, user.sel, 64).toString('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hashToVerify, 'hex'), Buffer.from(user.motDePasseHash, 'hex'))) {
    return res.status(403).json({ error: 'Mot de passe actuel incorrect' });
  }

  const newSalt = crypto.randomBytes(16).toString('hex');
  const newHash = crypto.scryptSync(data.newPassword, newSalt, 64).toString('hex');

  db.prepare('UPDATE concernes SET motDePasseHash = ?, sel = ? WHERE id = ?').run(newHash, newSalt, req.userId);
  // Révocation de toutes les sessions
  db.prepare('DELETE FROM sessions WHERE concerneId = ?').run(req.userId);
  res.clearCookie('sessionId');
  
  res.json({ ok: true });
});

// DELETE /api/me
router.delete('/', (req, res) => {
  db.prepare('DELETE FROM concernes WHERE id = ?').run(req.userId);
  res.clearCookie('sessionId');
  res.status(204).end();
});

// GET /api/me/sessions
router.get('/sessions', (req, res) => {
  const sessions = db.prepare('SELECT id, ip, userAgent, creeLe, expiresAt FROM sessions WHERE concerneId = ? ORDER BY creeLe DESC').all(req.userId);
  // Masquer l'ID de session complet pour la sécurité
  const safeSessions = sessions.map(s => ({
    ...s,
    id: s.id.substring(0, 8) + '...',
    isCurrent: s.id === req.sessionId
  }));
  res.json(safeSessions);
});

// DELETE /api/me/sessions
router.delete('/sessions', (req, res) => {
  // Supprimer toutes sauf la courante
  db.prepare('DELETE FROM sessions WHERE concerneId = ? AND id != ?').run(req.userId, req.sessionId);
  res.status(204).end();
});

module.exports = router;
