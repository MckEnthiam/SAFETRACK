#!/usr/bin/env node
// scripts/gen-env.js — Génère un fichier .env local avec des secrets aléatoires.
// N'écrase JAMAIS un .env existant.
// Usage : node scripts/gen-env.js

'use strict';
const { randomBytes } = require('node:crypto');
const { existsSync, writeFileSync, readFileSync } = require('node:fs');
const path = require('node:path');

const envPath = path.join(__dirname, '..', '.env');

if (existsSync(envPath)) {
  console.error('[gen-env] .env existe déjà — abandon (on ne l\'écrase pas).');
  process.exit(0);
}

const examplePath = path.join(__dirname, '..', '.env.example');
if (!existsSync(examplePath)) {
  console.error('[gen-env] .env.example introuvable.');
  process.exit(1);
}

const template = readFileSync(examplePath, 'utf8');

const sessionSecret = randomBytes(32).toString('hex');
const dataKey = randomBytes(32).toString('hex');

let result = template
  .replace(/^SESSION_SECRET=$/m, `SESSION_SECRET=${sessionSecret}`)
  .replace(/^DATA_ENCRYPTION_KEY=$/m, `DATA_ENCRYPTION_KEY=${dataKey}`);

writeFileSync(envPath, result, { encoding: 'utf8', mode: 0o600 });
console.log('[gen-env] .env créé avec succès. Secrets générés aléatoirement.');
console.log('[gen-env] Ne commitez jamais ce fichier.');
