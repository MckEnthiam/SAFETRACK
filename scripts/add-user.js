#!/usr/bin/env node
const crypto = require('node:crypto');
const db = require('../backend/db.js');

const email = 'testjoe@app.com';
const password = 'modepasse1';
const salt = crypto.randomBytes(16).toString('hex');
const hash = crypto.scryptSync(password, salt, 64).toString('hex');

const existingUser = db.prepare('SELECT id FROM concernes WHERE email = ?').get(email);

if (existingUser) {
  console.log('User already exists, updating password.');
  db.prepare('UPDATE concernes SET motDePasseHash = ?, sel = ? WHERE email = ?').run(hash, salt, email);
} else {
  console.log('Inserting new user.');
  db.prepare(
    `INSERT INTO concernes (nom, email, motDePasseHash, sel, deuxFacteursActif) VALUES (?, ?, ?, ?, ?)`
  ).run('Test Joe', email, hash, salt, 1);
}

console.log('Done.');
