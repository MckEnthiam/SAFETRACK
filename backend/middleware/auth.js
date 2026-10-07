const db = require('../db');

function requireAuth(req, res, next) {
  let sessionId = null;

  // Récupération depuis le header Authorization (Bearer <token>)
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    sessionId = authHeader.substring(7);
  }

  // Si pas de header, on cherche dans les cookies (pour le front web)
  if (!sessionId && req.headers.cookie) {
    const cookies = req.headers.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'sessionId') {
        sessionId = value;
        break;
      }
    }
  }

  if (!sessionId) {
    return res.status(401).json({ error: 'Non authentifié' });
  }

  const user = db.prepare('SELECT id FROM concernes WHERE sessionId = ?').get(sessionId);

  if (!user) {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }

  req.userId = user.id;
  next();
}

module.exports = { requireAuth };
