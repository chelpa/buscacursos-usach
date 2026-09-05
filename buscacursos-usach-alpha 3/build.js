#!/usr/bin/env node
// Genera index.html a partir de src/*.html + src/*.css + src/*.js +
// data/programs.json. Sin dependencias (sólo Node estándar) — sigue sin
// haber bundler ni framework acá, esto sólo une un puñado de archivos y
// reemplaza placeholders de texto. Ver README.md para el porqué de esta
// estructura (y por qué no Vite).
//
// Uso:
//   node build.js
//
// Qué hace:
//   1. Lee data/programs.json (el catálogo: label/semestre/secciones de
//      ambos programas — lo único que cambia cada semestre).
//   2. Lee las piezas de src/: head.html, shell.html, styles.css, app.js
//      y firmas.html (las tres firmas decorativas "chelpaHaze").
//   3. Arma el documento completo: head + <style>{styles.css}</style> +
//      shell (con cada <!--__FIRMA_X__--> reemplazado por su bloque de
//      firmas.html) + <script>{app.js}</script>.
//   4. Reemplaza __DATA__ (dentro de app.js) por el catálogo completo,
//      y __PROGRAMA__/__SEMESTRE__ (en head.html y shell.html) por el
//      label/semestre del programa 'ingeco' (el que se muestra por
//      defecto al cargar la página).
//   5. Valida que no haya quedado ningún placeholder sin reemplazar, ni
//      ninguna marca <!--__FIRMA_X__--> sin usar, y escribe index.html —
//      este es el único archivo que se publica en GitHub Pages, junto
//      con CNAME, og-image.png, etc.
//
// No editar index.html a mano — se pierde en el próximo build. Los
// cambios de diseño/lógica van en src/*; los cambios de catálogo
// (secciones/cupos/profesores nuevos cada semestre) van en
// data/programs.json.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const SRC = path.join(ROOT, 'src');
const DATA_PATH = path.join(ROOT, 'data', 'programs.json');
const SEED_PATH = path.join(ROOT, 'data', 'bitacora-seed-demo.json');
const OUT_PATH = path.join(ROOT, 'index.html');

// Build "dev" (con datos de ejemplo de Mi Bitácora) vs "prod" (vacío para
// alumnos reales): por defecto esto genera la build de producción — la
// semilla de demo sólo se embebe si se pide explícitamente con
// BC_DEMO_SEED=1, para no arriesgarse a que alguien la deje prendida por
// error en lo que se publica. Ver README.md, sección "Mi Bitácora".
const DEMO_SEED = process.env.BC_DEMO_SEED === '1';

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

function readSrc(name) {
  const p = path.join(SRC, name);
  if (!fs.existsSync(p)) fail(`No se encontró src/${name}`);
  return fs.readFileSync(p, 'utf8');
}

if (!fs.existsSync(DATA_PATH)) fail(`No se encontró ${DATA_PATH}`);

let programsRaw = fs.readFileSync(DATA_PATH, 'utf8');
let programs;
try {
  programs = JSON.parse(programsRaw);
} catch (e) {
  fail(`data/programs.json no es JSON válido: ${e.message}`);
}

// Validación mínima: que existan los dos programas esperados y que cada uno
// traiga label/semestre/sections — mejor fallar acá con un mensaje claro
// que generar un index.html roto y descubrirlo en el navegador.
['ingeco', 'economia'].forEach(key => {
  const p = programs[key];
  if (!p) fail(`data/programs.json no trae el programa "${key}"`);
  if (typeof p.label !== 'string' || !p.label) fail(`programs.${key}.label falta o no es texto`);
  if (typeof p.semestre !== 'string' || !p.semestre) fail(`programs.${key}.semestre falta o no es texto`);
  if (!Array.isArray(p.sections)) fail(`programs.${key}.sections no es un array`);
});

const programaDefault = programs.ingeco.label;
const semestreDefault = programs.ingeco.semestre;
const dataLiteral = JSON.stringify(programs);

// --- Leer las piezas fuente ---
const head = readSrc('head.html');
const styles = readSrc('styles.css');
const appJs = readSrc('app.js');
const shell = readSrc('shell.html');
const firmasRaw = readSrc('firmas.html');

// --- Partir firmas.html en sus 3 bloques, por los marcadores <!-- FIRMA:x --> ---
function extractFirma(name) {
  const re = new RegExp(`<!-- FIRMA:${name} -->\\n([\\s\\S]*?)<!-- /FIRMA:${name} -->\\n`);
  const m = firmasRaw.match(re);
  if (!m) fail(`src/firmas.html no tiene el bloque FIRMA:${name}`);
  return m[1];
}
const firmaFooter = extractFirma('footer');
const firmaNano = extractFirma('nano');
const firmaOriginal = extractFirma('original');

// --- Semilla de demo de "Mi Bitácora" (solo si BC_DEMO_SEED=1) ---
let bitacoraSeedBlock = '';
if (DEMO_SEED) {
  if (!fs.existsSync(SEED_PATH)) fail(`BC_DEMO_SEED=1 pero no se encontró ${SEED_PATH}`);
  let seedRaw = fs.readFileSync(SEED_PATH, 'utf8');
  let seedParsed;
  try {
    seedParsed = JSON.parse(seedRaw);
  } catch (e) {
    fail(`data/bitacora-seed-demo.json no es JSON válido: ${e.message}`);
  }
  // Se re-serializa (no se copia el texto crudo) para no arrastrar
  // comentarios/espacios raros y para fallar acá mismo si el JSON de la
  // semilla viniera mal formado, en vez de generar un index.html roto.
  bitacoraSeedBlock = '<script id="bc-bitacora-seed" type="application/json">\n'
    + JSON.stringify(seedParsed) + '\n</script>\n';
}

// --- Armar el documento completo ---
let output = head
  + '<style>\n' + styles + '</style>\n'
  + shell
      .replace('<!--__FIRMA_FOOTER__-->\n', firmaFooter)
      .replace('<!--__FIRMA_NANO__-->\n', firmaNano)
      .replace('<!--__FIRMA_ORIGINAL__-->\n', firmaOriginal)
      .replace('<!--__BITACORA_SEED__-->\n', bitacoraSeedBlock)
      .replace('<!--__APP_JS__-->\n', '<script>\n' + appJs + '</script>\n');

// --- Reemplazar placeholders de catálogo/programa ---
let dataReplacements = 0;
output = output.replace(/__DATA__/g, () => { dataReplacements++; return dataLiteral; });
let programaReplacements = 0;
output = output.replace(/__PROGRAMA__/g, () => { programaReplacements++; return programaDefault; });
let semestreReplacements = 0;
output = output.replace(/__SEMESTRE__/g, () => { semestreReplacements++; return semestreDefault; });

if (dataReplacements === 0) fail('app.js no tiene ningún __DATA__ — ¿se editó por error?');
if (programaReplacements === 0) fail('no quedó ningún __PROGRAMA__ en head.html/shell.html — ¿se editó por error?');
if (semestreReplacements === 0) fail('no quedó ningún __SEMESTRE__ en head.html/shell.html — ¿se editó por error?');

// Chequeo de seguridad: que no haya quedado ningún placeholder de texto ni
// ninguna marca de firma sin reemplazar (el bug que ya pasó una vez con
// __PROGRAMA__/__SEMESTRE__ sin reemplazar, ver bitácora del proyecto) —
// si algo quedó literal, mejor fallar el build que publicarlo así.
const leftoverPlaceholder = output.match(/__[A-Z_]+__/g);
if (leftoverPlaceholder) fail(`Quedaron placeholders sin reemplazar: ${[...new Set(leftoverPlaceholder)].join(', ')}`);
if (output.includes('<!--__BITACORA_SEED__-->')) {
  fail('Quedó la marca <!--__BITACORA_SEED__--> sin reemplazar en el output');
}
if (output.includes('<!--__FIRMA_') || output.includes('<!-- FIRMA:')) {
  fail('Quedó alguna marca de firma (<!--__FIRMA_X__--> o <!-- FIRMA:x -->) sin reemplazar en el output');
}

fs.writeFileSync(OUT_PATH, output, 'utf8');

console.log('✓ index.html generado');
console.log(`  ingeco:   ${programs.ingeco.sections.length} secciones · ${programaDefault} · ${semestreDefault}`);
console.log(`  economia: ${programs.economia.sections.length} secciones · ${programs.economia.label} · ${programs.economia.semestre}`);
console.log(`  __DATA__ reemplazado ${dataReplacements}×, __PROGRAMA__ ${programaReplacements}×, __SEMESTRE__ ${semestreReplacements}×`);
console.log(`  Mi Bitácora: ${DEMO_SEED ? 'con datos de ejemplo (BC_DEMO_SEED=1)' : 'vacía (build de producción)'}`);
console.log(`  ${(output.length / 1024).toFixed(0)} KB → ${OUT_PATH}`);
