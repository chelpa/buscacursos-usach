// El usuario pidió un "pipeline" (build → test → deploy) al fondo de la
// Malla curricular, debajo de la firma nano ("malla_grid.html · grafo").
// Es puramente decorativo (initChzPipeline en app.js cicla los 4 estados
// solo, con setTimeout, en loop) — este test confirma que las 4 etapas
// están en el orden esperado y que el loop realmente avanza solo hasta
// completar "deploy" en verde, sin que haya que hacer nada.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

await page.click('#malla-toggle');
await page.waitForTimeout(300);

const stageKeys = await page.locator('.chz-pipeline-stage').evaluateAll(els => els.map(el => el.dataset.stage));
assert(
  JSON.stringify(stageKeys) === JSON.stringify(['build', 'lint', 'test', 'deploy']),
  `etapas del pipeline inesperadas: ${stageKeys.join(', ')}`
);

// Esperar a que el loop llegue solo hasta "deploy" en verde (confirma que
// initChzPipeline avanza los 4 estados sin interacción del usuario).
await page.waitForFunction(() => {
  const deploy = document.querySelector('.chz-pipeline-stage[data-stage="deploy"]');
  return !!deploy && deploy.classList.contains('chz-pipeline-stage--done');
}, { timeout: 8000 });

const statusText = (await page.locator('#chzPipelineStatus').innerText()).trim();
assert(statusText.length > 0, 'el texto de estado del pipeline no debería quedar vacío');

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Pipeline de la Malla OK — las 4 etapas (build/lint/test/deploy) existen y el loop avanza solo hasta completar en verde');
