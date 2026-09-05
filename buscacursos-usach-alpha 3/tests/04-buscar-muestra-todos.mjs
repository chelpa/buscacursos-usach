// "Buscar" apretado sin nada escrito/filtrado debe mostrar todos los
// ramos (no la guía de bienvenida), y "Limpiar todo" debe vivir justo al
// lado de "Buscar" en el DOM.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

const rowIds = await page.evaluate(() => {
  const row = document.querySelector('.search-row');
  return [...row.children].map(c => c.id || c.className);
});
const iGoto = rowIds.indexOf('btn-goto-results');
const iClear = rowIds.indexOf('btn-clear-all');
assert(iGoto >= 0 && iClear === iGoto + 1,
  `"Limpiar todo" debería venir justo después de "Buscar" en el DOM, orden real: ${JSON.stringify(rowIds)}`);

await page.click('#btn-goto-results');
await page.waitForTimeout(400);
const cardsAfterBuscar = await page.locator('.course-card').count();
assert(cardsAfterBuscar > 0, 'Buscar sin filtros debería mostrar todos los ramos, no la guía');
assert(await page.locator('#btn-clear-all').isVisible(), 'Limpiar todo debería quedar visible tras "mostrar todos"');

await page.click('#btn-clear-all');
await page.waitForTimeout(400);
const cardsAfterClear = await page.locator('.course-card').count();
assert(cardsAfterClear === 0, `Limpiar todo debería volver a la guía (0 tarjetas), quedaron ${cardsAfterClear}`);

await page.fill('#q', '352401');
await page.waitForTimeout(300);
const cardsAfterTyping = await page.locator('.course-card').count();
assert(cardsAfterTyping > 0, 'una búsqueda real después de "mostrar todos" debería seguir funcionando');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Buscar→mostrar todos OK — orden de botones y flujo completo');
