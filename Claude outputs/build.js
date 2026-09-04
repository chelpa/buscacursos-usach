#!/usr/bin/env node
// Genera index.html a partir de template.html + data/programs.json.
// Sin dependencias (sólo Node estándar) — no hay bundler ni framework acá,
// esto sólo reemplaza un puñado de placeholders de texto.
//
// Uso:
//   node build.js
//
// Qué hace:
//   1. Lee data/programs.json (el catálogo: label/semestre/secciones de
//      ambos programas, lo único que cambia cada semestre).
//   2. Lee template.html (HTML + CSS + JS del sitio, con los placeholders
//      __DATA__, __PROGRAMA__ y __SEMESTRE__).
//   3. Reemplaza __DATA__ por el JSON completo (se inyecta como literal de
//      JS: `const PROGRAMS = __DATA__;` en template.html se vuelve
//      `const PROGRAMS = {...};` en index.html).
//   4. Reemplaza __PROGRAMA__/__SEMESTRE__ por el label/semestre del
//      programa 'ingeco' (el que se muestra por defecto al cargar la
//      página) — se usan en los meta tags OG/Twitter, el topbar y el pie
//      de página.
//   5. Escribe index.html — este es el único archivo que se publica en
//      GitHub Pages, junto con CNAME y los assets sueltos (SVGs, etc.).
//
// No editar index.html a mano — se pierde en el próximo build. Los cambios
// de diseño o de lógica van en template.html; los cambios de catálogo
// (secciones/cupos/profesores nuevos cada semestre) van en
// data/programs.json.

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const TEMPLATE_PATH = path.join(ROOT, 'template.html');
const DATA_PATH = path.join(ROOT, 'data', 'programs.json');
const OUT_PATH = path.join(ROOT, 'index.html');

function fail(msg) {
  console.error('✗ ' + msg);
  process.exit(1);
}

if (!fs.existsSync(TEMPLATE_PATH)) fail(`No se encontró ${TEMPLATE_PATH}`);
if (!fs.existsSync(DATA_PATH)) fail(`No se encontró ${DATA_PATH}`);

let template = fs.readFileSync(TEMPLATE_PATH, 'utf8');

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

// JSON.stringify simple: no hace falta escapar </script> a mano porque
// programs.json no trae texto libre de usuario, sólo datos de catálogo
// (códigos, nombres de ramo, profesores) — mismo supuesto que ya usaba el
// esquema anterior de placeholders separados.
const dataLiteral = JSON.stringify(programs);

let output = template;
let dataReplacements = 0;
output = output.replace(/__DATA__/g, () => { dataReplacements++; return dataLiteral; });
let programaReplacements = 0;
output = output.replace(/__PROGRAMA__/g, () => { programaReplacements++; return programaDefault; });
let semestreReplacements = 0;
output = output.replace(/__SEMESTRE__/g, () => { semestreReplacements++; return semestreDefault; });

if (dataReplacements === 0) fail('template.html no tiene ningún __DATA__ — ¿se editó por error?');
if (programaReplacements === 0) fail('template.html no tiene ningún __PROGRAMA__ — ¿se editó por error?');
if (semestreReplacements === 0) fail('template.html no tiene ningún __SEMESTRE__ — ¿se editó por error?');

// Chequeo de seguridad: que no haya quedado ningún placeholder sin
// reemplazar (el bug que ya pasó una vez con __PROGRAMA__/__SEMESTRE__, ver
// bitácora del proyecto) — si algo quedó literal, mejor fallar el build que
// publicarlo así.
const leftover = output.match(/__[A-Z_]+__/g);
if (leftover) fail(`Quedaron placeholders sin reemplazar: ${[...new Set(leftover)].join(', ')}`);

fs.writeFileSync(OUT_PATH, output, 'utf8');

console.log('✓ index.html generado');
console.log(`  ingeco:   ${programs.ingeco.sections.length} secciones · ${programaDefault} · ${semestreDefault}`);
console.log(`  economia: ${programs.economia.sections.length} secciones · ${programs.economia.label} · ${programs.economia.semestre}`);
console.log(`  __DATA__ reemplazado ${dataReplacements}×, __PROGRAMA__ ${programaReplacements}×, __SEMESTRE__ ${semestreReplacements}×`);
console.log(`  ${(output.length / 1024).toFixed(0)} KB → ${OUT_PATH}`);
