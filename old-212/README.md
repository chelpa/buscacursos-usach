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

Esta es la versión final consolidada: parte del rediseño/auditoría más
reciente (tarjetas de ramo colapsables, semáforo de color en el cupo,
separación Buscar/×/"Limpiar todo", guía de 5 pasos unificada, panel
"Mi horario" más grande, panel lateral "Dataset" con el conteo del
catálogo, sin el aviso de "Sección en construcción" que traía la Malla) y
le suma lo que esa auditoría no incluía todavía:

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
  cupo de cada sección, panel "Dataset" con el conteo del catálogo activo.
- Sin backend, sin `localStorage` de terceros — todo el estado del alumno
  (horario armado, ramos aprobados, tema) vive en el propio navegador.

## Verificación

Probado con Playwright contra el `index.html` generado por `node build.js`:
meta tags y topbar muestran el programa/semestre reales (no placeholders
literales); "Todos" filtra a 54 resultados; acordeón de tarjetas
colapsa/expande sin errores; semáforo de cupo y colores verde/naranjo/azul
correctos en claro, oscuro y amigable; cambio de programa ida y vuelta;
Malla curricular con datos reales para ambos programas y sin ningún rastro
del aviso de "construcción"; Simulación completa (abrir, elegir nivel,
comenzar); vista de horario grande alterna sola entre nombres (≥1180px) y
números (<1180px); tabla de secciones se apila en tarjetas sin scroll
oculto ni overflow en 375/390/430/700/900/1180/1440px. Cero errores de
consola en todos los casos.
