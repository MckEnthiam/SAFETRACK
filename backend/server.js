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
const authRouter = require('./routes/auth');
const meRouter = require('./routes/me');

const app = express();
const PORT = process.env.PORT || 3000;

// ---- Sécurité HTTP (helmet) ----
// content-security-policy assouplie pour permettre les polices et images locales
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      fontSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org"],
      connectSrc: ["'self'"],
      mediaSrc: ["'self'", "blob:"],
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
app.use('/api/auth', authRouter);
app.use('/api/me', requireAuth, meRouter);

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

const fs = require('fs');
const https = require('https');
const certPath = path.join(__dirname, 'cert.pem');
const keyPath = path.join(__dirname, 'key.pem');

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
  };
  https.createServer(options, app).listen(PORT, '0.0.0.0', () => {
    console.log(`SafeTrack backend prêt (HTTPS) : https://localhost:${PORT}`);
  });
} else {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SafeTrack backend prêt (HTTP) : http://localhost:${PORT}`);
  });
}
