// server.js — point d'entrée du backend SafeTrack.
// Lance l'API REST (préfixe /api) et sert aussi les fichiers statiques du
// frontend, pour que tout tourne avec une seule commande : npm start.
'use strict';

const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const crypto = require('node:crypto');

const db = require('./db');
const { LoginSchema, parseBody } = require('./schemas');
const { requireAuth } = require('./middleware/auth');

const trackersRouter = require('./routes/trackers');
const contactsRouter = require('./routes/contacts');
const alertsRouter = require('./routes/alerts');
const notificationsRouter = require('./routes/notifications');
const positionsRouter = require('./routes/positions');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Sécurité HTTP (helmet) ----
// content-security-policy assouplie pour permettre les polices et images locales
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
    },
  },
}));

app.use(cookieParser());
app.use(express.json({ limit: '32kb' }));

// ---- Rate Limiting ----
// Strict sur la route de connexion (anti-brute-force)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de tentatives. Réessayez dans 15 minutes.' },
});

// Général sur toute l'API
const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 min
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de requêtes. Réessayez dans une minute.' },
});

app.use('/api/', apiLimiter);

// ---- Auth Routes ----
app.post('/api/login', loginLimiter, (req, res) => {
  const data = parseBody(LoginSchema, req.body, res);
  if (!data) return;

  const user = db.prepare('SELECT id, motDePasseHash, sel FROM concernes WHERE email = ?').get(data.email);
  // Réponse générique pour éviter l'énumération des emails
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const hashToVerify = crypto.scryptSync(data.password, user.sel, 64).toString('hex');
  if (!crypto.timingSafeEqual(Buffer.from(hashToVerify, 'hex'), Buffer.from(user.motDePasseHash, 'hex'))) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE concernes SET sessionId = ? WHERE id = ?').run(sessionId, user.id);

  const isHttps = process.env.NODE_ENV === 'production';
  res.cookie('sessionId', sessionId, {
    httpOnly: true,
    sameSite: 'strict',
    secure: isHttps,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 jours
  });
  res.json({ ok: true, id: user.id });
});

app.post('/api/logout', requireAuth, (req, res) => {
  db.prepare('UPDATE concernes SET sessionId = NULL WHERE id = ?').run(req.userId);
  res.clearCookie('sessionId');
  res.json({ ok: true });
});

app.get('/api/me', requireAuth, (req, res) => {
  const user = db.prepare('SELECT id, nom, email, deuxFacteursActif, creeLe FROM concernes WHERE id = ?').get(req.userId);
  res.json(user);
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- API protégées ----
app.use('/api/trackers', requireAuth, trackersRouter);
app.use('/api/contacts', requireAuth, contactsRouter);
app.use('/api/alerts', requireAuth, alertsRouter);
app.use('/api/notifications', requireAuth, notificationsRouter);
app.use('/api/positions', requireAuth, positionsRouter);

// Statistiques agrégées pour le tableau de bord
app.get('/api/stats', requireAuth, (req, res) => {
  const trackersActifs = db
    .prepare(`SELECT COUNT(*) AS n FROM trackers WHERE statut = 'actif' AND concerneId = ?`)
    .get(req.userId).n;
  const contactsActifs = db
    .prepare(`SELECT COUNT(*) AS n FROM contacts_confiance WHERE statut = 'actif' AND concerneId = ?`)
    .get(req.userId).n;
  const alertes24h = db
    .prepare(
      `SELECT COUNT(*) AS n FROM alertes WHERE dateDebut >= datetime('now', '-1 day') AND concerneId = ?`
    )
    .get(req.userId).n;
  res.json({ trackersActifs, contactsActifs, alertes24h });
});

// ---- Frontend statique ----
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ---- Gestion d'erreurs centralisée ----
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[SafeTrack Error]', err.message || err);
  // Ne pas exposer la stack en production
  const message = process.env.NODE_ENV === 'production' ? 'Erreur serveur' : err.message;
  res.status(err.status || 500).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`SafeTrack backend prêt : http://localhost:${PORT}`);
});
