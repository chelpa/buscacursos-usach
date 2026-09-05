// Estado actual acordado de las 3 firmas "chelpaHaze" (post ronda 8 —
// ver claude/2026-09-04-merge-final-version.md en el proyecto). Si esto
// falla, probablemente alguien tocó una firma sin querer al editar otra
// cosa cercana (ya pasó más de una vez en este proyecto).
import { openPage, assert, assertEqual } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

// #chelpaHazeFooter (principal): STABLE, punto verde, título verde.
const mainBarText = (await page.locator('#chelpaHazeFooter .chz-construction-bar span:not(.chz-construction-dot)').first().innerText()).trim();
assertEqual(mainBarText, 'STABLE', 'firma principal: texto de la barra');
const mainDot = await page.locator('#chelpaHazeFooter .chz-construction-dot').evaluate(el => getComputedStyle(el).backgroundColor);
assertEqual(mainDot, 'rgb(63, 185, 80)', 'firma principal: color del punto');
const mainTitleGradient = await page.locator('#chelpaHazeFooter .chz-title').evaluate(el => getComputedStyle(el).backgroundImage);
assert(mainTitleGradient.includes('34, 197, 94'), `firma principal: título debería tener gradiente verde, salió: ${mainTitleGradient}`);

// Abrir la Malla para revisar las otras dos firmas.
await page.click('#malla-toggle', { timeout: 3000 });
await page.waitForTimeout(500);

// #chelpaHazeFooterMallaOriginal (copia, badge GIT/FORK/211): STABLE, punto verde.
const origBarText = (await page.locator('#chelpaHazeFooterMallaOriginal .chz-construction-bar span:not(.chz-construction-dot)').first().innerText()).trim();
assertEqual(origBarText, 'STABLE', 'firma MallaOriginal: texto de la barra');
const origDot = await page.locator('#chelpaHazeFooterMallaOriginal .chz-construction-dot').evaluate(el => getComputedStyle(el).backgroundColor);
assertEqual(origDot, 'rgb(63, 185, 80)', 'firma MallaOriginal: color del punto');

// #chelpaHazeFooterMalla (grafiti "CHELPA HAZE"): en construcción, punto rojo.
// innerText() devuelve el texto ya afectado por text-transform:uppercase
// del CSS de la barra — comparamos en minúsculas para no depender de eso.
const nanoLine1 = (await page.locator('#chelpaHazeFooterMalla .chz-construction-bar-line1').innerText()).trim();
assert(nanoLine1.toLowerCase().includes('sección en construcción'), `firma nano: línea 1 inesperada: "${nanoLine1}"`);
const nanoLine2 = (await page.locator('#chelpaHazeFooterMalla .chz-construction-bar-line2').innerText()).trim();
assert(nanoLine2.includes('Branch - 212'), `firma nano: línea 2 inesperada: "${nanoLine2}"`);
const nanoDot = await page.locator('#chelpaHazeFooterMalla .chz-construction-dot').evaluate(el => getComputedStyle(el).backgroundColor);
assertEqual(nanoDot, 'rgb(255, 95, 87)', 'firma nano: color del punto');

await page.click('#chz-toggleMalla');
await page.waitForTimeout(400);
const nanoBadges = await page.locator('#chelpaHazeFooterMalla .flex.flex-wrap.gap-2 span').allInnerTexts();
assertEqual(JSON.stringify(nanoBadges), JSON.stringify(['SASS', 'Ruby', 'Python', 'scrappy-coco']), 'firma nano: badges DEVELOPER');
const nanoGraffiti = await page.locator('.nano-graffiti-text').evaluate(el => getComputedStyle(el).backgroundImage);
assert(nanoGraffiti.includes('255, 87, 34'), `firma nano: grafiti debería ser teal/naranjo, salió: ${nanoGraffiti}`);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  estado de las 3 firmas OK (lista/STABLE/en construcción, como quedaron acordadas)');
