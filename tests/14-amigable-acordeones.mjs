// El usuario mandó capturas de "modo amigable" (🎀, el tema rosado —
// "versión moño", como él lo llama por el emoji) donde vio "Filtrar por
// horario libre" ya colapsado pero "Mi Horario" abierto de par en par, y
// la guía "Cómo usar este buscador" ocupando media pantalla. Pidió que
// los DOS menús queden como acordeón sin desplegar por defecto, que "Mi
// horario" se abra al apretar la pestaña "Horario semanal" o "Calendario
// de pruebas" (y se cierre con la flecha), y que la guía viva como un
// botón chico de una sola línea justo debajo de la barra de búsqueda,
// desplegándose ahí mismo. Todo esto es exclusivo de modo amigable — en
// los demás temas nada de esto cambia (confirmado por el resto de la
// suite, que corre en el tema por defecto y sigue en verde).
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage({ viewport: { width: 390, height: 844 } });

await page.click('#amigable-toggle');
await page.waitForTimeout(300);

// La guía debe verse como botón chico justo debajo de la barra de
// búsqueda desde el primer momento (incluso sin haber buscado nada
// todavía) — no como la tarjeta grande de siempre.
const guideVisible = await page.locator('#guide-slot-topbar #bottom-guide-wrap').isVisible();
assert(guideVisible, 'la guía debería verse como botón debajo de la barra de búsqueda en modo amigable, incluso sin haber buscado nada');
const guideOpenBefore = await page.locator('#guide-panel').getAttribute('data-open');
assert(guideOpenBefore === 'false', `la guía debería arrancar colapsada en modo amigable, salió data-open="${guideOpenBefore}"`);

// Ambos menús arrancan colapsados.
const pickerOpen = await page.locator('#picker-panel').getAttribute('data-open');
assert(pickerOpen === 'false', `"Filtrar por horario libre" debería arrancar colapsado, salió data-open="${pickerOpen}"`);
const railOpen = await page.locator('#rail-right-panel').getAttribute('data-open');
assert(railOpen === 'false', `"Mi horario" debería arrancar colapsado, salió data-open="${railOpen}"`);
const railBodyHidden = await page.locator('#rail-sched-body').isHidden();
assert(railBodyHidden, 'el contenido de "Mi horario" (stats/grilla) debería estar oculto mientras está colapsado');

// Apretar la pestaña "Horario semanal" despliega "Mi horario".
await page.click('#tab-horario');
await page.waitForTimeout(250);
const railOpenAfterTab = await page.locator('#rail-right-panel').getAttribute('data-open');
assert(railOpenAfterTab === 'true', 'apretar la pestaña "Horario semanal" debería desplegar "Mi horario"');
assert(await page.locator('#rail-sched-body').isVisible(), 'el contenido de "Mi horario" debería verse después de apretar la pestaña');

// La flecha lo vuelve a colapsar.
await page.click('#rail-sched-toggle');
await page.waitForTimeout(250);
const railOpenAfterChevron = await page.locator('#rail-right-panel').getAttribute('data-open');
assert(railOpenAfterChevron === 'false', 'la flecha debería volver a colapsar "Mi horario"');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Acordeones de modo amigable OK — los 2 menús arrancan colapsados, "Mi horario" se abre con las pestañas y se cierra con la flecha, y la guía vive como botón bajo la barra de búsqueda');
