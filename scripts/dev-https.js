#!/usr/bin/env node
'use strict';
const selfsigned = require('selfsigned');
const fs = require('fs');
const path = require('path');
const https = require('https');

async function main() {
  const attrs = [{ name: 'commonName', value: 'localhost' }];
  const pems = await selfsigned.generate(attrs, { days: 30 });

  const certPath = path.join(__dirname, '..', 'backend', 'cert.pem');
  const keyPath = path.join(__dirname, '..', 'backend', 'key.pem');

  fs.writeFileSync(certPath, pems.cert);
  fs.writeFileSync(keyPath, pems.private || pems.key);

  console.log('✅ Certificats auto-signés générés pour le développement local HTTPS.');

  const { spawn } = require('child_process');
  process.env.HTTPS = 'true';
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

  const child = spawn('npm', ['run', 'dev'], { stdio: 'inherit', shell: true });
  child.on('close', code => process.exit(code));
}

main().catch(console.error);
