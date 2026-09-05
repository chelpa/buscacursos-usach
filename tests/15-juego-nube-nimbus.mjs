// El usuario pidió, para la copia de la firma que vive al fondo de la
// Malla curricular (#chelpaHazeFooterMallaOriginal — la de la línea
// inferior ámbar), un segundo mini-juego distinto del de las chinitas:
// estilo Dragon Ball Z, una nube con rayo y "usachin" (una mascota león
// genérica) montado arriba, que hay que hacer "aletear" con click/touch
// (mecánica tipo Flappy Bird), con un fondo de lluvia de código verde
// estilo Matrix. Se esquivan montañas (dan un "stun" temporal en vez de
// restar puntaje) y se juntan nubes-boost (aumentan la velocidad),
// plátanos 🍌 (+1) y carne 🍖 (+3), con un cameo de Kong cada cierta
// distancia. Este test abre la Malla, despliega esa firma, confirma que
// el canvas existe, que el badge de puntaje arranca en "🍌 0", y que el
// loop de rAF realmente está dibujando (el contenido del canvas cambia
// entre dos instantes muy cercanos — ventana corta a propósito, para no
// arriesgarse a que el juego ya haya llegado a "game over" y el loop esté
// pausado) — la forma más confiable de detectar sin randomness una
// regresión del tipo "el juego nunca arranca" o "el canvas quedó
// estirado a 1px" (el bug real que encontró el usuario al refrescar la
// página con la firma ya abierta).
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
assert(scoreBefore === '🍌 0', `el puntaje debería arrancar en "🍌 0", salió "${scoreBefore}"`);

// El canvas debería tener un ancho real (no el bug de "1px estirado por
// CSS" que reportó el usuario al refrescar con la firma ya desplegada).
const canvasWidth = await page.locator('#chzNimbusCanvas').evaluate(el => el.width);
assert(canvasWidth > 50, `el canvas debería tener un ancho real de pixeles, salió ${canvasWidth}px`);

// El spawn/loop usa IntersectionObserver (mismo patrón que
// initChzSmoke/initChzBugGame): sólo corre mientras el cuadro está
// realmente a la vista, cosa que ya garantizamos con el
// scrollIntoViewIfNeeded de arriba. Ventana corta (300ms) para no correr
// el riesgo de que el juego ya haya llegado a "game over" (loop pausado).
const frame1 = await page.locator('#chzNimbusCanvas').evaluate(el => el.toDataURL());
await page.waitForTimeout(300);
const frame2 = await page.locator('#chzNimbusCanvas').evaluate(el => el.toDataURL());
assert(
  frame1 !== frame2,
  'el canvas de la nube debería estar dibujando algo distinto entre dos instantes (confirma que el loop de rAF está corriendo, con el fondo de matriz animando)'
);

// "Aletear" (click) no debería tirar errores ni romper el canvas.
await page.locator('#chzNimbusCanvas').click();
await page.waitForTimeout(150);
const canvasStillThere = await page.locator('#chzNimbusCanvas').count();
assert(canvasStillThere === 1, 'el canvas debería seguir existiendo después de hacer click (aletear, o reiniciar si ya estaba en game over)');

const scoreAfter = (await page.locator('#chzNimbusScore').innerText()).trim();
assert(/^🍌 \d+$/.test(scoreAfter), `el badge de puntaje debería seguir mostrando un número no negativo (las montañas ahora sólo aturden, no restan), salió "${scoreAfter}"`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Juego de la nube nimbus OK — el canvas existe con ancho real dentro de la firma ámbar, el loop dibuja solo y el puntaje sigue vivo tras interactuar');
