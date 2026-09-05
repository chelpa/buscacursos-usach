#!/usr/bin/env node
// Corre todos los tests/NN-*.mjs contra el index.html generado por
// `node build.js` en la raíz del proyecto, en orden, y reporta un
// resumen. Sale con código 1 si algo falló.
//
// Uso:
//   node build.js && node tests/run-all.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const indexHtml = path.join(__dirname, '..', 'index.html');
if (!fs.existsSync(indexHtml)) {
  console.error('✗ No existe index.html en la raíz del proyecto — corré `node build.js` primero.');
  process.exit(1);
}

const testFiles = fs.readdirSync(__dirname)
  .filter(f => /^\d\d-.*\.mjs$/.test(f))
  .sort();

if (testFiles.length === 0) {
  console.error('✗ No se encontró ningún test (esperaba archivos tests/NN-*.mjs)');
  process.exit(1);
}

console.log(`Corriendo ${testFiles.length} tests contra ${indexHtml}\n`);

let passed = 0;
let failed = 0;
const failures = [];

for (const file of testFiles) {
  const full = path.join(__dirname, file);
  process.stdout.write(`▸ ${file} ... `);
  try {
    const { stdout, stderr } = await execFileAsync(process.execPath, [full], { timeout: 60000 });
    console.log('OK');
    if (stdout.trim()) console.log(stdout.trimEnd());
    if (stderr.trim()) console.log('  (stderr) ' + stderr.trim());
    passed++;
  } catch (e) {
    console.log('FALLÓ');
    const out = (e.stdout || '') + (e.stderr || e.message || '');
    console.log(out.split('\n').map(l => '  ' + l).join('\n'));
    failed++;
    failures.push(file);
  }
}

console.log('\n' + '-'.repeat(60));
console.log(`${passed}/${testFiles.length} tests OK`);
if (failed) {
  console.log(`Fallaron: ${failures.join(', ')}`);
  process.exit(1);
} else {
  console.log('Todo verde.');
}
