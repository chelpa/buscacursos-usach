// "Limpiar todo" sólo debe estar visible cuando hay algún filtro/búsqueda
// activo (texto, nivel, área, obligatorios/electivos, horario libre) —
// oculto en cualquier otro momento, y volver a ocultarse al usarlo.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();
const btn = page.locator('#btn-clear-all');

assert(await btn.isHidden(), 'debería estar oculto al cargar la página');

await page.fill('#q', '352401');
await page.waitForTimeout(250);
assert(await btn.isVisible(), 'debería aparecer al escribir una búsqueda');

await page.fill('#q', '');
await page.waitForTimeout(250);
assert(await btn.isHidden(), 'debería ocultarse al borrar la búsqueda (sin otros filtros)');

await page.selectOption('#f-nivel', { index: 1 });
await page.waitForTimeout(200);
assert(await btn.isVisible(), 'debería aparecer al aplicar un filtro de nivel');

await page.click('#btn-clear-all');
await page.waitForTimeout(200);
assert(await btn.isHidden(), 'debería ocultarse después de hacer clic en sí mismo');
const nivelAfterClear = await page.inputValue('#f-nivel');
assert(nivelAfterClear === '', `el filtro de nivel debería resetearse, quedó "${nivelAfterClear}"`);

await page.click('#f-elect button[data-v="1"]');
await page.waitForTimeout(200);
assert(await btn.isVisible(), 'debería aparecer al marcar Electivos');
await page.click('#f-elect button[data-v="1"]');
await page.waitForTimeout(200);
assert(await btn.isHidden(), 'debería ocultarse al desmarcar Electivos');

await page.click('.grid-picker .cell');
await page.waitForTimeout(200);
assert(await btn.isVisible(), 'debería aparecer al marcar un bloque de horario libre');
await page.click('#clear-picker');
await page.waitForTimeout(200);
assert(await btn.isHidden(), 'debería ocultarse al limpiar el picker de horario');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Limpiar todo OK — visibilidad sincronizada con los 4 tipos de filtro');
