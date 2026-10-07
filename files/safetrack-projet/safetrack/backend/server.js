// server.js — point d'entrée du backend SafeTrack.
// Lance l'API REST (préfixe /api) et sert aussi les fichiers statiques du
// frontend, pour que tout tourne avec une seule commande : npm start.
const path = require('path');
const express = require('express');
const db = require('./db');

const trackersRouter = require('./routes/trackers');
const contactsRouter = require('./routes/contacts');
const alertsRouter = require('./routes/alerts');
const notificationsRouter = require('./routes/notifications');
const positionsRouter = require('./routes/positions');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---- API ----
app.use('/api/trackers', trackersRouter);
app.use('/api/contacts', contactsRouter);
app.use('/api/alerts', alertsRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/positions', positionsRouter);

// Statistiques agrégées pour le tableau de bord
app.get('/api/stats', (req, res) => {
  const trackersActifs = db
    .prepare(`SELECT COUNT(*) AS n FROM trackers WHERE statut = 'actif'`)
    .get().n;
  const contactsActifs = db
    .prepare(`SELECT COUNT(*) AS n FROM contacts_confiance WHERE statut = 'actif'`)
    .get().n;
  const alertes24h = db
    .prepare(
      `SELECT COUNT(*) AS n FROM alertes WHERE dateDebut >= datetime('now', '-1 day')`
    )
    .get().n;
  res.json({ trackersActifs, contactsActifs, alertes24h });
});

app.get('/api/health', (req, res) => res.json({ ok: true }));

// ---- Frontend statique ----
const frontendPath = path.join(__dirname, '..', 'frontend');
app.use(express.static(frontendPath));
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// ---- Gestion d'erreurs simple ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Erreur serveur' });
});

app.listen(PORT, () => {
  console.log(`SafeTrack backend prêt : http://localhost:${PORT}`);
});
