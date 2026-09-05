// Mi Bitácora: agregar un ramo al horario crea su bitácora vacía (sin
// duplicarla si el ramo se vuelve a agregar más adelante), y el formulario
// del overlay guarda una entrada nueva.
//
// Código usado (352401, "Matemáticas para la Administración y Economía I")
// deliberadamente NO es uno de los 2 ramos de la semilla de demo
// (data/bitacora-seed-demo.json, que precarga 352409 y 352406) — así este
// test da lo mismo si corre contra la build de dev (con datos de ejemplo)
// o la de prod (vacía); siempre debería partir en 0 entradas.
import { openPage, assert, assertEqual } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

// --- Buscar un ramo conocido y agregarlo a "Mi horario" ---
await page.fill('#q', '352401');
await page.waitForTimeout(300);
const addBtn = page.locator('.add-btn').first();
await addBtn.click();
await page.waitForTimeout(200);

// --- Abrir Mi Bitácora: el ramo recién agregado ya tiene su tarjeta, vacía ---
await page.click('#bitacora-toggle');
await page.waitForTimeout(200);
assert(await page.locator('#bitacora-overlay').isVisible(), 'el overlay debería abrirse');

const courseCard = page.locator('.bitacora-course-card[data-codigo="352401"]');
assert(await courseCard.count() === 1, 'debería aparecer una tarjeta para el ramo recién agregado');
assert((await courseCard.innerText()).includes('0 entradas'), 'debería partir con 0 entradas');
await courseCard.click();
await page.waitForTimeout(150);

// --- Agregar una entrada tipo "duda" ---
await page.selectOption('#bit-f-tipo', 'duda');
await page.fill('#bit-f-contenido', 'Duda de prueba: ¿cómo se relaciona esto con la Malla?');
await page.click('#bit-f-submit');
await page.waitForTimeout(200);

const entries = page.locator('.bitacora-entry');
assertEqual(await entries.count(), 1, 'cantidad de entradas tras agregar una');
assert((await entries.first().innerText()).includes('Duda pendiente'), 'la entrada debería mostrar su tipo');
assert((await page.locator('#bitacora-detail-meta').innerText()).includes('1 entrada'), 'el contador de arriba debería actualizarse');

// El botón "Marcar como resuelta" debe existir para una duda y funcionar.
const stateBtn = page.locator('.bitacora-entry-state').first();
assert(await stateBtn.count() === 1, 'una duda debería tener botón de marcar resuelta');
await stateBtn.click();
await page.waitForTimeout(150);
assert((await stateBtn.innerText()).includes('Resuelta'), 'debería quedar marcada como resuelta al hacer clic');

await page.click('#bitacora-close');
await page.waitForTimeout(150);

// --- Quitar el ramo del horario y volver a agregarlo: no debe duplicar
//     la bitácora ni perder la entrada ya escrita ---
await addBtn.click(); // quita de "Mi horario" (toggle)
await page.waitForTimeout(150);
await addBtn.click(); // lo vuelve a agregar
await page.waitForTimeout(150);

await page.click('#bitacora-toggle');
await page.waitForTimeout(200);
const cardsAfter = page.locator('.bitacora-course-card[data-codigo="352401"]');
assertEqual(await cardsAfter.count(), 1, 'no debería duplicarse la tarjeta del ramo al volver a agregarlo');
await cardsAfter.click();
await page.waitForTimeout(150);
assertEqual(await page.locator('.bitacora-entry').count(), 1, 'la entrada escrita antes no debería perderse ni duplicarse');
assert((await page.locator('.bitacora-entry-state').first().innerText()).includes('Resuelta'), 'el estado "resuelta" debería seguir guardado');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Mi Bitácora OK — se crea sola, sin duplicarse al re-agregar el ramo, y el formulario guarda entradas');
