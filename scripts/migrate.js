#!/usr/bin/env node
// scripts/migrate.js — Migration idempotente de la base SafeTrack.
// Ajoute les colonnes manquantes sans toucher aux données existantes.
// Sûr à exécuter plusieurs fois (vérifie l'existence avant d'agir).
'use strict';

if (process.env.NODE_ENV === 'production') {
  console.warn('[migrate] ATTENTION : exécution en production détectée. Continuez à vos risques.');
}

try { require('dotenv/config'); } catch (e) {}

const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const crypto = require('node:crypto');

const dbPath = process.env.DB_PATH
  ? path.resolve(process.env.DB_PATH)
  : path.join(__dirname, '..', 'backend', 'safetrack.db');

const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

let migrations = 0;

function columnExists(table, column) {
  const cols = db.prepare(`PRAGMA table_info(${table})`).all();
  return cols.some(c => c.name === column);
}

function tableExists(table) {
  return !!db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  ).get(table);
}

// ---- Migration 001 : ajout motDePasseHash, sel, sessionId sur concernes ----
if (tableExists('concernes')) {
  if (!columnExists('concernes', 'motDePasseHash')) {
    // Valeur temporaire requise (NOT NULL) — les utilisateurs existants devront
    // réinitialiser leur mot de passe via le back-office.
    db.exec(`ALTER TABLE concernes ADD COLUMN motDePasseHash TEXT NOT NULL DEFAULT ''`);
    console.log('[migrate] concernes.motDePasseHash ajoutée');
    migrations++;
  }
  if (!columnExists('concernes', 'sel')) {
    db.exec(`ALTER TABLE concernes ADD COLUMN sel TEXT NOT NULL DEFAULT ''`);
    console.log('[migrate] concernes.sel ajoutée');
    migrations++;
  }
  if (!columnExists('concernes', 'sessionId')) {
    db.exec(`ALTER TABLE concernes ADD COLUMN sessionId TEXT`);
    console.log('[migrate] concernes.sessionId ajoutée');
    migrations++;
  }

  // Générer sel+hash pour les utilisateurs sans hash (ex: données existantes)
  const usersWithoutHash = db.prepare(`SELECT id FROM concernes WHERE motDePasseHash = ''`).all();
  if (usersWithoutHash.length > 0) {
    const update = db.prepare(`UPDATE concernes SET motDePasseHash = ?, sel = ? WHERE id = ?`);
    // Mot de passe temporaire aléatoire — l'utilisateur devra le réinitialiser
    for (const u of usersWithoutHash) {
      const tempPass = crypto.randomBytes(12).toString('hex');
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.scryptSync(tempPass, salt, 64).toString('hex');
      update.run(hash, salt, u.id);
      console.log(`[migrate] Hash temporaire généré pour l'utilisateur ID ${u.id} (mot de passe inconnu — réinitialisation requise)`);
    }
    migrations++;
  }
}

// ---- Migration 002 : table positions — horodatage en TEXT ----
// (Déjà correct dans le schéma actuel, vérification défensive)
if (!tableExists('positions')) {
  console.log('[migrate] Table positions absente — laissée à db.js (CREATE IF NOT EXISTS)');
}

// ---- Fin ----
if (migrations === 0) {
  console.log('[migrate] Base à jour, aucune migration nécessaire.');
} else {
  console.log(`[migrate] ${migrations} migration(s) appliquée(s) avec succès.`);
}
