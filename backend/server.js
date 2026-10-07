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
const { requireAuth } = require('./middleware/auth');
const crypto = require('node:crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// ---- Auth Routes ----
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare('SELECT id, motDePasseHash, sel FROM concernes WHERE email = ?').get(email);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const hashToVerify = crypto.scryptSync(password, user.sel, 64).toString('hex');
  if (hashToVerify !== user.motDePasseHash) {
    return res.status(401).json({ error: 'Email ou mot de passe incorrect' });
  }

  const sessionId = crypto.randomBytes(32).toString('hex');
  db.prepare('UPDATE concernes SET sessionId = ? WHERE id = ?').run(sessionId, user.id);
  
  res.cookie('sessionId', sessionId, { httpOnly: true, sameSite: 'strict' });
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

// ---- API ----
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
