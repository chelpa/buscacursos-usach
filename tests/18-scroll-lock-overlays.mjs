// El usuario reportó que con "Mi Bitácora" abierta se podía seguir
// haciendo scroll y se veía la página de buscador de atrás moviéndose por
// detrás del overlay (mismo problema aplica a la Malla curricular). Causa
// real: aunque cada overlay es position:fixed;inset:0, el body detrás
// seguía siendo scrolleable — el scroll interno de .malla-body (que tiene
// overflow:auto) encadenaba (scroll chaining) hacia el documento apenas
// llegaba a su límite. Fix: lockBodyScroll()/unlockBodyScroll() (app.js)
// fija el body en position:fixed mientras cualquier overlay a pantalla
// completa esté abierto. La página real ya es lo bastante alta como para
// scrollear de por sí: este test scrollea hacia abajo, abre cada overlay y
// confirma que el body queda fijado exactamente en ese punto (compensado
// con un `top` negativo, el patrón estándar a prueba de iOS/Android — así
// la página no "salta" al bloquearse) y que ya no hay nada que scrollear
// mientras está abierto, y que al cerrar se libera y se vuelve exacto al
// punto de scroll de antes de abrir.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

async function checkOverlayLocksScroll(openSel, closeSel, label){
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(100);
  const scrollBefore = await page.evaluate(() => window.scrollY);
  assert(scrollBefore > 100, `(${label}) debería poder scrollear la página antes de abrir el overlay, salió scrollY=${scrollBefore}`);

  await page.click(openSel);
  await page.waitForTimeout(250);
  const bodyPosition = await page.evaluate(() => document.body.style.position);
  assert(bodyPosition === 'fixed', `(${label}) el body debería quedar en position:fixed mientras el overlay está abierto, salió "${bodyPosition}"`);
  const bodyTop = await page.evaluate(() => document.body.style.top);
  assert(bodyTop === `-${scrollBefore}px`, `(${label}) el body debería compensar el scroll congelado con top:-${scrollBefore}px, salió "${bodyTop}"`);

  // Con el body fijo, el documento ya no tiene nada que scrollear (su
  // altura de overflow colapsa a la del viewport) — intentar moverlo no
  // debería tener ningún efecto real.
  await page.evaluate(() => window.scrollTo(0, 9999));
  await page.waitForTimeout(100);
  const scrollDuringOpen = await page.evaluate(() => window.scrollY);
  assert(scrollDuringOpen === 0, `(${label}) no debería quedar nada scrolleable en el documento mientras el overlay está abierto, salió scrollY=${scrollDuringOpen}`);

  await page.click(closeSel);
  await page.waitForTimeout(250);
  const bodyPositionAfter = await page.evaluate(() => document.body.style.position);
  assert(bodyPositionAfter === '', `(${label}) el body debería quedar libre otra vez al cerrar el overlay, salió position:"${bodyPositionAfter}"`);
  const scrollAfterClose = await page.evaluate(() => window.scrollY);
  assert(scrollAfterClose === scrollBefore, `(${label}) al cerrar debería volver exactamente al scroll de antes de abrir (${scrollBefore}), salió ${scrollAfterClose}`);
}

await checkOverlayLocksScroll('#malla-toggle', '#malla-close', 'Malla curricular');
await checkOverlayLocksScroll('#bitacora-toggle', '#bitacora-close', 'Mi Bitácora');
await checkOverlayLocksScroll('#help-fab', '#guide-overlay-close', 'Guía');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Candado de scroll OK — Malla, Bitácora y Guía fijan el scroll del body mientras están abiertas y lo devuelven exacto al cerrarlas, sin dejar ver la página de atrás moviéndose');
