// Fix histórico: el <p class="chz-signoff"> sin margin:0 dejaba ver una
// franja clara del fondo de la página entre dos elementos de fondo
// oscuro, en las firmas que tienen ese elemento.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

await page.click('#chz-toggle');
await page.waitForTimeout(400);

const gap = await page.evaluate(() => {
  const wrap = document.querySelector('#chelpaHazeFooter .chz-gears-wrapper');
  const signoff = document.querySelector('#chelpaHazeFooter .chz-signoff');
  if (!wrap || !signoff) return null;
  const a = wrap.getBoundingClientRect();
  const b = signoff.getBoundingClientRect();
  return Math.round(b.top - a.bottom);
});
assert(gap !== null, 'no se encontraron los elementos de la firma principal');
assert(gap <= 1, `franja blanca detectada sobre "Francisco · chazeware": ${gap}px de separación`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log(`  firma sin franja OK — ${gap}px de separación`);
