// Regresión para el bug real que un usuario encontró comparando el sitio ya
// publicado contra una captura de referencia: el @import de Google Fonts
// para 'Rubik Wet Paint'/'Rubik Burned' (las fuentes del grafiti "CHELPA
// HAZE") vivía a mitad de styles.css — un @import que no es la primera
// regla de su hoja de estilos es INVÁLIDO por spec de CSS, y el navegador
// lo descarta al parsear, en silencio, sin ningún error en consola. El
// texto caía al font-family de respaldo (cursivo genérico) en vez del
// grafiti real, y nada de lo que se probaba antes lo detectaba porque no
// tira ningún error — sólo se nota comparando visualmente.
//
// No se puede verificar esto viendo si la fuente REALMENTE cargó
// (document.fonts.check) porque este sandbox bloquea la red hacia Google
// Fonts (ver EXPECTED_NOISE en lib/harness.mjs) — fallaría igual aunque el
// @import estuviera bien puesto. En cambio, se inspecciona el CSSOM ya
// parseado: la validez de un @import por posición se decide al parsear la
// hoja de estilos, ANTES de que el navegador intente descargar nada, así
// que esto funciona sin depender de que la red esté disponible.
import { openPage, assert } from './lib/harness.mjs';

const { page, errors, close } = await openPage();

const info = await page.evaluate(() => {
  const sheet = document.styleSheets[0];
  const rules = Array.from(sheet.cssRules);
  const importRules = rules.filter(r => r instanceof CSSImportRule);
  return {
    totalRules: rules.length,
    importHrefs: importRules.map(r => r.href),
  };
});

assert(
  info.importHrefs.some(h => h && h.includes('Rubik')),
  'no se encontró ningún @import registrado (válido) que incluya "Rubik" — ' +
  'probablemente alguien agregó un @import de fuentes a mitad de styles.css. ' +
  'Los @import deben vivir TODOS juntos en la línea 1 del archivo, antes de ' +
  'cualquier otra regla, o el navegador los descarta en silencio.'
);

assert(errors.length === 0, `errores de consola/página: ${errors.join(' | ')}`);

await close();
console.log('  Fuentes del grafiti OK — el @import de Rubik Wet Paint/Burned está bien ubicado (línea 1 de styles.css) y el navegador lo registra como válido');
