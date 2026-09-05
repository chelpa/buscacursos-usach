// El panel grande de "Mi horario" debe alternar solo entre nombres
// completos (>=1180px) y vista compacta (<1180px), sin toggle manual.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage({ viewport: { width: 1440, height: 1000 } });

await page.click('#btn-goto-results');
await page.waitForTimeout(400);

const addBtns = await page.locator('.add-btn').all();
const seen = new Set();
let added = 0;
for (const btn of addBtns) {
  if (added >= 3) break;
  const codigo = await btn.getAttribute('data-codigo');
  if (seen.has(codigo)) continue;
  seen.add(codigo);
  await btn.click();
  added++;
  await page.waitForTimeout(120);
}
assert(added === 3, `no se pudieron agregar 3 secciones distintas para probar el horario (se agregaron ${added})`);
await page.waitForTimeout(400);

const wide = await page.evaluate(() => ({
  gridBigHidden: document.getElementById('week-grid-big').hidden,
  agendaBigHidden: document.getElementById('day-agenda-big').hidden,
}));
assert(wide.agendaBigHidden === false, 'a 1440px debería verse la vista con nombres completos (agenda), no la de grilla compacta');
assert(wide.gridBigHidden === true, 'a 1440px la grilla compacta debería estar oculta');

await page.setViewportSize({ width: 900, height: 1000 });
await page.waitForTimeout(300);
const narrow = await page.evaluate(() => ({
  gridBigHidden: document.getElementById('week-grid-big').hidden,
  agendaBigHidden: document.getElementById('day-agenda-big').hidden,
}));
assert(narrow.gridBigHidden === false, 'a 900px debería verse la grilla compacta');
assert(narrow.agendaBigHidden === true, 'a 900px la vista con nombres completos debería estar oculta');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  horario grande responsive OK — alterna solo entre 1440px y 900px');
