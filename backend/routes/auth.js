'use strict';
const express = require('express');
const crypto = require('node:crypto');
const db = require('../db');
const { LoginSchema, RegisterSchema, PasswordUpdateSchema, parseBody } = require('../schemas');
const { requireAuth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// POST /api/auth/register
router.post('/register', loginLimiter, (req, res) => {
  const data = parseBody(RegisterSchema, req.body, res);
  if (!data) return;

  const existing = db.prepare('SELECT id FROM concernes WHERE email = ?').get(data.email);
  if (existing) {
    // Avoid user enumeration
    return res.status(400).json({ error: 'Email indisponible' });
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(data.password, salt, 64).toString('hex');

  const info = db.prepare(
    'INSERT INTO concernes (nom, email, motDePasseHash, sel) VALUES (?, ?, ?, ?)'
  ).run(data.nom, data.email, hash, salt);

  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (id, concerneId, expiresAt, ip, userAgent) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, info.lastInsertRowid, expiresAt, req.ip, req.get('user-agent') || null);

  const isHttps = process.env.NODE_ENV === 'production';
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({ ok: true, id: info.lastInsertRowid });
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
  const data = parseBody(LoginSchema, req.body, res);
  if (!data) return;

  const user = db.prepare('SELECT id, motDePasseHash, sel FROM concernes WHERE email = ?').get(data.email);
  if (!user || user.motDePasseHash === 'LEGACY') {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const hashToVerify = crypto.scryptSync(data.password, user.sel, 64).toString('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hashToVerify, 'hex'), Buffer.from(user.motDePasseHash, 'hex'))) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    'INSERT INTO sessions (id, concerneId, expiresAt, ip, userAgent) VALUES (?, ?, ?, ?, ?)'
  ).run(sessionId, user.id, expiresAt, req.ip, req.get('user-agent') || null);

  const isHttps = process.env.NODE_ENV === 'production';
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  
  res.json({ ok: true, id: user.id });
});

// POST /api/auth/logout
router.post('/logout', requireAuth, (req, res) => {
  if (req.sessionId) {
    db.prepare('DELETE FROM sessions WHERE id = ?').run(req.sessionId);
  }
  res.clearCookie('sessionId');
  res.json({ ok: true });
});

module.exports = router;
