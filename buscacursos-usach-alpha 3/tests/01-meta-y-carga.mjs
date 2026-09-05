// La página carga sin errores de consola/página, y los meta tags /
// topbar muestran el programa y semestre reales (no placeholders sin
// reemplazar — el bug que ya pasó una vez con __PROGRAMA__/__SEMESTRE__).
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

const title = await page.title();
assert(title.includes('BuscaCursos USACH'), `título inesperado: ${title}`);

const ogTitle = await page.locator('meta[property="og:title"]').getAttribute('content');
assert(ogTitle === 'BuscaCursos USACH', `og:title inesperado: ${ogTitle}`);

const ogDesc = await page.locator('meta[property="og:description"]').getAttribute('content');
assert(!ogDesc.includes('__PROGRAMA__') && !ogDesc.includes('__SEMESTRE__'),
  `og:description con placeholder sin reemplazar: ${ogDesc}`);
assert(ogDesc.includes('Ingeniería Comercial'), `og:description no menciona el programa: ${ogDesc}`);

const ctxPrograma = await page.locator('#ctx-programa').innerText();
const ctxSemestre = await page.locator('#ctx-semestre').innerText();
assert(!ctxPrograma.includes('__'), `topbar programa con placeholder: ${ctxPrograma}`);
assert(!ctxSemestre.includes('__'), `topbar semestre con placeholder: ${ctxSemestre}`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log(`  meta/topbar OK — programa="${ctxPrograma}" semestre="${ctxSemestre}"`);
