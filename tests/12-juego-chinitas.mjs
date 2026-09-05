// El usuario pidió un mini-juego de "matar bugs" dentro del cuadro
// "chelpa.sh" (el que tiene el efecto de matriz verde) de la firma
// principal: bichos que aparecen solos y se pueden aplastar con click o
// touch — las orugas/hormigas (🐛🐜) suman puntos, la chinita roja (🐞)
// resta. Este test abre la firma "STABLE", espera a que aparezca al menos
// un bicho, lo aplasta y confirma que el puntaje cambió (no importa si
// sumó o restó, ya que cuál bicho toca es aleatorio). El badge usa el
// ícono ☠️ ("contador de insecticida", a pedido del usuario en la Ronda 8).
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

// Desplegar la firma principal (por defecto está colapsada, "STABLE").
await page.click('#chz-toggle');
await page.waitForTimeout(400);

// La capa del juego debe existir siempre (no depende de que haya bichos).
const layerCount = await page.locator('#chzBugLayer').count();
assert(layerCount === 1, 'debería existir la capa #chzBugLayer dentro del cuadro chelpa.sh');

const scoreBefore = (await page.locator('#chzBugScore').innerText()).trim();
assert(scoreBefore === '☠️ 0', `el puntaje debería arrancar en "☠️ 0", salió "${scoreBefore}"`);

// El spawn usa IntersectionObserver (mismo patrón que initChzSmoke): sólo
// gasta ciclos cuando el cuadro está realmente a la vista, así que hay
// que llevarlo a la pantalla antes de esperar a que aparezcan bichos.
await page.locator('#chelpaHazeFooter .chz-card-logo').scrollIntoViewIfNeeded();
await page.waitForTimeout(200);

// Esperar a que el spawn automático (cada ~900ms) meta al menos un bicho.
await page.waitForSelector('#chelpaHazeFooter .chz-bug', { timeout: 4000 });

// Aplastar el primero que haya.
await page.locator('#chelpaHazeFooter .chz-bug').first().click({ timeout: 2000 });
await page.waitForTimeout(350);

const scoreAfter = (await page.locator('#chzBugScore').innerText()).trim();
assert(
  scoreAfter !== scoreBefore,
  `el puntaje debería cambiar después de aplastar un bicho — antes "${scoreBefore}", después "${scoreAfter}"`
);
assert(
  scoreAfter === '☠️ 1' || scoreAfter === '☠️ -3',
  `el puntaje después de un solo click debería ser +1 (bicho normal) o -3 (chinita roja), salió "${scoreAfter}"`
);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Juego de matar chinitas OK — aparecen bichos solos en el cuadro chelpa.sh y aplastarlos cambia el puntaje');
