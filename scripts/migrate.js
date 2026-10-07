#!/usr/bin/env node
'use strict';
const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const dbPath = path.join(__dirname, '..', 'backend', 'safetrack.db');
const db = new DatabaseSync(dbPath);

db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY,
    applied_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
`);

const { version } = db.prepare('SELECT COALESCE(MAX(version), 0) as version FROM schema_version').get();

if (version < 1) {
  db.exec('BEGIN TRANSACTION;');
  
  // 1. Create new sessions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      concerneId INTEGER NOT NULL REFERENCES concernes(id) ON DELETE CASCADE,
      expiresAt TEXT NOT NULL,
      ip TEXT,
      userAgent TEXT,
      creeLe TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 2. Create outbox table for emails/sms
  db.exec(`
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      concerneId INTEGER REFERENCES concernes(id) ON DELETE CASCADE,
      type TEXT NOT NULL,
      destination TEXT NOT NULL,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      creeLe TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // 3. Mark existing users as legacy
  db.exec(`UPDATE concernes SET motDePasseHash = 'LEGACY', sel = 'LEGACY' WHERE email = 'gael.blimpo@safetrack.tg'`);

  db.exec(`INSERT INTO schema_version (version) VALUES (1);`);
  db.exec('COMMIT;');
  console.log('[migrate] V1 applied successfully.');
} else {
  console.log('[migrate] DB is up to date.');
}
