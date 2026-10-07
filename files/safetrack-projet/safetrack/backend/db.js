// db.js — Connexion et initialisation de la base de données SafeTrack.
// Utilise le module natif node:sqlite (inclus dans Node.js >= 22, aucune
// dépendance native à compiler). La base est stockée dans un seul fichier
// backend/safetrack.db qui est créé automatiquement au premier démarrage.

const { DatabaseSync } = require('node:sqlite');
const path = require('path');

const DB_PATH = path.join(__dirname, 'safetrack.db');
const db = new DatabaseSync(DB_PATH);

db.exec(`
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS concernes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nom TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    deuxFacteursActif INTEGER NOT NULL DEFAULT 1,
    creeLe TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trackers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concerneId INTEGER NOT NULL REFERENCES concernes(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    typeSignal TEXT NOT NULL CHECK (typeSignal IN ('GPS','Bluetooth')),
    statut TEXT NOT NULL DEFAULT 'actif' CHECK (statut IN ('actif','inactif')),
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    majLe TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS contacts_confiance (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concerneId INTEGER NOT NULL REFERENCES concernes(id) ON DELETE CASCADE,
    nom TEXT NOT NULL,
    telephone TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'en attente' CHECK (statut IN ('actif','en attente','révoqué')),
    creeLe TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS alertes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    concerneId INTEGER NOT NULL REFERENCES concernes(id) ON DELETE CASCADE,
    trackerId INTEGER REFERENCES trackers(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('SOS','Chute','Sortie de zone')),
    mode TEXT NOT NULL DEFAULT 'Manuel' CHECK (mode IN ('Manuel','Automatique')),
    dateDebut TEXT NOT NULL DEFAULT (datetime('now')),
    dateFin TEXT
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    alerteId INTEGER REFERENCES alertes(id) ON DELETE CASCADE,
    contactId INTEGER REFERENCES contacts_confiance(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('SMS','Appel','Push','Email')),
    canal TEXT NOT NULL,
    statut TEXT NOT NULL DEFAULT 'envoyée' CHECK (statut IN ('envoyée','accusée','échouée')),
    envoyeLe TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS positions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    trackerId INTEGER NOT NULL REFERENCES trackers(id) ON DELETE CASCADE,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    precisionM REAL NOT NULL DEFAULT 5,
    horodatage TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

// ---- Données de démonstration (une seule fois, si la base est vide) ----
const { count } = db.prepare('SELECT COUNT(*) AS count FROM concernes').get();

if (count === 0) {
  const insertUser = db.prepare(
    `INSERT INTO concernes (nom, email, deuxFacteursActif) VALUES (?, ?, 1)`
  );
  const userId = Number(
    insertUser.run('Gaël Blimpo', 'gael.blimpo@safetrack.tg').lastInsertRowid
  );

  const insertTracker = db.prepare(
    `INSERT INTO trackers (concerneId, nom, typeSignal, statut, lat, lon) VALUES (?,?,?,?,?,?)`
  );
  const trackers = [
    ['Sac de Gaël', 'Bluetooth', 'actif', 6.1319, 1.2228],
    ['Moto CBS 125', 'GPS', 'actif', 6.1402, 1.2151],
    ['Mallette pro', 'GPS', 'actif', 6.1256, 1.2298],
    ['Vélo enfant', 'Bluetooth', 'inactif', 6.1290, 1.2205],
  ];
  const trackerIds = trackers.map(
    (t) => Number(insertTracker.run(userId, ...t).lastInsertRowid)
  );

  const insertContact = db.prepare(
    `INSERT INTO contacts_confiance (concerneId, nom, telephone, statut) VALUES (?,?,?,?)`
  );
  const contactIds = [
    ['Adjoa K.', '+228 90 11 22 33', 'actif'],
    ['Kokou M.', '+228 91 44 55 66', 'actif'],
    ['Sœur — Ama', '+228 92 77 88 99', 'en attente'],
  ].map((c) => Number(insertContact.run(userId, ...c).lastInsertRowid));

  const insertNotif = db.prepare(
    `INSERT INTO notifications (contactId, type, canal, statut) VALUES (?,?,?,?)`
  );
  insertNotif.run(contactIds[0], 'Push', 'App', 'accusée');
  insertNotif.run(contactIds[1], 'SMS', 'GSM', 'envoyée');

  const insertPos = db.prepare(
    `INSERT INTO positions (trackerId, lat, lon, precisionM, horodatage) VALUES (?,?,?,?,?)`
  );
  [
    [6.1319, 1.2228, 4, '07:52'],
    [6.1301, 1.2214, 6, '07:31'],
    [6.1284, 1.2190, 5, '07:02'],
    [6.1256, 1.2298, 8, '06:40'],
  ].forEach(([lat, lon, prec, time]) => {
    insertPos.run(trackerIds[0], lat, lon, prec, time);
  });

  console.log('Base de données initialisée avec les données de démonstration.');
}

module.exports = db;
