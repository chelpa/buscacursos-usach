// Helper compartido por los tests de tests/*.mjs. Sin dependencias fuera
// de playwright (ya instalado en el entorno de build). Cada test abre su
// propia página contra el index.html generado por `node build.js` en la
// raíz de este proyecto (nunca contra el index.html del proyecto viejo).

import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const INDEX_HTML_URL = pathToFileURL(
  path.join(__dirname, '..', '..', 'index.html')
).href;

// Playwright necesita un binario de Chromium. En el sandbox donde se
// escribió este proyecto (una sesión de Claude) viene pre-instalado en
// una ruta fija, distinta al Chromium que `npx playwright install`
// descargaría en una máquina normal — por eso esa ruta SOLO se usa si
// existe (o si se pasa explícitamente por env var), y si no, se deja que
// Playwright use lo que tenga instalado por su cuenta.
import fs from 'fs';
const SANDBOX_CHROMIUM = '/opt/pw-browsers/chromium';
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_PATH
  || (fs.existsSync(SANDBOX_CHROMIUM) ? SANDBOX_CHROMIUM : undefined);
const LAUNCH_OPTS = chromiumPath ? { executablePath: chromiumPath } : {};

// Ruido de red esperable en este sandbox (Google Fonts, GTM — bloqueados
// por la política de red del contenedor, no por un bug real). No hay CDN
// de Tailwind que filtrar acá porque esta versión ya no lo usa.
const EXPECTED_NOISE = [
  'ERR_TUNNEL_CONNECTION_FAILED',
  'net::ERR_',
];

function isExpectedNoise(text) {
  return EXPECTED_NOISE.some(s => text.includes(s));
}

/**
 * Abre una página contra index.html, con captura de errores reales de
 * consola/página (filtrando el ruido de red esperado del sandbox).
 * Devuelve { browser, page, errors, close }.
 */
export async function openPage(opts = {}) {
  const browser = await chromium.launch(LAUNCH_OPTS);
  const page = await browser.newPage({
    viewport: opts.viewport || { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on('pageerror', e => errors.push('PAGEERROR: ' + e.message));
  page.on('console', m => {
    if (m.type() === 'error' && !isExpectedNoise(m.text())) {
      errors.push('CONSOLE: ' + m.text());
    }
  });
  await page.goto(INDEX_HTML_URL, { waitUntil: 'load' });
  await page.waitForTimeout(opts.settleMs ?? 600);
  return {
    browser,
    page,
    errors,
    close: () => browser.close(),
  };
}

export class AssertionError extends Error {}

export function assert(cond, msg) {
  if (!cond) throw new AssertionError(msg || 'assertion failed');
}

export function assertEqual(actual, expected, label) {
  if (actual !== expected) {
    throw new AssertionError(
      `${label || 'valor'}: esperaba ${JSON.stringify(expected)}, salió ${JSON.stringify(actual)}`
    );
  }
}
