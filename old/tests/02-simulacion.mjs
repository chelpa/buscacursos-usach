// Fix histórico: arrancar la Simulación sin haber buscado nada antes no
// debe dejar la guía de bienvenida — debe mostrar los ramos del primer
// nivel ya desbloqueados. (render() no consideraba simMode en
// noFiltersActive.)
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

await page.click('#sim-toggle');
await page.waitForTimeout(300);
await page.click('#sim-setup-overlay >> text=Comenzar simulación');
await page.waitForTimeout(600);

const cardCount = await page.locator('.course-card').count();
assert(cardCount > 0, `la Simulación no mostró ramos (course-card count = ${cardCount})`);

const simStatusVisible = await page.locator('#sim-status-bar').isVisible().catch(() => false);
assert(simStatusVisible, 'la barra de estado de Simulación no quedó visible');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log(`  simulación OK — ${cardCount} ramos visibles al arrancar`);
