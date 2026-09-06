// El usuario pidió un único botón "?" para la guía "Cómo usar este
// buscador", visible en modo celular y en todos los temas, que no aparezca
// en ningún otro lugar de la página. Antes esta guía vivía en 3 sitios a la
// vez: la tarjeta grande #bottom-guide-wrap (siempre, salvo que no hubiera
// filtros activos), su reubicación como botón chico en #guide-slot-topbar
// (sólo en modo amigable, vía initGuidePlacement) y una copia completa
// dentro de welcomeGuideHTML() (el estado "aún no busco nada"). Ahora es un
// solo botón fijo (#help-fab) que abre un único overlay (#guide-overlay,
// mismo patrón que Malla/Bitácora) con los 5 pasos de siempre.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage({ viewport: { width: 390, height: 844 } });

// No debe quedar ningún rastro de los 3 lugares anteriores.
const oldSurfaces = await page.evaluate(() => ({
  bottomGuideWrap: !!document.getElementById('bottom-guide-wrap'),
  guideSlotTopbar: !!document.getElementById('guide-slot-topbar'),
  guidePanel: !!document.getElementById('guide-panel'),
}));
assert(!oldSurfaces.bottomGuideWrap, '#bottom-guide-wrap ya no debería existir en el DOM');
assert(!oldSurfaces.guideSlotTopbar, '#guide-slot-topbar ya no debería existir en el DOM');
assert(!oldSurfaces.guidePanel, '#guide-panel (la tarjeta de siempre) ya no debería existir en el DOM');

// El botón "?" debe existir exactamente una vez y verse en celular, en el
// tema por defecto.
const fabCount = await page.locator('#help-fab').count();
assert(fabCount === 1, `debería existir exactamente un botón de ayuda "?", salieron ${fabCount}`);
assert(await page.locator('#help-fab').isVisible(), 'el botón "?" debería verse en un viewport de celular');

// También en modo amigable (🎀) — el mismo botón, sin reubicarse.
await page.click('#amigable-toggle');
await page.waitForTimeout(200);
assert(await page.locator('#help-fab').isVisible(), 'el botón "?" también debería verse en modo amigable');
await page.click('#amigable-toggle');
await page.waitForTimeout(200);

// Apretarlo despliega la guía completa con sus 5 pasos.
const overlayHiddenBefore = await page.locator('#guide-overlay').evaluate(el => el.hidden);
assert(overlayHiddenBefore === true, 'la guía debería arrancar oculta');
await page.click('#help-fab');
await page.waitForTimeout(200);
const overlayHiddenAfter = await page.locator('#guide-overlay').evaluate(el => el.hidden);
assert(overlayHiddenAfter === false, 'apretar el botón "?" debería desplegar la guía');
const stepCount = await page.locator('#guide-overlay-body .guide-step').count();
assert(stepCount === 5, `la guía debería mostrar los 5 pasos de siempre, salieron ${stepCount}`);
assert(await page.locator('#guide-overlay-mock').isVisible(), 'la ilustración de ejemplo debería verse dentro de la guía');

// El botón de cerrar la oculta de nuevo.
await page.click('#guide-overlay-close');
await page.waitForTimeout(200);
const overlayHiddenClosed = await page.locator('#guide-overlay').evaluate(el => el.hidden);
assert(overlayHiddenClosed === true, 'el botón de cerrar debería volver a ocultar la guía');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Guía única OK — un solo botón "?" (sin reubicarse por tema), visible en celular y en modo amigable, que despliega los 5 pasos de siempre y se cierra con su botón');
