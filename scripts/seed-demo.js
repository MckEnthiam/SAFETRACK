#!/usr/bin/env node
// scripts/seed-demo.js — Injecte des données de démonstration dans la base.
// Exécution MANUELLE uniquement : node scripts/seed-demo.js
// Ne jamais appeler automatiquement en production (C4-05).

'use strict';

if (process.env.NODE_ENV === 'production') {
  console.error('[seed-demo] Refus : NODE_ENV=production. Ce script est réservé au développement.');
  process.exit(1);
}

// Le chemin de la base peut être surchargé par DB_PATH
try { require('dotenv/config'); } catch(e) {} // ignoré si dotenv n'est pas installé
const path = require('node:path');
const db = require('../backend/db.js');

const { count } = db.prepare('SELECT COUNT(*) AS count FROM concernes').get();

if (count > 0) {
  console.log(`[seed-demo] La base contient déjà ${count} utilisateur(s). Abandon.`);
  process.exit(0);
}

const crypto = require('node:crypto');

const password = 'demo';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');

const insertUser = db.prepare(
  `INSERT INTO concernes (nom, email, motDePasseHash, sel, deuxFacteursActif) VALUES (?, ?, ?, ?, ?)`
);
const userId = Number(
  insertUser.run('Gaël Blimpo', 'gael.blimpo@safetrack.tg', hash, salt, 1).lastInsertRowid
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
  ['Soeur — Ama', '+228 92 77 88 99', 'en attente'],
].map((c) => Number(insertContact.run(userId, ...c).lastInsertRowid));

const insertNotif = db.prepare(
  `INSERT INTO notifications (contactId, type, canal, statut) VALUES (?,?,?,?)`
);
insertNotif.run(contactIds[0], 'Push', 'App', 'accusée');
insertNotif.run(contactIds[1], 'SMS', 'GSM', 'envoyée');

const insertPos = db.prepare(
  `INSERT INTO positions (trackerId, lat, lon, precisionM, horodatage) VALUES (?,?,?,?,datetime('now'))`
);
[
  [6.1319, 1.2228, 4],
  [6.1301, 1.2214, 6],
  [6.1284, 1.2190, 5],
  [6.1256, 1.2298, 8],
].forEach(([lat, lon, prec]) => {
  insertPos.run(trackerIds[0], lat, lon, prec);
});

console.log('[seed-demo] Données de démonstration injectées (utilisateur ID', userId, ').');
console.log('[seed-demo] Email: gael.blimpo@safetrack.tg | Mot de passe: demo');
