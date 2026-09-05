# BuscaCursos USACH — alpha (estructura modular)

Buscador de horarios no oficial para Ingeniería Comercial / Mención
Economía (USACH), publicado como sitio estático en GitHub Pages. Esta es
una reestructuración del proyecto original — mismo sitio, mismo
comportamiento, mismo `index.html` final — pero con el HTML/CSS/JS
separados en archivos de trabajo en vez de un único `template.html` de
~450KB. Ver la sección "Por qué esta carpeta" más abajo para el contexto
completo de la decisión.

Sin framework, sin bundler, sin `npm install` obligatorio — sólo Node
puro para unir los archivos y generar el HTML final.

## Estructura

```
src/
  head.html      # <head> hasta antes del <style> (meta tags, favicons,
                  # GTM, script de tema que corre antes del primer paint)
  styles.css      # todo el CSS del sitio, incluida la hoja de
                  # utilidades escrita a mano que reemplaza a Tailwind
                  # CDN (ver más abajo)
  app.js          # toda la lógica: búsqueda/filtros, horario, malla
                  # curricular, simulación, temas, y la inicialización
                  # de las 3 firmas decorativas
  firmas.html     # las 3 firmas "chelpaHaze" (marcado HTML), delimitadas
                  # por comentarios <!-- FIRMA:x --> ... <!-- /FIRMA:x -->
  shell.html      # el resto del <body> — topbar, resultados, malla,
                  # overlays — con marcadores <!--__FIRMA_X__--> y
                  # <!--__APP_JS__--> donde build.js inyecta cada pieza
data/
  programs.json   # el catálogo: label, semestre y secciones de ambos
                   # programas — lo único que cambia cada semestre
  bitacora-seed-demo.json  # datos de ejemplo de "Mi Bitácora", SOLO para
                   # esta carpeta (dev) — ver sección de más abajo
tests/
  *.mjs            # suite de regresión con Playwright (ver tests/README.md)
scripts/
  export-prod.sh   # regenera ../beta_en_prod desde acá (ver más abajo)
build.js            # node build.js → genera index.html
index.html           # generado — el único archivo que se publica en
                      # GitHub Pages, junto con CNAME y og-image.png
```

No editar `index.html` a mano — se pierde en el próximo build. Los
cambios de diseño/lógica van en `src/*`; los cambios de catálogo
(secciones/cupos/profesores nuevos cada semestre) van en
`data/programs.json`.

## Cómo actualizar el catálogo cada semestre

Igual que en la versión anterior del proyecto:

1. Armar el nuevo `data/programs.json` con la misma forma de siempre
   (`codigo`, `asignatura`, `profesor`, `cupo`, `horarioRaw`, `bloques`,
   `nivel`, `sct`, `area`, `electividad`, `coord`, `fechaPEP1`,
   `fechaPEP2`, agrupado por `ingeco`/`economia`).
2. `node build.js` — regenera `index.html` completo, valida que no falte
   nada, y falla con un mensaje claro si algo viene incompleto (en vez
   de publicar un archivo roto).
3. `node tests/run-all.mjs` — corre la suite de regresión contra el
   `index.html` recién generado.
4. Subir `index.html` (junto con `CNAME`, `og-image.png`, etc.) a `main`.

## Mi Bitácora: un cuaderno de apuntes por ramo

Cada ramo que un alumno agrega a "Mi horario" recibe automáticamente su
propia bitácora — vacía, sin que nadie tenga que crearla ni "guardarla" a
mano. La idea: poder estudiar o preparar un ramo (apuntes, recursos,
dudas, ejercicios) **antes** de cursarlo de verdad, para llegar más suelto
el semestre que le toque tomarlo.

- **Cuándo se crea**: al apretar "Agregar" en una sección por primera vez
  para ese código de ramo (`ensureBitacora(course)`, llamado desde
  `toggleSection` en `src/app.js`). Si el ramo ya tenía bitácora, no se
  toca — agregar el mismo ramo de nuevo, o volver a guardar el mismo
  horario, nunca la recrea ni le borra lo ya escrito. Ésa es toda la regla
  de "no duplicados".
- **Qué se puede registrar**, por entrada: **Apunte de clase** (texto
  libre), **Recurso** (descripción + enlace), **Duda pendiente** (con un
  botón para marcarla "resuelta" más adelante) y **Ejercicio resuelto**.
- **Dónde vive**: en este navegador (`localStorage`, clave
  `bc-usach-bitacora`), igual que el horario guardado y la malla de
  aprobados — no hay cuentas de usuario ni servidor todavía, así que si el
  alumno cambia de computador o de navegador no la va a encontrar ahí.
  Está anotado como posible trabajo futuro si el proyecto en algún momento
  suma un backend real (ver también la idea de Supabase mencionada en el
  documento de referencia que llegó para esta ronda).
- **Si el alumno quita el ramo del horario**: la bitácora NO se borra —
  sigue apareciendo en el listado (marcada "ya no está en tu horario")
  para no perder apuntes ya escritos solo por desmarcar el ramo un rato.
- **Cómo se usa**: ícono de cuaderno en la barra superior (junto al de la
  Malla) abre el overlay "Mi Bitácora" — lista de ramos a la izquierda,
  entradas + formulario a la derecha.

### Dev (datos de ejemplo) vs prod (vacía)

`build.js` genera, a partir del mismo código fuente, dos variantes de
`index.html`:

```
node build.js                 # producción: Mi Bitácora nace vacía (default)
BC_DEMO_SEED=1 node build.js  # dev: precarga data/bitacora-seed-demo.json
```

Esta carpeta (`buscacursos-usach-alpha`, la de trabajo/dev) se entrega
construida con `BC_DEMO_SEED=1` — trae 2 ramos de ejemplo con apuntes,
recursos, una duda pendiente y una resuelta, para poder ver y probar la
función ya poblada sin escribir nada a mano. La semilla sólo se aplica si
el navegador todavía no tiene ninguna bitácora guardada — nunca pisa datos
reales que el alumno ya haya escrito.

**No son dos bases de código separadas.** `src/` vive una sola vez, acá.
La carpeta hermana `beta_en_prod/` (la que de verdad se sube a producción)
es una copia regenerada de este mismo código, construida sin
`BC_DEMO_SEED` — su `data/` ni siquiera incluye
`bitacora-seed-demo.json`, así que es imposible que termine con datos de
ejemplo por error. Para regenerarla después de cambiar algo acá:

```
./scripts/export-prod.sh
```

Eso copia `src/`, `tests/`, `build.js`, `data/programs.json`, `CNAME` y
`og-image.png` a `../beta_en_prod` y corre `node build.js` ahí mismo. Los
cambios de verdad (diseño, lógica, catálogo) siempre van en
`buscacursos-usach-alpha` — editar `beta_en_prod` a mano se pierde en el
próximo export.

## Por qué esta carpeta (y por qué no Vite)

El proyecto original vivía en un solo `template.html` de ~450KB con
HTML+CSS+JS mezclados. Se evaluó migrar a Vite/React y se descartó — el
sitio no tiene backend, no tiene routing, y el flujo de trabajo real
(alguien edita en una sesión de Claude, corre un build, entrega el
archivo, el usuario lo sube a mano a GitHub Pages) no se beneficia del
HMR o el dev-server de Vite, y sí se complica con un `node_modules`/
`package-lock.json`/paso de build obligatorio que antes no existía.

En cambio, se separó el archivo único en piezas de trabajo (`src/*`) que
`build.js` sigue uniendo en un solo `index.html` autocontenido — mismo
resultado final, mismo pipeline de publicación de siempre, pero mucho
más fácil de navegar mientras se trabaja: un cambio en el simulador ya
no puede pisar por accidente el CSS de una firma, porque viven en
archivos distintos.

De paso, esta ronda también:

- **Formalizó los tests.** Los scripts `verify_*.mjs` que se reescribían
  a mano cada ronda de trabajo ahora son una suite versionada en
  `tests/`, con aserciones reales (no sólo `console.log` para leer a
  ojo) y un solo comando (`node tests/run-all.mjs`) que corre todo y
  falla claramente si algo se rompió. Ver `tests/README.md`.
- **Sacó la dependencia de Tailwind por CDN.** La firma "nano_gollo"
  (el grafiti "CHELPA HAZE" dentro de la Malla curricular) usaba
  `<script src="https://cdn.tailwindcss.com">` — ese script, al cargar
  con internet real, aplicaba un reset global ("Preflight") a TODA la
  página y rompía en silencio el resto del sitio (bug real, ya
  documentado y arreglado antes desactivando el Preflight). Ahora esa
  dependencia externa se eliminó del todo: al final de `src/styles.css`
  hay una hoja de utilidades escrita a mano que reproduce 1:1 los
  valores del theme por defecto de Tailwind v3 para las ~90 clases que
  esa firma realmente usa (colores, spacing, gradientes, etc.), scoped
  bajo `#chelpaHazeFooterMalla` — el HTML de la firma no cambió ni un
  carácter, así que a diferencia del CDN, este CSS ni siquiera PODRÍA
  filtrarse a otra parte del sitio. Se intentó primero compilarla con el
  CLI real de Tailwind (más prolijo que escribir las clases a mano), pero
  el entorno donde se armó esta versión no tiene acceso al registro de
  npm — quedó como una mejora posible si en algún momento se puede correr
  ese paso en un entorno con red disponible.

## Hallazgo durante esta ronda: la imagen de fondo de la firma "CHELPA HAZE" se ve más alta de lo esperado

Al poder finalmente RENDERIZAR esa firma con sus clases de Tailwind
aplicadas de verdad (en el proyecto anterior, el CDN nunca cargaba en el
sandbox de pruebas por la política de red — así que nadie había visto
esta sección realmente estilada hasta esta ronda), apareció algo que no
es un bug de esta reestructuración sino un problema preexistente en el
diseño original: el `<svg>` de fondo (la ilustración de edificio/calle,
`viewBox="0 0 800 1200"`) no tiene ninguna clase de posicionamiento — es
un `<svg width="100%" height="100%">` suelto, sin `position:absolute` ni
nada que lo recorte. Sin una altura de contenedor definida, el navegador
calcula su alto usando el ratio del `viewBox` (800:1200 = 2:3) sobre el
ancho disponible, y termina ocupando más de 1400px de alto — empujando
el grafiti "CHELPA HAZE" y los badges bien abajo, con un scroll largo en
el medio. Esto pasaría exactamente igual con el CDN real de Tailwind (no
tiene que ver con haberlo reemplazado por CSS a mano); simplemente nunca
se había visto renderizado en este entorno de pruebas hasta ahora. No se
tocó porque cambiar el layout de una firma no estaba en el alcance de
esta ronda (que era sólo reestructurar sin cambiar comportamiento) — pero
si en algún momento se quiere prolijar, la solución típica es agregarle
`class="absolute inset-0 -z-10"` (o similar) al `<svg>` y `class="relative"`
a su contenedor, para que actúe como fondo en vez de como contenido en
el flujo normal.

## Entrega

Igual que siempre: sólo por archivo en la conversación, nunca tocando el
repo real ni ninguna carpeta conectada del computador — el usuario sube
`index.html` a GitHub Pages por su cuenta.
