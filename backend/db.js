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

// ---- Données de démonstration extraites vers scripts/seed-demo.js ----

module.exports = db;
