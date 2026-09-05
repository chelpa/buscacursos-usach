// El usuario pidió "limpiar" el viewport de celular: el panel "grande" de
// Mi Horario (.big-schedule-wrap) queda SIEMPRE visible sobre el footer,
// en cualquier ancho — en un celular real eso significa que aparece una
// segunda vez, más abajo, duplicando el panel compacto de arriba (el que
// se reparenta a #mihorario-slot-mobile en pantallas angostas). Antes de
// este fix, esa segunda aparición mostraba los números de
// secciones/créditos/choques igual de grandes que en desktop (30px),
// sintiéndose pesada en una pantalla angosta. Este test confirma que en
// un viewport de celular real esos números se ven chicos (mismo tamaño
// que ya usa la versión compacta de arriba), no los 30px de desktop.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage({ viewport: { width: 390, height: 844 } });

// Agregar un ramo para que "Mi Horario" tenga algo que mostrar en ambos paneles.
await page.fill('#q', '352409');
await page.waitForTimeout(250);
await page.locator('.add-btn').first().click();
await page.waitForTimeout(200);

const bigStatSize = await page.locator('.big-schedule-wrap .sched-stat .n').first().evaluate(
  el => parseFloat(getComputedStyle(el).fontSize)
);
assert(
  bigStatSize <= 18,
  `los números de "Mi Horario" (panel grande, siempre visible sobre el footer) deberían verse chicos en celular (~16px) — salió ${bigStatSize}px. Revisar el @media (max-width:700px) de .big-schedule-wrap .sched-stat en styles.css.`
);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Stats chicos en celular OK — el panel grande de Mi Horario no se ve con números de tamaño desktop en un viewport angosto');
