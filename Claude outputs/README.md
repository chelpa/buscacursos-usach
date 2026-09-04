# BuscaCursos USACH

Buscador de horarios no oficial para Ingeniería Comercial / Mención Economía
(USACH), publicado como sitio estático en GitHub Pages. Sin framework, sin
paso de build obligatorio para desarrollar — sólo un script Node chico para
generar el archivo final antes de publicar.

## Estructura

```
template.html      # HTML + CSS + JS de la app entera, con los placeholders
                    # __DATA__, __PROGRAMA__ y __SEMESTRE__
data/
  programs.json     # el catálogo: label, semestre y secciones de ambos
                     # programas — lo único que cambia cada semestre
build.js            # node build.js → genera index.html
index.html          # archivo generado — este es el que se publica en
                     # GitHub Pages, junto con CNAME y los SVG/PNG sueltos
```

**No editar `index.html` a mano** — se pierde en el próximo build. Los
cambios de diseño o de lógica van en `template.html`; los cambios de
catálogo (secciones/cupos/profesores nuevos) van en `data/programs.json`.

## Cómo actualizar el catálogo cada semestre

1. Armar el nuevo `data/programs.json` con esta forma (mismo formato que ya
   usaba la app para cada sección: `codigo`, `asignatura`, `profesor`,
   `cupo`, `horarioRaw`, `bloques`, `nivel`, `sct`, `area`, `electividad`,
   `coord`, `fechaPEP1`, `fechaPEP2`):
   ```json
   {
     "ingeco":   { "label": "Ingeniería Comercial", "semestre": "2027-1", "sections": [ ... ] },
     "economia": { "label": "Ingeniería Comercial en Economía", "semestre": "2027-1", "sections": [ ... ] }
   }
   ```
2. Reemplazar `data/programs.json` por el nuevo archivo.
3. Correr `node build.js` (sin dependencias — sólo Node, no hace falta
   `npm install`). Esto regenera `index.html` completo y de una: el
   nombre/semestre del programa que se ven en el topbar, el pie de página y
   los meta tags OG/Twitter salen del propio `programs.ingeco`, no hay que
   tocarlos aparte.
4. Si algo del `programs.json` viene incompleto (falta un programa, falta
   `label`/`semestre`, `sections` no es una lista) o queda algún
   placeholder sin reemplazar, `build.js` **falla con un mensaje claro** en
   vez de generar un `index.html` a medias — es a propósito, para no
   repetir el bug de `__PROGRAMA__`/`__SEMESTRE__` sin reemplazar que ya
   pasó una vez en este proyecto.
5. Revisar rápido en el navegador y subir `index.html` (junto con el resto
   de archivos del repo: `CNAME`, los SVG del ícono/portada, etc.) a `main`.

## Por qué no Vite/React

Se evaluó y se descartó a propósito, dos veces: el sitio es simple
(búsqueda + filtros + horario + un par de vistas más), no necesita
enrutamiento ni estado complejo, y GitHub Pages sirve estático sin drama.
Migrar a un framework sería mucho trabajo de reescritura para un problema
que hoy no existe — el dolor real era "actualizar el catálogo obliga a
tocar un HTML de 600KB", y eso ya lo resuelve la separación
`template.html` / `data/programs.json` de arriba, sin necesidad de bundler.

## Qué trae esta versión

Esta es la versión final consolidada, con el `index_1.html`/`template.html`
de la auditoría más reciente como base (tarjetas de ramo colapsables,
semáforo de color en el cupo, separación Buscar/×/"Limpiar todo", guía de
5 pasos unificada, panel "Mi horario" más grande, panel lateral "Dataset"),
más lo que esa auditoría no incluía todavía, más lo que faltaba comparado
con el `index.html` real que estaba publicado en GitHub Pages (comparación
hecha campo por campo, no a ojo):

- **Recodificación de color de botones** (verde/naranjo/azul): naranjo
  reservado para Buscar/Agregar, verde para el estado activo de los
  grupos de botones tipo píldora (Todos/Obligatorios/Electivos, pestañas
  de horario, toggle de Simulación), azul para el resto de botones de
  acción (Comenzar simulación, Ya postulé, toggles de modo
  amigable/simulación). En modo amigable estos tres se quedan todos en
  rosado, sin mezclarse con el resto de los temas.
- **Vista de horario responsiva sin toggle manual**: el panel grande de
  "Mi horario" muestra los nombres completos de los ramos en pantallas
  grandes (≥1180px) y los códigos abreviados en celular — antes había que
  elegir a mano con dos botones, ahora es automático según el ancho de
  pantalla (y cambia solo si redimensionas la ventana).
- **Corrección de un bug de mobile real, encontrado en esta ronda**: la
  tabla de secciones de cada ramo (Sec./Profesor/Cupo/Horario/Agregar) no
  entraba en el ancho de un iPhone ni siquiera con la columna Agregar
  reducida a solo ícono — quedaba un scroll horizontal escondido *dentro*
  de la tarjeta, sin ninguna pista de que el botón seguía ahí más a la
  derecha. Bajo 700px cada fila ahora se apila como una tarjetita (número
  + profesor + cupo arriba, horario en su propia línea a lo ancho,
  Agregar abajo a lo ancho con el texto completo) — sin scroll oculto, sin
  overflow, probado de 375px a 1440px.
- **Las tres firmas restauradas**, exactamente como estaban en el
  `index.html` real (se habían perdido al usar la auditoría como base):
  `#chelpaHazeFooter` al fondo de la página principal, la copia completa
  reintroducida al fondo de la Malla curricular (`#chelpaHazeFooterMallaOriginal`,
  con su propia barra colapsable "Sección en construcción"), y la firma
  nueva "nano_gollo" (`.malla-footer-preview`, con Tailwind vía CDN sólo
  para ese bloque) también dentro de la Malla, marcándola como todavía en
  construcción. Las tres son colapsables por separado, cada una con su
  propia clave de `localStorage`, y no se pisan entre sí.
- **Segundo párrafo del disclaimer del pie de página**, sobre cómo el
  Proceso de Postulación de Ramos real habilita los niveles de a uno (a
  partir de lo que explicó el jefe de carrera) — se había perdido en la
  auditoría, junto con el primer párrafo.
- **Panel "Dataset" oculto por defecto**: sólo se muestra visitando
  `index.html?admin` una vez (queda recordado en ese navegador); antes de
  esta corrección se veía siempre, para cualquier visitante.
- **"Filtrar por horario libre" colapsable en modo amigable**: en ese tema
  el panel se ve cerrado por defecto, con un botón chevron para
  desplegarlo; en el resto de los temas se ve exactamente igual que
  siempre.
- **Fix: la Simulación no mostraba ramos.** `render()` decidía mostrar la
  guía de bienvenida (en vez de la lista de ramos) cada vez que no había
  búsqueda/filtro escrito a mano — pero no consideraba que la Simulación
  estuviera activa, así que al arrancarla sin buscar nada antes se veía la
  guía en vez de los ramos ya desbloqueados. Bug ya presente en la
  auditoría usada como base, no introducido por las firmas.
- **Fix: Tailwind (CDN) rompía el estilo del resto del sitio con conexión
  real a internet.** El script de Tailwind agregado para la firma nueva
  (`.malla-footer-preview`) aplica por defecto un reset global
  ("Preflight") a toda la página, no sólo a ese bloque — cambiaba en
  silencio el aspecto de la tabla de secciones y los botones
  Agregar/Agregada en el resto del sitio apenas el navegador lograba bajar
  el CDN (en el sandbox de pruebas ese script queda bloqueado por la red,
  así que no se detectó hasta que el usuario lo vio en su propio
  navegador). Se desactivó el Preflight (`tailwind.config = {
  corePlugins: { preflight: false } }`) para que Tailwind sólo aporte sus
  clases utilitarias dentro de la firma nueva.
- **"Limpiar todo" ahora sólo aparece cuando hay algo que limpiar**, y vive
  justo al lado de "Buscar" (antes al final de la fila, después de los
  filtros). Queda oculto salvo que haya texto en el buscador, algún filtro
  de selección activo (nivel, área, Obligatorios/Electivos, algún bloque de
  "Filtrar por horario libre" marcado), o se haya usado "Buscar" para
  mostrar todos los ramos (ver el punto siguiente) — y vuelve a ocultarse
  en cuanto queda todo limpio de nuevo, sea por el propio botón o quitando
  el último filtro a mano.
- **"Buscar" muestra todos los ramos cuando se aprieta sin haber escrito o
  filtrado nada todavía**: antes, en ese estado, se quedaba mostrando la
  guía de bienvenida sin importar cuántas veces se apretara. Ahora, la
  primera vez que se aprieta "Buscar" sin ninguna búsqueda/filtro aplicado,
  se muestra la lista completa de ramos en vez de la guía (y baja hasta
  ahí, como siempre hacía este botón). "Limpiar todo" (recién visible en
  ese momento) vuelve a dejar la guía de bienvenida.
- **Firmas actualizadas**: la firma principal (al fondo de la página) pasó
  de "v · 1.0" a "v · 1.1", y sus badges de "GIT / FORK / ?-V / 211" a
  "GIT / STATUS / ?-V / 220". La firma nueva dentro de la Malla
  ("Sección en Construcción // WIP v0.9") pasó de "Branch - 211" a
  "Branch - 212" — se mantiene amarilla, sin cambios de color. El graffiti
  "CHELPA HAZE" de esa misma firma pasó de un gradiente teal/naranjo/blanco
  a uno verde, para reflejar que la página ya está estable.
- **Nombres de área amigables**: el filtro de área y la etiqueta de área en
  cada tarjeta de ramo mostraban el código crudo del catálogo tal cual
  ("ADM", "FIN", "RRHH"...) sólo con la primera letra en mayúscula. Ahora
  hay un mapeo a nombre completo (Administración, Finanzas, Recursos
  Humanos, etc.) — y de paso corrige que "FIN"/"FINANZAS" y
  "ECONOMIA"/"ECONOMÍA" (dos grafías del mismo área, según de qué sección
  venían) aparecían como si fueran dos áreas distintas en el filtro; ahora
  se unifican en una sola opción que matchea secciones de ambas grafías.
- **Fix: franja blanca en el pie de la firma principal, arriba de "Francisco
  · chazeware"**: el `<p class="chz-signoff">` no tenía `margin:0`, así que
  el navegador le ponía su margen por defecto encima — como todo alrededor
  es fondo oscuro, ese margen dejaba ver el fondo blanco de la página por
  debajo, como una franja. Mismo fix aplicado a las tres firmas
  (`#chelpaHazeFooter`, `#chelpaHazeFooterMallaOriginal`) y, de paso, se
  repuso un reset de márgenes para los encabezados/párrafos dentro de la
  firma nueva (`#chelpaHazeFooterMalla`) que dependían del Preflight de
  Tailwind (desactivado la ronda pasada) para no tener el mismo problema.
- **Firmas — segunda ronda de ajustes**, para diferenciar los tres estados
  (lista / estable / en construcción):
  - `#chelpaHazeFooterMalla` (graffiti verde "CHELPA HAZE", dentro de la
    Malla): la barra pasó de "Sección en Construcción // WIP v0.9
    Branch - 212" a **"Sección Lista // v1.0 Branch - 215"**, y su punto
    (antes rojo) ahora es **amarillo/ámbar** — el usuario aclaró que
    aunque el graffiti ya está "lista", falta integrar la Malla al resto
    del sitio, así que ni rojo ni verde todavía. Sus badges de
    "DEVELOPER" pasaron de `SASS / Ruby / Python / scrappy-coco`
    (duplicados de las otras dos firmas) a **`Frontend / Backend / UI/UX
    / .ai`**.
  - `#chelpaHazeFooterMallaOriginal` (copia completa al fondo de la
    Malla, badge "GIT / FORK / ?-V / 211"): pasó de decir **"STABLE"**
    (punto verde) a **"Sitio en Construcción"** (punto amarillo/ámbar,
    mismo tono que el resto de la firma).
  - `#chelpaHazeFooter` (firma principal al fondo de la página, badge
    "GIT / STATUS / ?-V / 220"): se mantiene en **"STABLE"** con su
    punto verde de siempre, pero el título "dev/Chelpa" y "Haze" (antes
    en gradiente ámbar/naranjo) ahora es **verde**, para que coincida
    con el estado "stable" del badge.
- **Firmas — corrección: dos de los cambios de la ronda anterior se
  revirtieron**, a pedido del usuario, que mandó dos capturas de cómo se
  veían antes (nombradas `#chelpaFooter` y `#chelpaEnConstru` para tener
  una referencia clara al conversar) y pidió volver a esas dos:
  - `#chelpaHazeFooterMalla` (el grafiti "CHELPA HAZE" dentro de la
    Malla) vuelve a ser **`#chelpaEnConstru`**: la barra vuelve a decir
    "Sección en Construcción // WIP v0.9 Branch - 212" (se deshace el
    "Sección Lista // v1.0 Branch - 215" de la ronda pasada), su punto
    vuelve a **rojo** (se deshace el ámbar), el grafiti vuelve al
    gradiente **teal/naranjo/blanco** original (se deshace el verde de
    hace dos rondas) y sus badges "DEVELOPER" vuelven a `SASS / Ruby /
    Python / scrappy-coco` (se deshace `Frontend / Backend / UI/UX /
    .ai`). Motivo: la Malla todavía no está integrada al resto del
    sitio, así que el estado real sigue siendo "en construcción", no
    "lista".
  - `#chelpaHazeFooterMallaOriginal` (la copia al fondo de la Malla,
    badge "GIT / FORK / ?-V / 211") vuelve a ser **`#chelpaFooter`**:
    la barra vuelve a decir **"STABLE"** y su punto vuelve a **verde**
    (se deshace el "Sitio en Construcción" + ámbar de la ronda pasada).
  - `#chelpaHazeFooter` (la firma principal, badge "GIT / STATUS / ?-V /
    220") NO cambia en esta corrección: sigue en "STABLE" con punto
    verde y título "dev/Chelpa · Haze" en verde, como quedó confirmado
    la ronda anterior.

## Features

- Búsqueda por código, ramo o profesor; filtros de nivel, área y
  obligatorios/electivos; filtro de horario libre (clic en un bloque de la
  grilla para ver sólo lo que calza); tarjetas de ramo colapsables.
- "Mi horario": grilla semanal compartida entre ambos programas, detección
  de choques, calendario de pruebas (PEP1/PEP2), impresión, vista con
  nombres completos (desktop) / códigos abreviados (mobile) automática.
- Selector de programa (Ingeniería Comercial ↔ Mención Economía) sin
  recargar la página.
- Simulación de postulación por nivel, Malla curricular interactiva con
  seguimiento de ramos aprobados/prerrequisitos/disponibles, para ambos
  programas.
- Modo oscuro, modo amigable (tema alternativo), semáforo de color en el
  cupo de cada sección, panel "Dataset" con el conteo del catálogo activo
  (visible sólo con `?admin`).
- Tres firmas de autor ("chazeware"), colapsables, en el pie de página y al
  fondo de la Malla curricular — decorativas, no afectan la funcionalidad.
- Sin backend, sin `localStorage` de terceros — todo el estado del alumno
  (horario armado, ramos aprobados, tema, panel admin, firmas
  abiertas/cerradas) vive en el propio navegador.

## Verificación

Probado con Playwright contra el `index.html` generado por `node build.js`:
meta tags y topbar muestran el programa/semestre reales (no placeholders
literales); acordeón de tarjetas colapsa/expande sin errores; semáforo de
cupo y colores verde/naranjo/azul correctos en claro, oscuro y amigable;
cambio de programa ida y vuelta; Malla curricular con datos reales para
ambos programas; Simulación completa (abrir, elegir nivel, comenzar); vista
de horario grande alterna sola entre nombres (≥1180px) y números (<1180px);
tabla de secciones se apila en tarjetas sin scroll oculto ni overflow en
375/390/430/700/900/1180/1440px; las tres firmas presentes y funcionales
(se abren/cierran, el humo animado corre sin error); panel Dataset oculto
por defecto y visible con `?admin` (se recuerda tras recargar sin el
parámetro); "Filtrar por horario libre" colapsado por defecto en modo
amigable y desplegable con el chevron. Cero errores de consola en todos los
casos (fuera de los `ERR_TUNNEL_CONNECTION_FAILED` de Google Fonts/Tailwind
CDN/Google Tag Manager, esperables en este sandbox de pruebas sin salida a
internet real).

Ronda de firmas (con corrección posterior) verificada aparte:
`#chelpaHazeFooterMalla` vuelve a mostrar "SECCIÓN EN CONSTRUCCIÓN // WIP
v0.9 Branch - 212" con punto rojo, grafiti teal/naranjo/blanco y badges
SASS/Ruby/Python/scrappy-coco; `#chelpaHazeFooterMallaOriginal` vuelve a
mostrar "STABLE" con punto verde; `#chelpaHazeFooter` se mantiene en
"STABLE" con punto verde y título "dev/Chelpa"/"Haze" en verde (sin
cambios en esta corrección). Se reconfirmó el resto de la suite
(simulador, "Limpiar todo", nombres de área, franja del footer) sin
regresiones.
