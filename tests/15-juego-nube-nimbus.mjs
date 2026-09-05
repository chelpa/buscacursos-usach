// El usuario pidió, para la copia de la firma que vive al fondo de la
// Malla curricular (#chelpaHazeFooterMallaOriginal — la de la línea
// inferior ámbar), un segundo mini-juego distinto del de las chinitas:
// estilo Dragon Ball Z, una nube con rayo y "usachin" (una mascota león
// genérica) montado arriba, que hay que hacer "aletear" con click/touch
// (mecánica tipo Flappy Bird), con un fondo de lluvia de código verde
// estilo Matrix. Arranca con una pantalla "toca para empezar" (sin
// física ni spawns todavía). Temática educativa: se esquivan vallas de
// carrera (dan un "stun" temporal, no restan puntaje), se juntan
// libros/cuadernos 📚 (+1 "ramo aprobado") y nubes-boost (velocidad), y
// la carne 🍖 retrasa a usachin (sin dar puntos). Cada cierta distancia
// aparece un cameo de Kong. Este test abre la Malla, despliega esa
// firma, confirma que el canvas existe con un ancho real (protege contra
// el bug de "canvas estirado a 1px" que reportó el usuario al refrescar
// con la firma ya abierta), que el badge arranca en "📚 0", que el fondo
// de Matrix anima solo incluso ANTES de tocar (pantalla de inicio), y que
// tocar una vez (arranca el juego) no rompe nada.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

await page.click('#malla-toggle');
await page.waitForTimeout(300);
await page.click('#chz-toggleMallaOriginal');
await page.waitForTimeout(400);

await page.locator('#chelpaHazeFooterMallaOriginal .chz-card-logo').scrollIntoViewIfNeeded();
await page.waitForTimeout(300);

const canvasCount = await page.locator('#chzNimbusCanvas').count();
assert(canvasCount === 1, 'debería existir el canvas #chzNimbusCanvas dentro de la firma ámbar de la Malla');

const scoreBefore = (await page.locator('#chzNimbusScore').innerText()).trim();
assert(scoreBefore === '📚 0', `el puntaje debería arrancar en "📚 0", salió "${scoreBefore}"`);

// El canvas debería tener un ancho real (no el bug de "1px estirado por
// CSS" que reportó el usuario al refrescar con la firma ya desplegada).
const canvasWidth = await page.locator('#chzNimbusCanvas').evaluate(el => el.width);
assert(canvasWidth > 50, `el canvas debería tener un ancho real de pixeles, salió ${canvasWidth}px`);

// Antes de tocar nada, el juego debería estar en la pantalla de inicio
// ("toca para empezar") — pero el fondo de Matrix igual debería estar
// animando solo (el loop de rAF corre, sólo la física/spawns esperan el
// primer toque). Ventana corta (300ms) para no correr ningún riesgo de
// randomness ni de que algo se rompa mientras tanto.
const frame1 = await page.locator('#chzNimbusCanvas').evaluate(el => el.toDataURL());
await page.waitForTimeout(300);
const frame2 = await page.locator('#chzNimbusCanvas').evaluate(el => el.toDataURL());
assert(
  frame1 !== frame2,
  'el canvas debería estar dibujando algo distinto entre dos instantes incluso antes de tocar (confirma que el fondo de Matrix anima solo en la pantalla de inicio)'
);

// Primer toque: arranca el juego (sale de la pantalla de inicio) y de
// paso hace de primer aleteo. No debería tirar errores ni romper nada.
await page.locator('#chzNimbusCanvas').click();
await page.waitForTimeout(150);
const canvasStillThere = await page.locator('#chzNimbusCanvas').count();
assert(canvasStillThere === 1, 'el canvas debería seguir existiendo después de tocar para empezar');

const scoreAfter = (await page.locator('#chzNimbusScore').innerText()).trim();
assert(/^📚 \d+$/.test(scoreAfter), `el badge de puntaje debería seguir mostrando un número no negativo (las vallas ahora sólo aturden, no restan), salió "${scoreAfter}"`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Juego de la nube nimbus OK — el canvas existe con ancho real, arranca en pantalla de inicio con el fondo de Matrix animando, y tocar para empezar no rompe nada');
