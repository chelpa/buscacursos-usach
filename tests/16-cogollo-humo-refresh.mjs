// El usuario reportó (Ronda 8 y de nuevo en Ronda 10) que el humo del
// "cogollo" (el ícono verde de la firma nano, dentro de la Malla
// curricular) no aparece si se refresca la página con eso ya abierto —
// se ve el dibujo pero sin el humo animado detrás. Investigando la causa
// real: initNanoSmoke (igual que initChzSmoke y initChzNimbusGame) mide
// su canvas con getBoundingClientRect() y sólo vuelve a medir si el
// PROPIO elemento pasa de oculto a visible (vía su IntersectionObserver)
// o si la ventana dispara un evento "resize" real. El cogollo vive dentro
// del overlay de la Malla curricular (#malla-overlay), que arranca oculto
// en cada carga de página y NO guarda su estado en localStorage (a
// diferencia de cada firma) — así que si el usuario ya tenía la firma nano
// desplegada de antes (localStorage sí recuerda eso) y refresca, el
// cogollo queda con chz-bodyMalla ya visible pero el overlay entero
// todavía oculto al momento en que initNanoSmoke mide por primera vez →
// canvas de 1px. Comprobado en esta sesión que el IntersectionObserver del
// cogollo NO se vuelve a disparar solo cuando el overlay pasa de oculto a
// visible (ni con scroll, ni esperando varios segundos, ni forzando un
// frame con una captura) — sólo un evento "resize" real lo arregla. Mismo
// problema afecta al humo de la copia ámbar de la firma
// (#chzSmokeMallaOriginal) y al canvas del juego nimbus
// (#chzNimbusCanvas), que también viven dentro del mismo overlay.
//
// Fix: openMalla() (app.js) ahora dispara un window.dispatchEvent(new
// Event('resize')) apenas se despliega el overlay — mismo patrón que ya
// usa initChzToggle al desplegar una firma — así los 3 efectos miden su
// canvas de nuevo con el overlay ya visible, sin depender de que su propio
// IntersectionObserver se vuelva a disparar.
//
// Este test reproduce el bug reportado tal cual: abre la Malla, despliega
// la firma nano Y la firma ámbar (dejando sus toggles en "abierto" en
// localStorage), refresca la página de verdad (page.reload()), vuelve a
// abrir la Malla, y confirma que los 3 canvas miden un ancho real de
// pixeles en vez de quedar en 1px.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

await page.click('#malla-toggle');
await page.waitForTimeout(250);
await page.click('#chz-toggleMalla');
await page.waitForTimeout(200);
await page.click('#chz-toggleMallaOriginal');
await page.waitForTimeout(300);

await page.reload();
await page.waitForTimeout(300);
await page.click('#malla-toggle');
await page.waitForTimeout(500);

const widths = await page.evaluate(() => ({
  nanoSmoke: document.getElementById('nano-smoke')?.width,
  chzSmokeMallaOriginal: document.getElementById('chzSmokeMallaOriginal')?.width,
  chzNimbusCanvas: document.getElementById('chzNimbusCanvas')?.width,
}));

assert(widths.nanoSmoke > 50, `el humo del cogollo debería medir un ancho real, salió ${widths.nanoSmoke}px`);
assert(widths.chzSmokeMallaOriginal > 50, `el humo de la firma ámbar debería medir un ancho real, salió ${widths.chzSmokeMallaOriginal}px`);
assert(widths.chzNimbusCanvas > 50, `el canvas del juego nimbus debería medir un ancho real, salió ${widths.chzNimbusCanvas}px`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Humo del cogollo tras refrescar OK — abrir la Malla con las firmas ya recordadas como abiertas deja los 3 canvas (cogollo, firma ámbar, juego nimbus) con su ancho real, no estirados a 1px');
