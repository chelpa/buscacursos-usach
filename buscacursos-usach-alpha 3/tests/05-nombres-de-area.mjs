// El filtro de área debe mostrar nombres amigables (no códigos crudos
// como "ADM"/"FIN"), sin duplicados por grafía (FIN/FINANZAS,
// ECONOMIA/ECONOMÍA deben unificarse en una sola opción que matchee
// secciones de ambas).
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

const opts = await page.locator('#f-area option').allTextContents();
assert(opts.includes('Administración'), `falta "Administración" en el dropdown: ${JSON.stringify(opts)}`);
assert(opts.includes('Finanzas'), `falta "Finanzas" en el dropdown: ${JSON.stringify(opts)}`);
assert(!opts.some(o => o === 'Adm' || o === 'Fin'), `quedó un código crudo sin traducir: ${JSON.stringify(opts)}`);
const finEntries = opts.filter(o => o.toLowerCase().includes('financ') || o === 'Finanzas');
assert(finEntries.length === 1, `Finanzas debería aparecer una sola vez (FIN + FINANZAS unificados), salió: ${JSON.stringify(finEntries)}`);

await page.selectOption('#f-area', { label: 'Finanzas' });
await page.waitForTimeout(300);
const count = parseInt((await page.locator('#count-n').textContent()) || '0', 10);
assert(count > 0, 'filtrar por "Finanzas" debería traer resultados de ambas grafías (FIN y FINANZAS)');

const tagTexts = await page.locator('.tag.area').allTextContents();
assert(new Set(tagTexts).size <= 1 && tagTexts.every(t => t === 'Finanzas'),
  `las etiquetas de área de los resultados filtrados deberían decir "Finanzas": ${JSON.stringify([...new Set(tagTexts)])}`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log(`  nombres de área OK — ${opts.length} opciones, "Finanzas" trae ${count} secciones`);
