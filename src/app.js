// Función reutilizable (antes era una IIFE fija a los ids del footer
// principal) — hay una segunda copia de la firma dentro de la Malla
// curricular, sólo de prueba (ver "Vista previa de firma dentro de la
// Malla" más abajo), que necesita su propia instancia de este humo animado
// con su propio canvas.
function initChzSmoke(footerId, canvasId){
  var footer = document.getElementById(footerId);
  if (!footer) return;
  var banner = footer.querySelector('.chz-banner');
  var canvas = document.getElementById(canvasId);
  if (!banner || !canvas) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var particles = [];
  var running = false;
  var raf = null;

  function resize(){
    var rect = banner.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
  }
  resize();
  window.addEventListener('resize', resize);

  function spawn(){
    for (var i = 0; i < 2; i++){
      particles.push({
        x: canvas.width / 2 + (Math.random() - 0.5) * 60,
        y: canvas.height * 0.75,
        r: 4 + Math.random() * 9,
        vy: -0.25 - Math.random() * 0.5,
        vx: (Math.random() - 0.5) * 0.35,
        alpha: 0.3 + Math.random() * 0.22,
        color: Math.random() > 0.5 ? '150,150,150' : '224,172,84'
      });
    }
  }

  function tick(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(function(p){
      p.x += p.vx; p.y += p.vy; p.r += 0.06; p.alpha -= 0.0035;
      ctx.beginPath();
      ctx.fillStyle = 'rgba(' + p.color + ',' + Math.max(p.alpha, 0) + ')';
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });
    particles = particles.filter(function(p){ return p.alpha > 0 && p.y > -20; });
    if (running){
      if (Math.random() < 0.12) spawn();
      raf = requestAnimationFrame(tick);
    }
  }

  function start(){
    if (running) return;
    // Bug real encontrado por el usuario: esta función se llama al cargar
    // el script, con la firma todavía colapsada (#chz-body oculto) — en ese
    // momento .chz-banner mide 0×0, así que el resize() de arriba (el que
    // corre una sola vez al inicio) deja el canvas con un buffer de 1×1px
    // que después nunca se vuelve a medir (sólo escucha el evento 'resize'
    // de la VENTANA, no que la firma se despliegue). Al desplegar la firma
    // más tarde, ese buffer de 1px queda estirado por CSS a todo el ancho
    // real → una mancha sólida en vez del humo. Fix: volver a medir justo
    // acá, en el momento real en que el cuadro pasa a estar visible de
    // verdad (llamado por el IntersectionObserver de abajo).
    resize();
    running = true;
    tick();
  }
  function stop(){
    running = false;
    if (raf) cancelAnimationFrame(raf);
    raf = null;
  }

  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.15 });
    io.observe(footer);
  } else {
    start();
  }
}
initChzSmoke('chelpaHazeFooter', 'chzSmoke');

// Mini-juego "matar chinitas" dentro del cuadro "chelpa.sh" (el que tiene
// el efecto de matriz verde) de la firma principal. Es una capa aparte
// que no reemplaza el efecto de matriz ni el resto del cuadro — sólo le
// agrega bichos (🐛 oruga, 🐜 hormiga: suman puntos; 🐞 chinita roja:
// resta) que aparecen solos y se pueden aplastar con click o con touch.
// Reutiliza el mismo patrón de IntersectionObserver que initChzSmoke de
// arriba: sólo gasta ciclos mientras el cuadro está visible de verdad (la
// firma "STABLE" desplegada y a la vista) — si la firma está cerrada
// (`hidden`), el cuadro mide 0×0 y no intersecta, así que el spawn se
// detiene solo sin lógica extra.
function initChzBugGame(footerId){
  var footer = document.getElementById(footerId);
  if (!footer) return;
  var box = footer.querySelector('.chz-card-logo');
  var layer = footer.querySelector('.chz-bug-layer');
  var scoreEl = footer.querySelector('.chz-bug-score');
  if (!box || !layer || !scoreEl) return;

  var GOOD = ['🐛', '🐜'];
  var BAD = '🐞';
  var MAX_ALIVE = 5;
  var SPAWN_MS = 900;
  var LIFETIME_MS = 3200;

  var score = 0;
  var alive = [];
  var spawnTimer = null;

  // Badge estilo "contador de insecticida" (a pedido del usuario) — ☠️ en
  // vez del bicho 🐛 de antes, como un kill-count de videojuego.
  function updateScore(){
    scoreEl.textContent = '☠️ ' + score;
    scoreEl.classList.toggle('chz-bug-score--bad', score < 0);
  }
  updateScore();

  function removeBug(el){
    alive = alive.filter(function(a){ return a !== el; });
    if (el.parentNode) el.parentNode.removeChild(el);
  }

  function floatPoints(x, y, delta){
    var pts = document.createElement('span');
    pts.className = 'chz-bug-points';
    pts.style.left = x + 'px';
    pts.style.top = y + 'px';
    pts.style.color = delta >= 0 ? '#4ade80' : '#ff5f57';
    pts.textContent = (delta >= 0 ? '+' : '') + delta;
    layer.appendChild(pts);
    setTimeout(function(){ if (pts.parentNode) pts.parentNode.removeChild(pts); }, 650);
  }

  // "Disparo"/explosión al aplastar un bicho — un flash circular
  // (chz-bug-flash) más un puñado de chispas (chz-bug-spark) que salen
  // disparadas en distintos ángulos desde el punto de impacto, como si el
  // bicho hubiera recibido un balazo. Puramente visual, no cambia el
  // puntaje (eso ya lo hace floatPoints). A pedido del usuario, el color
  // ahora depende de si sumó o restó puntaje: verde si sumó (bicho bueno),
  // rojo si restó (chinita roja) — ver los modificadores --good/--bad en
  // styles.css.
  function spawnExplosion(x, y, isGood){
    var variant = isGood ? '--good' : '--bad';
    var flash = document.createElement('span');
    flash.className = 'chz-bug-flash chz-bug-flash' + variant;
    flash.style.left = x + 'px';
    flash.style.top = y + 'px';
    layer.appendChild(flash);
    setTimeout(function(){ if (flash.parentNode) flash.parentNode.removeChild(flash); }, 280);

    var n = 7;
    for (var i = 0; i < n; i++){
      var angle = (Math.PI * 2 * i / n) + (Math.random() - 0.5) * 0.6;
      var dist = 16 + Math.random() * 16;
      var spark = document.createElement('span');
      spark.className = 'chz-bug-spark chz-bug-spark' + variant;
      spark.style.left = x + 'px';
      spark.style.top = y + 'px';
      spark.style.setProperty('--dx', (Math.cos(angle) * dist).toFixed(1) + 'px');
      spark.style.setProperty('--dy', (Math.sin(angle) * dist).toFixed(1) + 'px');
      layer.appendChild(spark);
      (function(s){ setTimeout(function(){ if (s.parentNode) s.parentNode.removeChild(s); }, 420); })(spark);
    }
  }

  function squash(el, isBad){
    if (el.dataset.squashed) return;
    el.dataset.squashed = '1';
    var delta = isBad ? -3 : 1;
    score += delta;
    updateScore();
    var x = parseFloat(el.style.left) || 0, y = parseFloat(el.style.top) || 0;
    floatPoints(x, y, delta);
    spawnExplosion(x, y, !isBad);
    el.classList.add('chz-bug--squash');
    setTimeout(function(){ removeBug(el); }, 220);
  }

  function spawnBug(){
    if (alive.length >= MAX_ALIVE) return;
    var rect = box.getBoundingClientRect();
    var w = rect.width || 320, h = rect.height || 190;
    var isBad = Math.random() < 0.22;
    var emoji = isBad ? BAD : GOOD[Math.floor(Math.random() * GOOD.length)];
    var el = document.createElement('span');
    el.className = 'chz-bug';
    el.textContent = emoji;
    el.style.left = (10 + Math.random() * Math.max(10, w - 40)) + 'px';
    el.style.top = (10 + Math.random() * Math.max(10, h - 40)) + 'px';
    function onHit(e){ e.preventDefault(); e.stopPropagation(); squash(el, isBad); }
    el.addEventListener('click', onHit);
    el.addEventListener('touchstart', onHit, { passive: false });
    layer.appendChild(el);
    alive.push(el);
    setTimeout(function(){
      if (!el.dataset.squashed) removeBug(el);
    }, LIFETIME_MS + Math.random() * 1200);
  }

  function start(){
    if (spawnTimer) return;
    spawnTimer = setInterval(spawnBug, SPAWN_MS);
  }
  function stop(){
    if (spawnTimer){ clearInterval(spawnTimer); spawnTimer = null; }
  }

  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.1 });
    io.observe(box);
  } else {
    start();
  }
}
initChzBugGame('chelpaHazeFooter');

// "Lluvia" de glifos verdes cayendo dentro de .chz-matrix, a pedido del
// usuario ("más verde estilo matrix") — se suma al brillo/líneas ya
// reforzadas por CSS (ver #chelpaHazeFooter .chz-matrix en styles.css).
// Mismo patrón de visibilidad que initChzSmoke/initChzBugGame: sólo
// gasta ciclos mientras el cuadro de la matriz está realmente a la vista.
function initChzMatrixRain(footerId){
  var footer = document.getElementById(footerId);
  if (!footer) return;
  var matrix = footer.querySelector('.chz-matrix');
  if (!matrix) return;

  var GLYPHS = '01アイウエオカキクケコサシスセソ0123456789'.split('');
  var SPAWN_MS = 220;
  var FALL_MS = 3200;
  var spawnTimer = null;

  function spawnGlyph(){
    var el = document.createElement('span');
    el.className = 'chz-matrix-glyph';
    el.textContent = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    el.style.left = (Math.random() * 96) + '%';
    el.style.animationDuration = (1.6 + Math.random() * 1.4) + 's';
    matrix.appendChild(el);
    setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, FALL_MS);
  }

  function start(){
    if (spawnTimer) return;
    spawnTimer = setInterval(spawnGlyph, SPAWN_MS);
  }
  function stop(){
    if (spawnTimer){ clearInterval(spawnTimer); spawnTimer = null; }
  }

  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        if (entry.isIntersecting) start(); else stop();
      });
    }, { threshold: 0.1 });
    io.observe(matrix);
  } else {
    start();
  }
}
initChzMatrixRain('chelpaHazeFooter');

// Mini-juego "nube voladora" dentro de la copia de la firma que vive al
// fondo de la Malla curricular (#chelpaHazeFooterMallaOriginal — la que
// tiene la línea inferior ámbar). Estilo Dragon Ball Z sin dibujar ningún
// personaje con derechos de autor: una nube con un rayo debajo, con
// "usachin" (una mascota león genérica, dibujada a mano en canvas) montado
// arriba — el jugador la hace "aletear" con click/touch (Flappy Bird).
// Fondo: lluvia de código verde estilo Matrix, con opacidad, dibujada
// directo en el canvas. Temática educativa a pedido del usuario: se
// esquivan vallas de carrera (dan un "stun" temporal, no restan puntaje —
// hay que "saltarlas" con el aleteo, como en los 100 metros con vallas) y
// se juntan libros/cuadernos 📚 (+1 "ramo aprobado", el puntaje real del
// juego) y nubes-boost (☁️, aumentan la velocidad hacia adelante por un
// rato); la carne 🍖 en cambio RETRASA a usachin (aplica una frenada
// temporal, sin dar puntos). Cada cierta distancia aparece Kong (🦍) como
// cameo de fondo. El juego arranca con una pantalla de inicio ("toca para
// empezar") antes de que corra ninguna física/spawn — sólo el fondo de
// Matrix se ve animando. 3 stuns seguidos (sin juntar nada positivo entre
// medio) = game over: el loop se pausa del todo (mejor para el
// rendimiento, a pedido del usuario) y muestra los ramos aprobados de esa
// vuelta; un click/touch reinicia. Mismo patrón de IntersectionObserver
// que initChzSmoke/initChzBugGame/initChzMatrixRain: el loop de rAF sólo
// corre mientras el cuadro está realmente visible.
function initChzNimbusGame(footerId){
  var footer = document.getElementById(footerId);
  if (!footer) return;
  var box = footer.querySelector('.chz-card-logo');
  var canvas = document.getElementById('chzNimbusCanvas');
  var scoreEl = document.getElementById('chzNimbusScore');
  if (!box || !canvas || !scoreEl) return;
  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var W = 0, H = 150;
  var DPR = Math.max(1, window.devicePixelRatio || 1);
  var GLYPHS = '01アイウエオカキクケコサシスセソ0123456789'.split('');
  var columns = [];

  function initColumns(){
    var count = Math.max(6, Math.floor(W / 16));
    columns = [];
    for (var i = 0; i < count; i++){
      columns.push({
        x: (i + 0.5) * (W / count),
        y: Math.random() * H,
        speed: 1.2 + Math.random() * 1.6,
        char: GLYPHS[Math.floor(Math.random() * GLYPHS.length)]
      });
    }
  }

  function resize(){
    var rect = box.getBoundingClientRect();
    W = Math.max(1, Math.round(rect.width));
    canvas.width = Math.round(W * DPR);
    canvas.height = Math.round(H * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    initColumns();
  }
  resize();
  window.addEventListener('resize', resize);

  var GRAVITY = 0.32;
  var FLAP = -5.6;
  var BASE_SPEED = 2.6;
  var BOOST_SPEED = 4.6;
  var SLOW_SPEED = 1.3;
  var BOOST_FRAMES = 220; // ~3.6s a 60fps
  var SLOW_FRAMES = 160; // ~2.6s a 60fps — la carne "retrasa" a usachin
  var STUN_FRAMES = 72; // ~1.2s a 60fps

  var cloud = { x: W * 0.24 || 70, y: H / 2, vy: 0, r: 14 };
  var score = 0; // = ramos aprobados (sólo suma al juntar un libro/cuaderno)
  var distance = 0;
  var obstacles = []; // {x, kind:'hurdle'|'boost', ...}
  var pickups = []; // {x, y, taken, kind:'book'|'meat'}
  var kong = null; // {x, until}
  var nextObstacleAt = 0;
  var nextPickupAt = 0;
  var nextKongAt = 900;
  var speedEffect = null; // 'boost' | 'slow' | null
  var speedFramesLeft = 0;
  var stunFramesLeft = 0;
  var stunStreak = 0;
  var started = false;
  var gameOver = false;
  var visible = false;
  var running = false;
  var raf = null;

  function updateScore(){
    scoreEl.textContent = '📚 ' + score;
    scoreEl.classList.toggle('chz-nimbus-score--bad', score < 0);
  }
  updateScore();

  function resetRun(){
    score = 0;
    distance = 0;
    cloud.y = H / 2;
    cloud.vy = 0;
    obstacles = [];
    pickups = [];
    kong = null;
    nextObstacleAt = 0;
    nextPickupAt = 0;
    nextKongAt = 900;
    speedEffect = null;
    speedFramesLeft = 0;
    stunFramesLeft = 0;
    stunStreak = 0;
    gameOver = false;
    updateScore();
  }

  function onTap(e){
    e.preventDefault();
    if (!started){ started = true; cloud.vy = FLAP; return; }
    if (gameOver){ resetRun(); syncRunning(); return; }
    if (stunFramesLeft > 0) return;
    cloud.vy = FLAP;
  }
  canvas.addEventListener('click', onTap);
  canvas.addEventListener('touchstart', onTap, { passive: false });

  function triggerStun(){
    if (stunFramesLeft > 0 || gameOver) return;
    stunFramesLeft = STUN_FRAMES;
    stunStreak += 1;
    if (stunStreak >= 3){
      gameOver = true;
    }
  }

  function spawnObstacle(){
    var kind = Math.random() < 0.55 ? 'hurdle' : 'boost';
    if (kind === 'hurdle'){
      obstacles.push({
        // Valla de carrera (100m vallas) en vez de montaña — bajita, se
        // salta con el aleteo. h/w bastante menores que la vieja montaña.
        kind: 'hurdle', x: W + 20,
        h: 18 + Math.random() * 22,
        w: 30 + Math.random() * 14
      });
    } else {
      obstacles.push({
        kind: 'boost', x: W + 20,
        y: 18 + Math.random() * (H - 60),
        r: 9 + Math.random() * 5,
        vy: (Math.random() - 0.5) * 0.6
      });
    }
  }

  function spawnPickup(){
    var kind = Math.random() < 0.7 ? 'book' : 'meat';
    pickups.push({ x: W + 20, y: 20 + Math.random() * (H - 40), taken: false, kind: kind });
  }

  function maybeSpawnKong(){
    kong = { x: W + 40, until: distance + 260 };
  }

  function collide(ax, ay, ar, bx, by, br){
    var dx = ax - bx, dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy) < (ar + br);
  }

  function drawMatrixBackdrop(){
    ctx.fillStyle = '#050b06';
    ctx.fillRect(0, 0, W, H);
    ctx.font = '13px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    columns.forEach(function(c){
      ctx.fillStyle = 'rgba(74,222,128,.35)';
      ctx.fillText(c.char, c.x, c.y);
      c.y += c.speed;
      if (c.y > H + 10){
        c.y = -10;
        c.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
        c.speed = 1.2 + Math.random() * 1.6;
      } else if (Math.random() < 0.02){
        c.char = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
      }
    });
  }

  // Nube + rayo (sin personaje con derechos de autor) con "usachin" — una
  // mascota león genérica, dibujada a mano con formas simples — montada
  // arriba, a pedido del usuario ("la nube con rayo debería ser usachin
  // encima"). Se dibuja después de la nube para quedar siempre por
  // delante (más arriba en el orden de dibujo = más adelante visualmente).
  function drawCloud(x, y){
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = stunFramesLeft > 0 && Math.floor(stunFramesLeft / 6) % 2 === 0 ? '#ffb3b3' : '#f5f7fa';
    ctx.beginPath();
    ctx.ellipse(0, 4, 15, 8, 0, 0, Math.PI * 2);
    ctx.ellipse(-9, 2, 9, 6, 0, 0, Math.PI * 2);
    ctx.ellipse(9, 2, 9, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c14e';
    ctx.beginPath();
    ctx.moveTo(-2, 10);
    ctx.lineTo(4, 10);
    ctx.lineTo(0, 20);
    ctx.lineTo(5, 20);
    ctx.lineTo(-4, 32);
    ctx.lineTo(1, 21);
    ctx.lineTo(-4, 21);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  function drawUsachin(x, y){
    ctx.save();
    ctx.translate(x, y - 13);
    // melena (mane) — puntas alrededor de la cara
    ctx.fillStyle = '#7a4a1e';
    var spikes = 10;
    for (var i = 0; i < spikes; i++){
      var a = (Math.PI * 2 * i) / spikes;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * 9, Math.sin(a) * 9, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // cara
    ctx.fillStyle = '#e8a33d';
    ctx.beginPath();
    ctx.arc(0, 0, 7, 0, Math.PI * 2);
    ctx.fill();
    // orejas
    ctx.fillStyle = '#7a4a1e';
    ctx.beginPath(); ctx.arc(-6, -6, 2.4, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(6, -6, 2.4, 0, Math.PI * 2); ctx.fill();
    // hocico
    ctx.fillStyle = '#f2c98a';
    ctx.beginPath(); ctx.ellipse(0, 3, 3, 2, 0, 0, Math.PI * 2); ctx.fill();
    // ojos
    ctx.fillStyle = stunFramesLeft > 0 ? '#ff5f57' : '#2a1a08';
    ctx.beginPath(); ctx.arc(-2.6, -0.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(2.6, -0.5, 1, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

  // Valla de carrera (100m vallas) en vez de la montaña de antes, a
  // pedido del usuario — dos parantes + un travesaño con franjas
  // rojo/blanco, estilo atletismo. Se sigue esquivando "saltándola" con
  // el mismo aleteo de siempre.
  function drawHurdle(o){
    var top = H - o.h;
    var legW = 3;
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(o.x - o.w / 2, top, legW, o.h);
    ctx.fillRect(o.x + o.w / 2 - legW, top, legW, o.h);
    ctx.fillStyle = '#ff5f57';
    ctx.fillRect(o.x - o.w / 2 - 3, top - 4, o.w + 6, 5);
    ctx.fillStyle = '#f5f7fa';
    ctx.fillRect(o.x - o.w / 2 - 3, top - 4, (o.w + 6) / 2, 5);
  }

  function drawBoostCloud(o){
    ctx.font = (o.r * 2) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('☁️', o.x, o.y);
  }

  function drawPickup(p){
    ctx.font = '16px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(p.kind === 'meat' ? '🍖' : '📚', p.x, p.y);
  }

  function drawKong(k){
    ctx.font = '34px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.fillText('🦍', k.x, H - 6);
  }

  function drawStartOverlay(){
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,5,.35)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 16px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶ EMPEZAR', W / 2, H / 2 - 6);
    ctx.fillStyle = '#cbd5c0';
    ctx.font = '11px monospace';
    ctx.fillText('toca para jugar', W / 2, H / 2 + 14);
    ctx.restore();
  }

  function drawGameOverOverlay(){
    ctx.save();
    ctx.fillStyle = 'rgba(5,5,5,.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ff5f57';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('GAME OVER', W / 2, H / 2 - 18);
    ctx.fillStyle = '#f5f7fa';
    ctx.font = '12px monospace';
    ctx.fillText('toca para reintentar', W / 2, H / 2 + 6);
    ctx.fillStyle = '#4ade80';
    ctx.font = 'bold 12px monospace';
    ctx.fillText('📚 ' + score + ' ramos aprobados', W / 2, H / 2 + 24);
    ctx.restore();
  }

  function tick(){
    ctx.clearRect(0, 0, W, H);
    drawMatrixBackdrop();

    // Pantalla de inicio: sólo se ve el fondo de Matrix animando + el
    // cartel "EMPEZAR", sin física ni spawns todavía (a pedido del
    // usuario). El primer click/touch (ver onTap) pone started=true.
    if (!started){
      drawStartOverlay();
      if (running) raf = requestAnimationFrame(tick);
      return;
    }

    var speed = BASE_SPEED;
    if (speedFramesLeft > 0){
      speed = speedEffect === 'boost' ? BOOST_SPEED : SLOW_SPEED;
      speedFramesLeft--;
      if (speedFramesLeft === 0) speedEffect = null;
    }

    distance += speed;
    if (stunFramesLeft <= 0){
      cloud.vy += GRAVITY;
      cloud.y += cloud.vy;
    } else {
      cloud.vy += GRAVITY * 0.6;
      cloud.y += cloud.vy;
    }
    if (cloud.y < cloud.r){ cloud.y = cloud.r; cloud.vy = 0; }
    if (cloud.y > H - cloud.r){ cloud.y = H - cloud.r; cloud.vy = 0; }

    if (distance >= nextObstacleAt){
      spawnObstacle();
      nextObstacleAt = distance + 90 + Math.random() * 70;
    }
    if (distance >= nextPickupAt){
      spawnPickup();
      nextPickupAt = distance + 130 + Math.random() * 90;
    }
    if (!kong && distance >= nextKongAt){
      maybeSpawnKong();
      nextKongAt = distance + 900 + Math.random() * 400;
    }

    obstacles.forEach(function(o){
      o.x -= speed;
      if (o.kind === 'boost'){
        o.y += o.vy;
        if (o.y < 14 || o.y > H - 14) o.vy *= -1;
      }
    });
    obstacles = obstacles.filter(function(o){ return o.x > -60; });

    pickups.forEach(function(p){ p.x -= speed; });
    pickups = pickups.filter(function(p){ return p.x > -20 && !p.taken; });

    obstacles.forEach(function(o){
      if (o.kind === 'hurdle'){
        drawHurdle(o);
        var top = H - o.h;
        var withinX = Math.abs(o.x - cloud.x) < (o.w / 2 + cloud.r * 0.6);
        if (withinX && cloud.y + cloud.r * 0.7 > top && !o.hit){
          o.hit = true;
          triggerStun();
        }
      } else {
        drawBoostCloud(o);
        if (!o.hit && collide(cloud.x, cloud.y, cloud.r * 0.7, o.x, o.y, o.r)){
          o.hit = true;
          speedEffect = 'boost';
          speedFramesLeft = BOOST_FRAMES;
          stunStreak = 0;
        }
      }
    });

    pickups.forEach(function(p){
      drawPickup(p);
      if (!p.taken && collide(cloud.x, cloud.y, cloud.r * 0.8, p.x, p.y, 9)){
        p.taken = true;
        if (p.kind === 'meat'){
          // La carne retrasa a usachin (a pedido del usuario) — no da
          // puntos, sólo frena por un rato.
          speedEffect = 'slow';
          speedFramesLeft = SLOW_FRAMES;
        } else {
          score += 1; // +1 ramo aprobado
          stunStreak = 0;
        }
        updateScore();
      }
    });

    if (kong){
      kong.x -= speed * 0.6;
      drawKong(kong);
      if (distance >= kong.until || kong.x < -60) kong = null;
    }

    drawCloud(cloud.x, cloud.y);
    drawUsachin(cloud.x, cloud.y);

    if (stunFramesLeft > 0) stunFramesLeft--;

    if (gameOver) drawGameOverOverlay();

    if (running) raf = requestAnimationFrame(tick);
  }

  // running sólo debería estar prendido mientras el cuadro está visible Y
  // no estamos en pantalla de "game over" (ahí se pausa el loop entero —
  // mejor para el rendimiento, a pedido del usuario — hasta que se
  // reinicia con un click/touch).
  function syncRunning(){
    var shouldRun = visible && !gameOver;
    if (shouldRun && !running){
      running = true;
      // Bug real encontrado por el usuario: si esto arranca con el cuadro
      // todavía colapsado/oculto, resize() mide 0 de ancho y el canvas
      // queda con un buffer de 1px que después se ve estirado por CSS
      // (una mancha sólida). Igual que en initChzSmoke: medir de nuevo
      // justo acá, en el momento real en que pasa a estar visible.
      resize();
      tick();
    } else if (!shouldRun && running){
      running = false;
      if (raf) cancelAnimationFrame(raf);
      raf = null;
    }
  }

  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(entry){
        visible = entry.isIntersecting;
        syncRunning();
      });
    }, { threshold: 0.1 });
    io.observe(box);
  } else {
    visible = true;
    syncRunning();
  }
}
initChzNimbusGame('chelpaHazeFooterMallaOriginal');

const PROGRAMS = __DATA__;
let programKey = 'ingeco';
let SECTIONS = PROGRAMS[programKey].sections;

// "Mi horario" is one shared schedule across both programs (a student in
// Mención Economía still takes most courses from the general catalog), so
// it's saved under a single key and never reset when the program toggle
// switches which catalog is being browsed/searched.
const SELECTION_STORAGE_KEY = 'bc-usach-seleccion';

// Combined lookup across both programs' sections — used for stable color
// assignment and to resolve "Mi horario" entries regardless of which
// program's catalog is currently active for browsing.
const ALL_SECTIONS = [].concat(PROGRAMS.ingeco.sections, PROGRAMS.economia.sections);
const ALL_COURSE_MAP = new Map();
for(const s of ALL_SECTIONS){
  if(!ALL_COURSE_MAP.has(s.codigo)){
    ALL_COURSE_MAP.set(s.codigo, {
      codigo: s.codigo, asignatura: s.asignatura, area: s.area,
      nivel: s.nivel, sct: s.sct, secciones: []
    });
  }
  ALL_COURSE_MAP.get(s.codigo).secciones.push(s);
}
const ALL_CODES = Array.from(ALL_COURSE_MAP.keys());

const MODULOS = {
  1:['08:15','09:35'], 2:['09:50','11:10'], 3:['11:25','12:45'], 4:['13:45','15:05'],
  5:['15:20','16:40'], 6:['16:55','18:15'], 7:['18:45','20:05'], 8:['20:05','21:25'], 9:['21:25','22:45']
};
const BLOQUES = [1,2,3,4,5,6,7,8,9];
const DIAS = ['L','M','W','J','V','S'];
const DIA_LABEL = {L:'Lun', M:'Mar', W:'Mié', J:'Jue', V:'Vie', S:'Sáb'};
const DIA_LABEL_FULL = {L:'Lunes', M:'Martes', W:'Miércoles', J:'Jueves', V:'Viernes', S:'Sábado'};
const HUES = [210, 152, 271, 45, 190, 95, 255, 320];

// ---------- Áreas: nombre amigable + normalización ----------
// El catálogo trae el área como código crudo (ADM, FIN, RRHH, ...), y a
// veces el mismo área con dos grafías distintas según de qué sección salió
// (ECONOMIA sin tilde vs ECONOMÍA con tilde, FIN vs FINANZAS) — sin esto
// esas dos grafías aparecían como dos áreas separadas en el filtro. Acá se
// mapea a un nombre amigable y se usa ESE nombre como valor canónico del
// filtro (no el código crudo), así "FIN" y "FINANZAS" quedan como una sola
// opción "Finanzas" que matchea secciones de ambas grafías.
const AREA_LABELS = {
  'ADM': 'Administración',
  'CONTABILIDAD': 'Contabilidad',
  'DIRECCION': 'Dirección',
  'ECONOMIA': 'Economía',
  'ECONOMÍA': 'Economía',
  'ESTRATEGIA': 'Estrategia',
  'FIN': 'Finanzas',
  'FINANZAS': 'Finanzas',
  'INGLES': 'Inglés',
  'MARKETING': 'Marketing',
  'OPERACIÓN': 'Operación',
  'ORG INDUSTRIAL': 'Organización Industrial',
  'RRHH': 'Recursos Humanos',
  'TALLERES': 'Talleres',
};
function areaLabel(raw){
  if(!raw) return raw;
  return AREA_LABELS[raw] || (raw.charAt(0) + raw.slice(1).toLowerCase());
}

// ---------- Build course groups (re-run on program switch) ----------
let courseMap, COURSES, nivelSet, areaSet;
const selNivel = document.getElementById('f-nivel');
const selArea = document.getElementById('f-area');
function resetSelect(selectEl){
  while(selectEl.options.length > 1) selectEl.remove(1);
}
function rebuildProgramDerived(){
  courseMap = new Map();
  for(const s of SECTIONS){
    if(!courseMap.has(s.codigo)){
      courseMap.set(s.codigo, {
        codigo: s.codigo, asignatura: s.asignatura, area: s.area,
        nivel: s.nivel, sct: s.sct, secciones: []
      });
    }
    courseMap.get(s.codigo).secciones.push(s);
  }
  COURSES = Array.from(courseMap.values()).sort((a,b)=>{
    const na = a.nivel==null?99:a.nivel, nb = b.nivel==null?99:b.nivel;
    if(na!==nb) return na-nb;
    return a.asignatura.localeCompare(b.asignatura, 'es');
  });

  // ---------- Filter widgets: populate ----------
  nivelSet = Array.from(new Set(SECTIONS.map(s=>s.nivel).filter(n=>n!=null))).sort((a,b)=>a-b);
  areaSet = Array.from(new Set(SECTIONS.map(s=>s.area).filter(Boolean).map(areaLabel))).sort((a,b)=>a.localeCompare(b,'es'));
  resetSelect(selNivel);
  nivelSet.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent='Nivel '+n; selNivel.appendChild(o); });
  resetSelect(selArea);
  areaSet.forEach(a=>{ const o=document.createElement('option'); o.value=a; o.textContent=a; selArea.appendChild(o); });

  document.getElementById('stat-asigs').textContent = COURSES.length;
  document.getElementById('stat-seccs').textContent = SECTIONS.length;
  document.getElementById('stat-areas').textContent = areaSet.length;
}
// Hue assignment is based on the combined code list (not the active
// program's alone) so colors stay stable for a course even if it's in a
// different program than the one currently being browsed.
function hueFor(codigo){
  const idx = ALL_CODES.indexOf(codigo);
  return HUES[idx % HUES.length];
}
// Semáforo de cupos disponibles — umbral estimado (no viene del dato fuente):
// <=5 casi lleno, <=15 quedan pocos, el resto holgado.
function cupoClass(cupo){
  if(cupo==null) return '';
  if(cupo<=5) return 'cupo-full';
  if(cupo<=15) return 'cupo-low';
  return 'cupo-ok';
}
rebuildProgramDerived();

// ---------- Time-grid picker (filter) ----------
const pickerEl = document.getElementById('picker');
const pickedSlots = new Set(); // "L-4"
(function buildPicker(){
  pickerEl.appendChild(document.createElement('div'));
  DIAS.forEach(d=>{ const h=document.createElement('div'); h.className='hdr'; h.textContent=DIA_LABEL[d]; pickerEl.appendChild(h); });
  BLOQUES.forEach(b=>{
    const rl=document.createElement('div'); rl.className='rowlabel'; rl.textContent=MODULOS[b][0]; pickerEl.appendChild(rl);
    DIAS.forEach(d=>{
      const c=document.createElement('div'); c.className='cell'; c.setAttribute('role','button'); c.tabIndex=0;
      c.setAttribute('aria-pressed','false'); c.title=DIA_LABEL_FULL[d]+' · Bloque '+b+' ('+MODULOS[b][0]+'–'+MODULOS[b][1]+')';
      c.dataset.key = d+'-'+b;
      const togglePick = ()=>{
        const k = c.dataset.key;
        if(pickedSlots.has(k)){ pickedSlots.delete(k); c.setAttribute('aria-pressed','false'); }
        else { pickedSlots.add(k); c.setAttribute('aria-pressed','true'); }
        render();
      };
      c.addEventListener('click', togglePick);
      c.addEventListener('keydown', e=>{ if(e.key===' '||e.key==='Enter'){ e.preventDefault(); togglePick(); } });
      pickerEl.appendChild(c);
    });
  });
})();
document.getElementById('clear-picker').addEventListener('click', ()=>{
  pickedSlots.clear();
  pickerEl.querySelectorAll('.cell').forEach(c=>c.setAttribute('aria-pressed','false'));
  render();
});

// ---------- Filter state ----------
let query = '';
let fNivel = '';
let fArea = '';
let fElect = '';
let fElectTouched = false;
// Se activa al apretar "Buscar" sin haber escrito ni filtrado nada — hace
// que se muestren todos los ramos en vez de la guía de bienvenida (ver
// btnGotoResults más abajo y noFiltersActive en render()). Vuelve a false
// en resetAllFilters() (Limpiar todo / cambio de programa), para que la
// guía reaparezca en un estado realmente "recién llegado".
let showAllForced = false;
let qDebounce = null;
// "Simulación de postulación" — ver bloque dedicado más abajo, después de
// switchProgram(). simUnlocked guarda los niveles ya "postulados" (números).
let simMode = false;
let simUnlocked = new Set();
// 'all' (por defecto, acumulativo) muestra los ramos de TODOS los niveles
// desbloqueados hasta ahora; 'current' muestra sólo los del nivel más
// reciente — toggle #sim-view-toggle, ver courseMatches() más abajo.
let simShowMode = 'all';
function norm(str){
  return (str||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
}
const qInput = document.getElementById('q');
// "×" dentro del campo: limpia sólo el texto de búsqueda. Separado de
// "Limpiar todo" (más abajo), que además saca los filtros de nivel/área/
// electivos/horario libre — dos botones con un solo trabajo cada uno, en
// vez del botón "Buscar" de antes, que según el estado hacía dos cosas
// distintas (bajar a resultados / limpiar) sin avisar cuál tocaba.
const searchClearBtn = document.getElementById('search-clear-btn');
function updateSearchClearBtn(){
  searchClearBtn.hidden = !qInput.value.trim();
}
const btnGotoResults = document.getElementById('btn-goto-results');
qInput.addEventListener('input', e=>{
  clearTimeout(qDebounce);
  const v = e.target.value;
  qDebounce = setTimeout(()=>{ query = norm(v.trim()); render(); }, 120);
  updateSearchClearBtn();
});
searchClearBtn.addEventListener('click', ()=>{
  qInput.value = '';
  clearTimeout(qDebounce);
  query = '';
  updateSearchClearBtn();
  render();
  qInput.focus();
});
// "Buscar" baja hasta la lista de resultados (útil en celular, donde la
// lista queda fuera de pantalla) — el filtrado en sí ya ocurre solo, al
// tipear, no depende de este botón. Además: si se aprieta sin haber
// escrito ni filtrado nada todavía, actúa como "mostrar todos" — en vez de
// quedarse en la guía de bienvenida, muestra la lista completa de ramos.
btnGotoResults.addEventListener('click', ()=>{
  const nadaIngresadoAun = !query && !fNivel && !fArea && !fElectTouched && pickedSlots.size===0;
  if(nadaIngresadoAun && !showAllForced){
    showAllForced = true;
    render();
  }
  document.querySelector('main').scrollIntoView({behavior:'smooth', block:'start'});
});
selNivel.addEventListener('change', e=>{ fNivel = e.target.value; render(); });
selArea.addEventListener('change', e=>{ fArea = e.target.value; render(); });
const mqCompactLayout = window.matchMedia('(max-width: 1180px)');
document.getElementById('f-elect').addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  const alreadyActive = fElectTouched && btn.getAttribute('aria-pressed') === 'true';
  if(alreadyActive){
    // clicking the already-selected pill again deselects it
    fElect = '';
    fElectTouched = false;
    document.querySelectorAll('#f-elect button').forEach(b=>b.setAttribute('aria-pressed', 'false'));
  } else {
    fElect = btn.dataset.v;
    fElectTouched = true;
    document.querySelectorAll('#f-elect button').forEach(b=>b.setAttribute('aria-pressed', b===btn?'true':'false'));
    // On iPad/iPhone widths the results list isn't visible without scrolling —
    // jump to the "N asignaturas encontradas" line so the filtered list is in view.
    if(mqCompactLayout.matches){
      document.querySelector('main').scrollIntoView({behavior:'smooth', block:'start'});
    }
  }
  render();
});

// ---------- Limpiar todo: búsqueda + los 4 filtros de una vez ----------
// Misma limpieza que switchProgram() necesita al cambiar de programa (para
// que no queden resultados del programa anterior) — extraída a una sola
// función para no mantener la misma lista de "qué cuenta como filtro" en
// dos lugares del código.
function resetAllFilters(){
  qInput.value = '';
  clearTimeout(qDebounce);
  query = '';
  showAllForced = false;
  updateSearchClearBtn();
  fNivel = ''; selNivel.value = '';
  fArea = ''; selArea.value = '';
  fElect = ''; fElectTouched = false;
  document.querySelectorAll('#f-elect button').forEach(b=>b.setAttribute('aria-pressed', 'false'));
  pickedSlots.clear();
  pickerEl.querySelectorAll('.cell').forEach(c=>c.setAttribute('aria-pressed', 'false'));
}
const btnClearAll = document.getElementById('btn-clear-all');
// Sólo tiene sentido ofrecer "Limpiar todo" cuando efectivamente hay algo
// que limpiar — búsqueda escrita o algún filtro de selección aplicado
// (nivel, área, obligatorios/electivos, o algún bloque de horario libre
// marcado). Se recalcula desde render() (ver más abajo) para no tener que
// repetir esta misma condición en cada handler que cambia un filtro.
function updateClearAllBtn(){
  btnClearAll.hidden = !(query || fNivel || fArea || fElectTouched || pickedSlots.size || showAllForced);
}
btnClearAll.addEventListener('click', ()=>{
  resetAllFilters();
  render();
});

// ---------- Program switch (Ingeniería Comercial ↔ Mención Economía) ----------
const programSwitchBtn = document.getElementById('program-switch');
function updateProgramUI(){
  const p = PROGRAMS[programKey];
  document.getElementById('ctx-programa').textContent = p.label;
  document.getElementById('ctx-semestre').textContent = p.semestre;
  document.getElementById('ctx-programa-footer').textContent = p.label;
  document.getElementById('ctx-semestre-footer').textContent = p.semestre;
  programSwitchBtn.textContent = programKey === 'ingeco' ? 'Ver Mención Economía' : 'Volver a Ingeniería Comercial';
  mallaProgramSwitchBtn.textContent = programSwitchBtn.textContent;
}
function switchProgram(key){
  if(key === programKey || !PROGRAMS[key]) return;
  programKey = key;
  SECTIONS = PROGRAMS[key].sections;

  // reset search + filters so results from the previous program don't linger
  resetAllFilters();

  // "Mi horario" is intentionally left untouched here — it's one shared
  // schedule across both programs (see SELECTION_STORAGE_KEY above), so
  // switching the browse/search view never clears or reloads it.
  rebuildProgramDerived();
  updateProgramUI();
  updateSimStatusBar();
  render();
  renderSchedule();
  window.scrollTo({top:0, behavior:'smooth'});
}
programSwitchBtn.addEventListener('click', ()=>{
  switchProgram(programKey === 'ingeco' ? 'economia' : 'ingeco');
});

// Mismo switch, accesible desde dentro del modal de la Malla — antes sólo
// se podía cambiar de programa cerrando la Malla y usando el botón de
// arriba. Reutiliza switchProgram() (misma fuente de verdad que el
// buscador) y refresca la grilla de la Malla sin cerrar el modal.
const mallaProgramSwitchBtn = document.getElementById('malla-program-switch');
mallaProgramSwitchBtn.addEventListener('click', ()=>{
  switchProgram(programKey === 'ingeco' ? 'economia' : 'ingeco');
  renderMalla();
});

// ---------- Simulación de postulación por nivel ----------
// A pedido del usuario, tras el correo del jefe de carrera explicando que
// la Postulación de Ramos real habilita los niveles de a uno (primero el
// nivel pendiente actual; recién tras postular a esos se ve el siguiente).
// Este modo imita ESE MECANISMO (qué niveles se pueden ver/agregar y en
// qué orden) — no predice el resultado real de la postulación (cupos,
// prioridad, etc.), algo que este sitio no tiene forma de conocer. Por
// eso el aviso permanente en la barra de estado mientras está activo.
const simToggleBtn = document.getElementById('sim-toggle');
const simSetupOverlay = document.getElementById('sim-setup-overlay');
const simNivelInicialSel = document.getElementById('sim-nivel-inicial');
const simStatusBar = document.getElementById('sim-status-bar');
const simStatusDetail = document.getElementById('sim-status-detail');
const simAdvanceBtn = document.getElementById('sim-advance-btn');
const fNivelSelectEl = document.getElementById('f-nivel');

// Próximo nivel a desbloquear: el siguiente valor de nivelSet (los niveles
// que de verdad tienen ramos en el programa activo) después del máximo ya
// desbloqueado — no simplemente +1, porque algún nivel puede no tener
// ningún ramo en el dataset (ej. Mención Economía no tiene nivel 3) y un
// +1 ciego dejaría el botón "avanzando" a un nivel que sigue mostrando
// resultados vacíos.
function simNextNivel(){
  if(!simUnlocked.size) return null;
  const max = Math.max(...simUnlocked);
  const idx = nivelSet.indexOf(max);
  if(idx === -1 || idx === nivelSet.length - 1) return null;
  return nivelSet[idx+1];
}
// El nivel más reciente que se desbloqueó — usado por simShowMode==='current'
// (toggle #sim-view-toggle) para mostrar sólo ese, en vez de todos los
// niveles acumulados desde que empezó la simulación.
function simCurrentNivel(){
  return simUnlocked.size ? Math.max(...simUnlocked) : null;
}
function updateSimStatusBar(){
  if(!simMode){ simStatusBar.hidden = true; return; }
  simStatusBar.hidden = false;
  const niveles = Array.from(simUnlocked).sort((a,b)=>a-b);
  const plural = niveles.length > 1;
  simStatusDetail.textContent = `Nivel${plural?'es':''} desbloqueado${plural?'s':''} hasta ahora: ${niveles.join(', ')}`;
  const next = simNextNivel();
  if(next != null){
    simAdvanceBtn.hidden = false;
    simAdvanceBtn.textContent = `Ya postulé → desbloquear Nivel ${next}`;
  } else {
    simAdvanceBtn.hidden = true;
  }
}
function startSimulation(nivelInicial){
  simMode = true;
  simUnlocked = new Set([nivelInicial]);
  // Cada simulación nueva arranca en modo acumulativo ("Todos los
  // desbloqueados") — es el valor por defecto y el más fiel al proceso real.
  simShowMode = 'all';
  document.querySelectorAll('#sim-view-toggle button').forEach(b=>b.setAttribute('aria-pressed', b.dataset.v === 'all' ? 'true' : 'false'));
  simToggleBtn.setAttribute('aria-pressed', 'true');
  // El filtro manual de "Nivel" queda oculto mientras la simulación manda
  // sobre qué niveles se pueden ver — tenerlo visible a la vez sería un
  // segundo control compitiendo por lo mismo y confundiría cuál manda.
  fNivelSelectEl.hidden = true;
  fNivel = ''; selNivel.value = '';
  updateSimStatusBar();
  render();
  document.querySelector('main').scrollIntoView({behavior:'smooth', block:'start'});
}
function exitSimulation(){
  simMode = false;
  simUnlocked = new Set();
  simToggleBtn.setAttribute('aria-pressed', 'false');
  fNivelSelectEl.hidden = false;
  updateSimStatusBar();
  render();
}
function openSimSetup(preferNivel){
  simNivelInicialSel.innerHTML = '';
  nivelSet.forEach(n=>{
    const o = document.createElement('option');
    o.value = n; o.textContent = 'Nivel ' + n;
    simNivelInicialSel.appendChild(o);
  });
  // preferNivel: usado por el puente Malla → Simulación (ver
  // updateMallaSimBridge más abajo) para dejar preseleccionado el nivel que
  // sugiere la malla, en vez del primero de la lista por defecto.
  if(preferNivel != null && nivelSet.includes(preferNivel)) simNivelInicialSel.value = String(preferNivel);
  simSetupOverlay.hidden = false;
}
function closeSimSetup(){ simSetupOverlay.hidden = true; }
simToggleBtn.addEventListener('click', ()=>{
  if(simMode) exitSimulation();
  else openSimSetup();
});
document.getElementById('sim-setup-cancel').addEventListener('click', closeSimSetup);
document.getElementById('sim-setup-start').addEventListener('click', ()=>{
  const n = Number(simNivelInicialSel.value);
  closeSimSetup();
  startSimulation(n);
});
simSetupOverlay.addEventListener('click', e=>{ if(e.target === simSetupOverlay) closeSimSetup(); });
document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && !simSetupOverlay.hidden) closeSimSetup(); });
simAdvanceBtn.addEventListener('click', ()=>{
  const next = simNextNivel();
  if(next == null) return;
  simUnlocked.add(next);
  updateSimStatusBar();
  render();
});
document.getElementById('sim-exit-btn').addEventListener('click', exitSimulation);
document.getElementById('sim-view-toggle').addEventListener('click', e=>{
  const btn = e.target.closest('button'); if(!btn) return;
  simShowMode = btn.dataset.v;
  document.querySelectorAll('#sim-view-toggle button').forEach(b=>b.setAttribute('aria-pressed', b===btn ? 'true' : 'false'));
  render();
});

// ---------- Malla curricular interactiva ----------
// Visor de la malla oficial (dos programas: ingeco = Ingeniería Comercial /
// Administración, economia = Mención Economía) con marcado de "ramos
// aprobados" guardado en este navegador. Los datos (ids, nombres y
// prerrequisitos directos) vienen de una malla ya armada a mano por el
// usuario a partir de la malla oficial FAE/USACH — no del dataset de
// secciones (SECTIONS/COURSES), que no trae relaciones de prerrequisito.
// Por eso los ids de acá (ej. "mat1", "micro1") son propios de la malla y
// no calzan con los códigos de ramo (ej. "352410") del resto del sitio.
const MALLA_MATRICES = {
  ingeco: [
    [
      { id:'mat1', label:'Matemáticas para Adm. y Econ. I' },
      { id:'mat2', label:'Matemáticas para Adm. y Econ. II', req:['mat1'] },
      { id:'mat3', label:'Matemáticas para Adm. y Econ. III', req:['mat2'] },
      null,
      { id:'mkt1', label:'Marketing I' },
      { id:'mkt2', label:'Marketing II', req:['mkt1'] },
      { id:'mkt3', label:'Marketing III', req:['mkt2'] },
      null, null, null
    ],
    [
      null,
      { id:'alge', label:'Álgebra Lineal' },
      { id:'est1', label:'Estadística Descrip. para Adm. y Econ.', req:['mat2'] },
      { id:'inf_est', label:'Inferencia Estadística para Administración', req:['est1'] },
      { id:'met_proj', label:'Métodos y Modelos de Proyección', req:['inf_est'] },
      null,
      { id:'elec1', label:'Electivo I' },
      { id:'elec2', label:'Electivo II' },
      { id:'elec5', label:'Electivo V' },
      null
    ],
    [
      { id:'adm1', label:'Introd. a la Administración' },
      { id:'adm_teoria', label:'Teoría Administrativa', req:['adm1'] },
      null,
      { id:'evol_org', label:'Evolución histórico cultural de las Organiz.' },
      null, null,
      { id:'cap_emp', label:'Capacidad Emprendedora' },
      { id:'estrat_neg', label:'Estrategia de Negocios' },
      { id:'neg_int', label:'Negocios Internacionales' },
      null
    ],
    [
      { id:'taller_comp', label:'Taller de Computación' },
      null, null,
      { id:'psico_soc', label:'Psicología Social' },
      { id:'comp_org', label:'Comportamiento Organizacional' },
      { id:'rrhh1', label:'Recursos Humanos I' },
      { id:'rrhh2', label:'Recursos Humanos II', req:['rrhh1'] },
      { id:'elec3', label:'Electivo III' },
      { id:'elec6', label:'Electivo VI' },
      null
    ],
    [
      { id:'eco1', label:'Introducción a la Economía' },
      { id:'micro_princ', label:'Principios de Microeconomía', req:['eco1'] },
      { id:'macro_princ', label:'Principios de Macroeconomía', req:['micro_princ'] },
      { id:'org_ind', label:'Organización Industrial' },
      null,
      { id:'adm_oper', label:'Administración de Operaciones' },
      null, null,
      { id:'tic_gest', label:'TIC´S y Gestión' },
      null
    ],
    [
      { id:'conta1', label:'Contabilidad General' },
      null,
      { id:'conta_fin', label:'Contab. Financiera y toma de decisiones', req:['conta1'] },
      { id:'conta_costos', label:'Contab. de Costos y toma de decisiones', req:['conta_fin'] },
      { id:'fin1', label:'Finanzas I', req:['conta_costos'] },
      { id:'fin2', label:'Finanzas II', req:['fin1'] },
      { id:'fin3', label:'Finanzas III', req:['fin2'] },
      { id:'eval_proy', label:'Evaluación de Proyectos', req:['fin2'] },
      { id:'ctrl_gest', label:'Control de Gestión', req:['fin3'] },
      null
    ],
    [
      { id:'etica', label:'Ética y RSE' },
      null,
      { id:'derecho', label:'Derecho y Empresa' },
      null,
      { id:'rel_lab', label:'Relaciones Laborales' },
      { id:'der_trib', label:'Derecho Tributario' },
      null,
      { id:'elec4', label:'Electivo IV' },
      { id:'elec7', label:'Electivo VII' },
      null
    ],
    [
      { id:'com1', label:'Taller de Comunicaciones I' },
      { id:'com2', label:'Taller de Comunicaciones II', req:['com1'] },
      null, null, null,
      { id:'tall_neg', label:'Taller de Negociación' },
      null,
      { id:'tall_lid', label:'Taller de Liderazgo' },
      null,
      { id:'coach', label:'Coaching Laboral' }
    ],
    [
      null,
      { id:'ing1', label:'Inglés para la Adm y Economía I' },
      { id:'ing2', label:'Inglés para la Adm y Economía II', req:['ing1'] },
      null,
      { id:'ing3', label:'Inglés para la Administración III', req:['ing2'] },
      null,
      { id:'ing4', label:'Inglés para la Administración IV', req:['ing3'] },
      null, null, null
    ],
    [
      null, null, null,
      { id:'prac_bas', label:'Práctica Básica' },
      null, null, null,
      { id:'ex_grado', label:'Examen de Grado' },
      null,
      { id:'prac_av', label:'Práctica Avanzada' }
    ]
  ],
  economia: [
    [
      { id:'mat1', label:'Matemáticas para la Administración y Economía I' },
      { id:'mat2', label:'Matemáticas para la Administración y Economía II', req:['mat1'] },
      { id:'mat3', label:'Matemáticas para la Administración y Economía III', req:['mat2'] },
      { id:'met_cuant', label:'Métodos Cuantitativos' },
      { id:'leng_prog', label:'Lenguajes de Programación para Economistas' },
      { id:'elec1', label:'Electivo I' },
      { id:'elec3', label:'Electivo III' },
      { id:'elec8', label:'Electivo VIII' },
      { id:'proy_tit', label:'Proyecto de Título' },
      { id:'trab_tit', label:'Trabajo de Titulación', req:['proy_tit','prac_prof'] }
    ],
    [
      { id:'tall_comp', label:'Taller de Computación' },
      { id:'alge', label:'Álgebra Lineal' },
      { id:'est1', label:'Estadística para la Administración y Economía I', req:['mat2'] },
      { id:'est2', label:'Estadística para la Economía II', req:['est1'] },
      { id:'ecom1', label:'Econometría I', req:['est2','alge'] },
      { id:'ecom2', label:'Econometría II', req:['ecom1'] },
      { id:'elec4', label:'Electivo IV' },
      { id:'elec9', label:'Electivo IX' },
      { id:'prac_prof', label:'Práctica Profesional' },
      { id:'elec14', label:'Electivo XIV' }
    ],
    [
      { id:'eco1', label:'Introducción a la Economía' },
      { id:'micro_princ', label:'Principios de Microeconomía', req:['eco1'] },
      { id:'macro_princ', label:'Principios de Macroeconomía', req:['micro_princ'] },
      { id:'micro1', label:'Microeconomía I', req:['micro_princ','mat3'] },
      { id:'micro2', label:'Microeconomía II', req:['micro1'] },
      { id:'hist_eco', label:'Historia Económica' },
      { id:'elec5', label:'Electivo V' },
      { id:'elec10', label:'Electivo X' },
      { id:'elec13', label:'Electivo XIII' },
      null
    ],
    [
      { id:'adm1', label:'Introducción a la Administración' },
      { id:'adm_teoria', label:'Teoría Administrativa', req:['adm1'] },
      { id:'derecho', label:'Derecho y Empresa' },
      { id:'com_efect', label:'Comunicación Efectiva' },
      { id:'macro1', label:'Macroeconomía I', req:['macro_princ','mat3'] },
      { id:'macro2', label:'Macroeconomía II', req:['macro1'] },
      { id:'elec6', label:'Electivo VI' },
      { id:'elec11', label:'Electivo XI' },
      null, null
    ],
    [
      { id:'conta1', label:'Contabilidad General' },
      { id:'tall_com2', label:'Taller de Comunicaciones II' },
      { id:'conta_fin', label:'Contabilidad Financiera y Toma de Decisiones', req:['conta1'] },
      { id:'ecofin1', label:'Economía Financiera I', req:['micro1','est2'] },
      { id:'ecofin2', label:'Economía Financiera II', req:['ecofin1'] },
      { id:'elec2', label:'Electivo II' },
      { id:'elec7', label:'Electivo VII' },
      { id:'elec12', label:'Electivo XII' },
      null, null
    ],
    [
      { id:'tall_com1', label:'Taller de Comunicaciones I' },
      null, null, null, null,
      { id:'tall_com_econ', label:'Taller de Comunicación para Economistas' },
      { id:'tall_hab1', label:'Taller de Habilidades I' },
      { id:'tall_lab', label:'Taller Laboral' },
      null,
      { id:'tall_hab2', label:'Taller de Habilidades II' }
    ],
    [
      { id:'etica', label:'Ética y Responsabilidad Social Empresarial' },
      { id:'ing1', label:'Inglés para la Administración y Economía I' },
      { id:'ing2', label:'Inglés para la Administración y Economía II', req:['ing1'] },
      { id:'ing3', label:'Inglés para la Administración y Economía III', req:['ing2'] },
      { id:'ing4', label:'Inglés para la Administración y Economía IV', req:['ing3'] },
      null, null, null,
      { id:'ing5', label:'Inglés para la Economía V', req:['ing4'] },
      { id:'ing6', label:'Inglés para la Economía VI', req:['ing5'] }
    ]
  ]
};
const MALLA_TITLES = {
  ingeco: 'Malla curricular — Ingeniería Comercial',
  economia: 'Malla curricular — Ingeniería Comercial en Economía'
};

let mallaAprobados = { ingeco: new Set(), economia: new Set() };
try{
  const saved = JSON.parse(localStorage.getItem('bc-usach-malla-aprobados') || '{}');
  if(Array.isArray(saved.ingeco)) mallaAprobados.ingeco = new Set(saved.ingeco);
  if(Array.isArray(saved.economia)) mallaAprobados.economia = new Set(saved.economia);
}catch(e){}
function saveMallaAprobados(){
  try{
    localStorage.setItem('bc-usach-malla-aprobados', JSON.stringify({
      ingeco: Array.from(mallaAprobados.ingeco),
      economia: Array.from(mallaAprobados.economia)
    }));
  }catch(e){}
}

const mallaOverlay = document.getElementById('malla-overlay');
const mallaGridHeaders = document.getElementById('malla-grid-headers');
const mallaGridEl = document.getElementById('malla-grid');
const mallaInfoBox = document.getElementById('malla-info');
const mallaProgressEl = document.getElementById('malla-progress');
let mallaSelectedId = null;

function mallaAllCells(programKeyForMalla){
  return MALLA_MATRICES[programKeyForMalla].flat().filter(c => c !== null);
}

// ---------- Ramos "disponibles" (habilitados para postular), derivados de
// los aprobados ---------- Cruza mallaAprobados contra los prerrequisitos
// (req) de cada ramo: un ramo que todavía NO está aprobado, pero que sí
// tiene prerrequisitos declarados y los tiene TODOS aprobados, está
// "disponible" — ya se podría tomar el próximo semestre. Los ramos sin
// ningún prerrequisito (la mayoría de la grilla: talleres, electivos, el
// primer nivel, etc.) quedan afuera de este cálculo a propósito — están
// disponibles desde siempre y marcarlos todos como "disponible" sería puro
// ruido visual, no información nueva.
function mallaHabilitados(key){
  const aprobados = mallaAprobados[key];
  const result = new Set();
  mallaAllCells(key).forEach(c=>{
    if(aprobados.has(c.id)) return;
    if(!c.req || !c.req.length) return;
    if(c.req.every(r => aprobados.has(r))) result.add(c.id);
  });
  return result;
}

function updateMallaHabilitados(key){
  const habilitados = mallaHabilitados(key);
  mallaGridEl.querySelectorAll('.malla-card').forEach(card=>{
    card.classList.toggle('is-habilitado', habilitados.has(card.dataset.id));
  });
}

// ---------- Puente hacia la Simulación de postulación por nivel ----------
// La Malla (ids propios, prerrequisitos por ramo) y el catálogo de
// secciones que usa la Simulación (códigos de ramo reales, ramos agrupados
// por nivel/semestre) son datasets separados — no hay forma confiable de
// cruzar un ramo específico de uno con el otro (ver comentario grande más
// abajo, arriba de MALLA_MATRICES). Lo que SÍ comparten ambos es el
// concepto de "nivel" como número de semestre, así que el puente usa
// únicamente eso: en qué nivel de la malla todavía queda algo pendiente de
// aprobar, ajustado al nivel real más cercano que de verdad tiene ramos en
// el programa activo (nivelSet, el mismo array que ya usa la Simulación
// para no ofrecer un nivel vacío).
function mallaNivelSugerido(key){
  const matrix = MALLA_MATRICES[key];
  const aprobados = mallaAprobados[key];
  const numCols = Math.max(...matrix.map(row => row.length));
  for(let col = 0; col < numCols; col++){
    const cellsInCol = matrix.map(row => row[col]).filter(c => c && c !== null);
    if(!cellsInCol.length) continue;
    const pendiente = cellsInCol.some(c => !aprobados.has(c.id));
    if(pendiente) return col + 1;
  }
  return null; // todos los ramos de la malla están marcados como aprobados
}

function updateMallaSimBridge(key){
  const bridge = document.getElementById('malla-sim-bridge');
  if(!bridge) return;
  const sugerido = mallaNivelSugerido(key);
  if(sugerido == null || !nivelSet.length){ bridge.hidden = true; return; }
  const snapped = nivelSet.includes(sugerido) ? sugerido : (nivelSet.find(n => n >= sugerido) ?? nivelSet[nivelSet.length - 1]);
  document.getElementById('malla-sim-bridge-text').textContent =
    'Según tu malla, todavía te falta completar el Nivel ' + sugerido + '. ¿Simulamos la postulación desde ahí?';
  document.getElementById('malla-sim-bridge-btn').textContent = 'Simular desde Nivel ' + snapped;
  bridge.dataset.nivel = String(snapped);
  bridge.hidden = false;
}

function renderMallaHeaders(){
  if(mallaGridHeaders.childElementCount) return; // sólo hace falta una vez, son fijos (Semestre I..X)
  const romanos = ['I','II','III','IV','V','VI','VII','VIII','IX','X'];
  romanos.forEach(r=>{
    const h = document.createElement('div');
    h.className = 'malla-sem-head';
    h.textContent = 'Semestre ' + r;
    mallaGridHeaders.appendChild(h);
  });
}

function renderMalla(){
  const key = programKey; // sigue el programa activo del buscador, sin selector propio
  document.getElementById('malla-subtitle').textContent = PROGRAMS[key].label + ' · ' + PROGRAMS[key].semestre;
  renderMallaHeaders();
  mallaGridEl.innerHTML = '';
  mallaSelectedId = null;
  mallaInfoBox.hidden = true;

  const matrix = MALLA_MATRICES[key];
  const aprobados = mallaAprobados[key];

  matrix.forEach(row=>{
    row.forEach(cell=>{
      if(cell === null){
        const empty = document.createElement('div');
        empty.className = 'malla-cell-empty';
        mallaGridEl.appendChild(empty);
        return;
      }
      const card = document.createElement('div');
      card.className = 'malla-card';
      card.id = 'malla-card-' + cell.id;
      card.dataset.id = cell.id;
      card.setAttribute('role', 'button');
      card.tabIndex = 0;
      if(aprobados.has(cell.id)) card.classList.add('is-ok');

      const label = document.createElement('span');
      label.textContent = cell.label;
      card.appendChild(label);

      const mark = document.createElement('button');
      mark.type = 'button';
      mark.className = 'malla-ok-mark';
      mark.title = 'Marcar/desmarcar como aprobado';
      mark.setAttribute('aria-label', 'Marcar ' + cell.label + ' como aprobado');
      mark.setAttribute('aria-pressed', aprobados.has(cell.id) ? 'true' : 'false');
      mark.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
      mark.addEventListener('click', ev=>{
        ev.stopPropagation();
        toggleMallaAprobado(key, cell.id);
      });
      card.appendChild(mark);

      card.addEventListener('click', ()=> mallaSelectCourse(key, cell.id));
      card.addEventListener('keydown', ev=>{
        if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); mallaSelectCourse(key, cell.id); }
      });
      mallaGridEl.appendChild(card);
    });
  });

  updateMallaHabilitados(key);
  updateMallaProgress(key);
  updateMallaSimBridge(key);
}

function toggleMallaAprobado(key, id){
  const set = mallaAprobados[key];
  if(set.has(id)) set.delete(id); else set.add(id);
  saveMallaAprobados();
  const card = document.getElementById('malla-card-' + id);
  if(card){
    const now = set.has(id);
    card.classList.toggle('is-ok', now);
    const mark = card.querySelector('.malla-ok-mark');
    if(mark) mark.setAttribute('aria-pressed', now ? 'true' : 'false');
  }
  // Aprobar/desaprobar este ramo puede cambiar qué otros ramos quedan
  // "disponibles" (sus dependientes directos) y en qué nivel sigue habiendo
  // pendientes — se recalculan los dos cada vez, es barato (la malla tiene
  // ~100 ramos como mucho).
  updateMallaHabilitados(key);
  updateMallaProgress(key);
  updateMallaSimBridge(key);
}

function updateMallaProgress(key){
  const total = mallaAllCells(key).length;
  const aprobadas = mallaAprobados[key].size;
  const disponibles = mallaHabilitados(key).size;
  mallaProgressEl.innerHTML = '<b>' + aprobadas + ' / ' + total + '</b> ramos marcados como aprobados en esta malla'
    + (disponibles ? ' · <b class="is-habilitado-count">' + disponibles + '</b> más ya disponibles según tus prerrequisitos.' : '.');
}

function mallaSelectCourse(key, id){
  const allCards = mallaGridEl.querySelectorAll('.malla-card');
  if(mallaSelectedId === id){
    mallaSelectedId = null;
    allCards.forEach(c => c.classList.remove('is-selected', 'is-prereq', 'is-unlocks'));
    mallaInfoBox.hidden = true;
    return;
  }
  mallaSelectedId = id;
  allCards.forEach(c => c.classList.remove('is-selected', 'is-prereq', 'is-unlocks'));

  const allCells = mallaAllCells(key);
  const target = allCells.find(c => c.id === id);
  const reqIds = target.req || [];
  const unlockIds = allCells.filter(c => c.req && c.req.includes(id)).map(c => c.id);

  document.getElementById('malla-card-' + id).classList.add('is-selected');
  reqIds.forEach(rId=>{
    const el = document.getElementById('malla-card-' + rId);
    if(el) el.classList.add('is-prereq');
  });
  unlockIds.forEach(uId=>{
    const el = document.getElementById('malla-card-' + uId);
    if(el) el.classList.add('is-unlocks');
  });

  document.getElementById('malla-info-title').textContent = target.label;
  const reqsList = document.getElementById('malla-info-reqs');
  reqsList.innerHTML = reqIds.length
    ? reqIds.map(rId=>{ const c = allCells.find(x=>x.id===rId); return '<li>' + (c ? c.label : rId) + '</li>'; }).join('')
    : '<li class="empty">Ninguno</li>';
  const unlocksList = document.getElementById('malla-info-unlocks');
  unlocksList.innerHTML = unlockIds.length
    ? unlockIds.map(uId=>{ const c = allCells.find(x=>x.id===uId); return '<li>' + c.label + '</li>'; }).join('')
    : '<li class="empty">Ninguno</li>';
  mallaInfoBox.hidden = false;
}

function openMalla(){
  renderMalla();
  mallaOverlay.hidden = false;
  document.getElementById('malla-close').focus();
}
function closeMalla(){
  mallaOverlay.hidden = true;
  document.getElementById('malla-toggle').focus();
}
document.getElementById('malla-toggle').addEventListener('click', openMalla);
document.getElementById('malla-close').addEventListener('click', closeMalla);
document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && !mallaOverlay.hidden) closeMalla(); });
document.getElementById('malla-sim-bridge-btn').addEventListener('click', ()=>{
  const nivel = Number(document.getElementById('malla-sim-bridge').dataset.nivel);
  closeMalla();
  openSimSetup(nivel || undefined);
});

// ---------- Mi Bitácora: cuaderno de apuntes por ramo ----------
// Un "cuaderno" por código de ramo, para escribir apuntes/recursos/dudas/
// ejercicios ANTES de cursarlo de verdad. Se crea vacío solo (ensureBitacora,
// llamado desde toggleSection más abajo) la primera vez que ese ramo entra a
// "Mi horario" — agregarlo de nuevo, o volver a guardar el mismo horario, NO
// lo recrea ni le borra lo ya escrito (dedup: una sola vez por código). Vive
// enteramente en este navegador (localStorage), igual que el horario y la
// malla de aprobados — no hay cuentas ni servidor todavía.
//
// Una bitácora sigue apareciendo en el listado aunque el alumno más adelante
// quite ese ramo de su horario (bitacoraCourseList hace el UNION de
// "seleccionados ahora" + "con bitácora alguna vez") — perder apuntes ya
// escritos solo porque desmarcaste el ramo un rato sería peor que mostrar
// una tarjeta de más.
const BITACORA_STORAGE_KEY = 'bc-usach-bitacora';
const BITACORA_TIPOS = [
  { key:'apunte',    label:'Apunte de clase',    emoji:'📝', needsLink:false, needsEstado:false,
    placeholder:'Qué aprendiste, un resumen de la clase o del tema…', contentLabel:'Descripción' },
  { key:'recurso',   label:'Recurso',            emoji:'🔗', needsLink:true,  needsEstado:false,
    placeholder:'De qué se trata este recurso…', contentLabel:'Descripción del recurso' },
  { key:'duda',      label:'Duda pendiente',     emoji:'❓', needsLink:false, needsEstado:true,
    placeholder:'Qué no te quedó claro…', contentLabel:'Tu duda' },
  { key:'ejercicio', label:'Ejercicio resuelto', emoji:'✅', needsLink:false, needsEstado:false,
    placeholder:'Qué ejercicio resolviste y cómo…', contentLabel:'Descripción' },
];
function bitacoraTipoInfo(key){ return BITACORA_TIPOS.find(t=>t.key===key) || BITACORA_TIPOS[0]; }

let bitacoras = {}; // codigo -> {codigo, asignatura, creadaEn, entries:[{id,tipo,fecha,contenido,link,estado,creadoEn}]}
try{ bitacoras = JSON.parse(localStorage.getItem(BITACORA_STORAGE_KEY) || '{}') || {}; }catch(e){ bitacoras = {}; }
function saveBitacoras(){
  try{ localStorage.setItem(BITACORA_STORAGE_KEY, JSON.stringify(bitacoras)); }catch(e){}
}
// Crea la bitácora vacía de un ramo si todavía no existe. No hace nada si ya
// existía — ésta es toda la regla de "no duplicados".
function ensureBitacora(course){
  if(bitacoras[course.codigo]) return false;
  bitacoras[course.codigo] = { codigo: course.codigo, asignatura: course.asignatura, creadaEn: new Date().toISOString(), entries: [] };
  saveBitacoras();
  return true;
}

// Sólo en la carpeta "dev" (build con datos de ejemplo): si todavía no hay
// NINGUNA bitácora en este navegador, precarga la semilla de demo que
// build.js embebió como <script id="bc-bitacora-seed">. La build de
// producción no genera ese script, así que ahí esto no hace nada — cada
// alumno real parte con la bitácora vacía. Si el alumno ya escribió algo,
// nunca se pisa.
(function seedDemoBitacoraIfEmpty(){
  try{
    if(Object.keys(bitacoras).length) return;
    const seedEl = document.getElementById('bc-bitacora-seed');
    if(!seedEl) return;
    const seed = JSON.parse(seedEl.textContent);
    if(seed && typeof seed === 'object'){
      bitacoras = seed;
      saveBitacoras();
    }
  }catch(e){}
})();

const bitacoraOverlay = document.getElementById('bitacora-overlay');
let bitacoraActiveCodigo = null;

// Únicos por código: un ramo con más de una "sección" seleccionada (caso
// Examen de Grado, ver sectionKey más abajo) comparte una sola bitácora. Une
// los ramos actualmente en el horario con los que ya tienen bitácora aunque
// ya no estén seleccionados (ver comentario más arriba).
function bitacoraCourseList(){
  const map = new Map(); // codigo -> {codigo, asignatura, enHorario}
  selected.forEach(v=>{
    if(!map.has(v.course.codigo)) map.set(v.course.codigo, {codigo:v.course.codigo, asignatura:v.course.asignatura, enHorario:true});
  });
  Object.keys(bitacoras).forEach(codigo=>{
    if(map.has(codigo)) return;
    const live = ALL_COURSE_MAP.get(codigo);
    map.set(codigo, { codigo, asignatura: live ? live.asignatura : bitacoras[codigo].asignatura, enHorario:false });
  });
  return Array.from(map.values()).sort((a,b)=>a.asignatura.localeCompare(b.asignatura,'es'));
}

function renderBitacoraCourseList(){
  const wrap = document.getElementById('bitacora-course-list');
  const courses = bitacoraCourseList();
  if(!courses.length){
    wrap.innerHTML = '<div class="bitacora-course-list-empty">Aún no tienes ramos en tu horario. Agrega alguno desde el buscador — su bitácora aparece acá sola, vacía y lista para escribir.</div>';
    document.getElementById('bitacora-subtitle').textContent = 'Sin ramos en tu horario todavía';
    bitacoraActiveCodigo = null;
    return;
  }
  if(!bitacoraActiveCodigo || !courses.some(c=>c.codigo===bitacoraActiveCodigo)){
    bitacoraActiveCodigo = courses[0].codigo;
  }
  document.getElementById('bitacora-subtitle').textContent = courses.length+' ramo'+(courses.length===1?'':'s')+' con bitácora';
  wrap.innerHTML = courses.map(c=>{
    const n = (bitacoras[c.codigo] && bitacoras[c.codigo].entries.length) || 0;
    return `<button type="button" class="bitacora-course-card ${c.codigo===bitacoraActiveCodigo?'is-active':''}" data-codigo="${c.codigo}">
      <span class="cod">${c.codigo}</span>
      <span class="nombre">${c.asignatura}</span>
      <span class="count">${n} entrada${n===1?'':'s'}</span>
      ${c.enHorario ? '' : '<span class="fuera-horario">ya no está en tu horario</span>'}
    </button>`;
  }).join('');
  wrap.querySelectorAll('.bitacora-course-card').forEach(btn=>{
    btn.addEventListener('click', ()=>{ bitacoraActiveCodigo = btn.dataset.codigo; renderBitacora(); });
  });
}

function renderBitacoraDetail(){
  const empty = document.getElementById('bitacora-empty');
  const inner = document.getElementById('bitacora-detail-inner');
  const courses = bitacoraCourseList();
  if(!bitacoraActiveCodigo || !courses.length){
    empty.hidden = false; inner.hidden = true;
    return;
  }
  empty.hidden = true; inner.hidden = false;
  const course = courses.find(c=>c.codigo===bitacoraActiveCodigo);
  const bit = bitacoras[bitacoraActiveCodigo] || { entries: [] };
  document.getElementById('bitacora-detail-title').textContent = course.asignatura;
  document.getElementById('bitacora-detail-meta').textContent = course.codigo+' · '+bit.entries.length+' entrada'+(bit.entries.length===1?'':'s');

  const list = document.getElementById('bitacora-entries');
  const sorted = bit.entries.slice().sort((a,b)=> (b.fecha||'').localeCompare(a.fecha||'') || (b.creadoEn||'').localeCompare(a.creadoEn||''));
  if(!sorted.length){
    list.innerHTML = '<li class="bitacora-entries-empty">Todavía no hay entradas para este ramo — usa el formulario de abajo.</li>';
  } else {
    list.innerHTML = sorted.map(entry=>{
      const info = bitacoraTipoInfo(entry.tipo);
      const linkHTML = entry.link ? `<a class="bitacora-entry-link" href="${entry.link}" target="_blank" rel="noopener noreferrer">Ver enlace ↗</a>` : '';
      const estadoHTML = info.needsEstado
        ? `<button type="button" class="bitacora-entry-state ${entry.estado==='resuelta'?'is-resuelta':''}" data-id="${entry.id}">${entry.estado==='resuelta' ? '✓ Resuelta' : 'Marcar como resuelta'}</button>`
        : '';
      return `<li class="bitacora-entry tipo-${entry.tipo}">
        <div class="bitacora-entry-head">
          <span class="bitacora-entry-tag">${info.emoji} ${info.label}</span>
          <span class="bitacora-entry-date">${entry.fecha ? fmtDateEs(entry.fecha) : ''}</span>
          <button type="button" class="bitacora-entry-del" data-id="${entry.id}" title="Eliminar entrada" aria-label="Eliminar entrada">✕</button>
        </div>
        <p class="bitacora-entry-body"></p>
        ${linkHTML}
        ${estadoHTML}
      </li>`;
    }).join('');
    // El contenido se inserta como texto (no HTML) para que nada de lo que
    // el alumno escriba pueda ejecutarse como marcado.
    const bodies = list.querySelectorAll('.bitacora-entry-body');
    sorted.forEach((entry,i)=>{ bodies[i].textContent = entry.contenido; });

    list.querySelectorAll('.bitacora-entry-del').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        bitacoras[bitacoraActiveCodigo].entries = bitacoras[bitacoraActiveCodigo].entries.filter(e=>e.id!==btn.dataset.id);
        saveBitacoras();
        renderBitacora();
      });
    });
    list.querySelectorAll('.bitacora-entry-state').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const e = bitacoras[bitacoraActiveCodigo].entries.find(x=>x.id===btn.dataset.id);
        if(e){ e.estado = e.estado === 'resuelta' ? 'pendiente' : 'resuelta'; saveBitacoras(); renderBitacora(); }
      });
    });
  }

  bitacoraUpdateFormFields();
}

function bitacoraUpdateFormFields(){
  const info = bitacoraTipoInfo(document.getElementById('bit-f-tipo').value);
  document.getElementById('bit-f-link-wrap').hidden = !info.needsLink;
  document.getElementById('bit-f-contenido').placeholder = info.placeholder;
  document.getElementById('bit-f-contenido-label').textContent = info.contentLabel;
}

function renderBitacora(){
  renderBitacoraCourseList();
  renderBitacoraDetail();
}

function openBitacora(){
  renderBitacora();
  const fechaInput = document.getElementById('bit-f-fecha');
  if(fechaInput && !fechaInput.value) fechaInput.value = new Date().toISOString().slice(0,10);
  bitacoraOverlay.hidden = false;
  document.getElementById('bitacora-close').focus();
}
function closeBitacora(){
  bitacoraOverlay.hidden = true;
  document.getElementById('bitacora-toggle').focus();
}
document.getElementById('bitacora-toggle').addEventListener('click', openBitacora);
document.getElementById('bitacora-close').addEventListener('click', closeBitacora);
document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && !bitacoraOverlay.hidden) closeBitacora(); });
document.getElementById('bit-f-tipo').addEventListener('change', bitacoraUpdateFormFields);
document.getElementById('bitacora-form').addEventListener('submit', e=>{
  e.preventDefault();
  if(!bitacoraActiveCodigo || !bitacoras[bitacoraActiveCodigo]) return;
  const tipo = document.getElementById('bit-f-tipo').value;
  const info = bitacoraTipoInfo(tipo);
  const contenido = document.getElementById('bit-f-contenido').value.trim();
  if(!contenido) return;
  const fecha = document.getElementById('bit-f-fecha').value || new Date().toISOString().slice(0,10);
  const link = info.needsLink ? document.getElementById('bit-f-link').value.trim() : '';
  bitacoras[bitacoraActiveCodigo].entries.push({
    id: 'e'+Date.now().toString(36)+Math.random().toString(36).slice(2,8),
    tipo, fecha, contenido, link,
    estado: info.needsEstado ? 'pendiente' : undefined,
    creadoEn: new Date().toISOString()
  });
  saveBitacoras();
  document.getElementById('bit-f-contenido').value = '';
  document.getElementById('bit-f-link').value = '';
  renderBitacora();
});

function courseMatches(course){
  // Modo simulación: mientras esté activo, un ramo de un nivel todavía no
  // desbloqueado directamente no aparece en los resultados — fiel al
  // proceso real, donde ese nivel ni siquiera se ofrece para postular
  // todavía. Los ramos sin nivel conocido (nivel==null, un puñado de casos
  // como Prácticas o el electivo sin nivel confirmado) se dejan pasar
  // siempre, porque no hay forma de saber en qué momento "desbloquearían".
  // simShowMode decide, ADEMÁS de eso, si entre los niveles ya desbloqueados
  // se ven todos acumulados (por defecto) o sólo el más reciente — ver
  // #sim-view-toggle.
  if(simMode && course.nivel != null){
    if(!simUnlocked.has(course.nivel)) return false;
    if(simShowMode === 'current' && course.nivel !== simCurrentNivel()) return false;
  }
  if(fNivel && String(course.nivel) !== fNivel) return false;
  if(fArea && areaLabel(course.area) !== fArea) return false;
  let seccs = course.secciones;
  if(fElect){
    seccs = seccs.filter(s => fElect==='0' ? s.electividad==='0' : s.electividad!=='0');
    if(!seccs.length) return false;
  }
  if(pickedSlots.size){
    seccs = seccs.filter(s => s.bloques.some(b => pickedSlots.has(b.dia+'-'+b.bloque)));
    if(!seccs.length) return false;
  }
  if(query){
    const hay = norm(course.codigo+' '+course.asignatura);
    const inCourse = hay.includes(query);
    const inProf = course.secciones.some(s=>norm(s.profesor).includes(query));
    if(!inCourse && !inProf) return false;
    if(inProf && !inCourse){
      seccs = seccs.filter(s=>norm(s.profesor).includes(query));
      if(!seccs.length) return false;
    }
  }
  return seccs;
}

function fmtHorario(bloques){
  // group by day preserving order, merge consecutive block numbers
  const byDay = {};
  bloques.forEach(b=>{ (byDay[b.dia] = byDay[b.dia]||[]).push(b.bloque); });
  return DIAS.filter(d=>byDay[d]).map(d=>{
    const blocks = byDay[d].sort((a,b)=>a-b);
    const start = MODULOS[blocks[0]][0];
    const end = MODULOS[blocks[blocks.length-1]][1];
    return {dia:d, label: DIA_LABEL[d]+' '+start+'–'+end};
  });
}

// ---------- Selection (Mi horario) ----------
// One shared schedule across both programs — resolved against ALL_COURSE_MAP
// (not the active program's courseMap) so a section added while browsing one
// program still resolves correctly after switching to the other. The storage
// key matches the original, pre-multi-program key name so existing users'
// saved schedules still load.
// A handful of "secciones" (notably código 352450, Examen de Grado) share the
// same número de sección but are really distinct sittings — the source data
// only tells them apart via "coord". sectionKey() folds coord into the
// identity so those stay individually selectable; sectionLabel() only shows
// the coord suffix when a course actually has that kind of duplicate, so the
// vast majority of sections keep displaying a plain "Sec. N".
function sectionKey(course, section){
  return course.codigo+'|'+section.seccion+'|'+(section.coord||'');
}
function hasDupeSeccion(course, seccion){
  return course.secciones.filter(s=>s.seccion===seccion).length > 1;
}
function sectionLabel(course, section){
  return hasDupeSeccion(course, section.seccion) && section.coord
    ? section.seccion+'-'+section.coord
    : section.seccion;
}

let selected = new Map(); // key "codigo|seccion|coord" -> {course, section}
function loadSelection(){
  try{
    const raw = localStorage.getItem(SELECTION_STORAGE_KEY);
    if(!raw) return;
    const keys = JSON.parse(raw);
    keys.forEach(k=>{
      const parts = k.split('|');
      const codigo = parts[0], seccion = parts[1], coord = parts[2];
      const course = ALL_COURSE_MAP.get(codigo);
      if(!course) return;
      // Legacy keys (saved before coord was part of the identity) have no
      // third part — fall back to matching by seccion only, same as before.
      const sec = coord!==undefined
        ? course.secciones.find(s=>String(s.seccion)===seccion && (s.coord||'')===coord)
        : course.secciones.find(s=>String(s.seccion)===seccion);
      if(sec) selected.set(sectionKey(course, sec), {course, section: sec});
    });
  }catch(e){}
}
function saveSelection(){
  try{ localStorage.setItem(SELECTION_STORAGE_KEY, JSON.stringify(Array.from(selected.keys()))); }catch(e){}
}
loadSelection();

function toggleSection(course, section){
  const key = sectionKey(course, section);
  if(selected.has(key)){
    selected.delete(key);
  } else {
    selected.set(key, {course, section});
    // Al agregar un ramo a "Mi horario" nace su bitácora vacía — una sola
    // vez por código (ensureBitacora es un no-op si ya existía), sin
    // necesidad de un botón de "guardar" aparte.
    ensureBitacora(course);
  }
  saveSelection();
  render();
}

function computeConflicts(){
  const occ = {}; // "d-b" -> [keys]
  selected.forEach((v,key)=>{
    v.section.bloques.forEach(b=>{
      const k = b.dia+'-'+b.bloque;
      (occ[k]=occ[k]||[]).push(key);
    });
  });
  const conflictSlots = new Set();
  const conflictKeys = new Set();
  Object.entries(occ).forEach(([slot, keys])=>{
    if(keys.length>1){ conflictSlots.add(slot); keys.forEach(k=>conflictKeys.add(k)); }
  });
  return {conflictSlots, conflictKeys};
}

// ---------- Guía "Cómo usar este buscador" ----------
// Una sola fuente para el contenido (pasos + ilustración), usada tanto por
// el panel colapsable de arriba (#guide-mock/#guide-body, rellenados al
// cargar la página) como por welcomeGuideHTML() (estado "aún no busco
// nada" en el listado de resultados). Antes este contenido estaba escrito
// dos veces en el HTML y quedaba fácil que se desincronizaran; ahora un
// cambio acá se refleja en los dos lugares.
const GUIDE_STEPS = [
  ['1','Busca tu ramo','Escribe el código, el nombre de la asignatura o el apellido de un profesor en la barra de arriba — la lista se filtra sola, sin apretar nada más. El botón <kbd>Buscar</kbd> sólo te baja hasta el listado (útil en el celular); para borrar lo escrito usa la <kbd>×</kbd> que aparece dentro del mismo buscador.'],
  ['2','Filtra (opcional)','Nivel, área, <kbd>Todos</kbd> / <kbd>Obligatorios</kbd> / <kbd>Electivos</kbd>, o un bloque de <kbd>Horario libre</kbd>: apenas eliges uno, la lista de abajo se actualiza al instante — no hace falta apretar nada, igual que al escribir en el buscador. <kbd>Limpiar todo</kbd> saca la búsqueda y los cuatro filtros de una sola vez.'],
  ['3','Compara secciones','Cada asignatura lista sus secciones con profesor, cupos y horario para que elijas la que más te acomode.'],
  ['4','Arma tu horario','Pulsa <kbd>Agregar</kbd> en las secciones que quieras. Se suman al panel <strong>Mi horario</strong>, con su propia grilla semanal.'],
  ['5','Revisa choques y guarda','Los bloques en rojo marcan choques de horario. Cuando quede sin choques, usa <kbd>Imprimir horario</kbd> para guardarlo.'],
];
function guideStepsHTML(){
  return GUIDE_STEPS.map(([n,t,d])=>`<div class="guide-step"><span class="num">${n}</span><div><h3>${t}</h3><p>${d}</p></div></div>`).join('');
}
function guideMockHTML(){
  return `<p class="mock-caption">Ejemplo ilustrativo - cómo usar este buscador</p>
      <div class="mock-row-wrap">
        <div class="mock-frame mock-shot mock-shot-rows">
          <div class="mock-label">Buscar</div>
          <div class="mock-searchrow">
            <span class="mock-search-input">álgebra</span>
            <span class="mock-btn">Buscar</span>
          </div>
          <div class="mock-row">
            <span class="mock-code">352409</span>
            <span class="mock-name">Álgebra Lineal</span>
          </div>
        </div>
        <div class="mock-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
        <div class="mock-frame mock-shot mock-shot-rows">
          <div class="mock-label">Filtrar</div>
          <div class="mock-pills">
            <span class="mock-pill">Todos</span>
            <span class="mock-pill">Obligatorios</span>
            <span class="mock-pill on">Electivos</span>
          </div>
          <div class="mock-row">
            <span class="mock-code">352451</span>
            <span class="mock-name">Simulación de Marketing</span>
          </div>
          <div class="mock-row">
            <span class="mock-code">352398</span>
            <span class="mock-name">Taller de Emprendimiento</span>
          </div>
        </div>
        <div class="mock-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
        <div class="mock-frame mock-shot mock-shot-rows">
          <div class="mock-label">Resultados</div>
          <div class="mock-row">
            <div class="mock-name">Principios de Microeconomía</div>
            <div class="mock-row-meta">
              <span class="mock-code">352410</span>
              <span class="mock-btn">+ Agregar</span>
            </div>
          </div>
          <div class="mock-row">
            <div class="mock-name">Contabilidad Financiera</div>
            <div class="mock-row-meta">
              <span class="mock-code">352412</span>
              <span class="mock-btn">+ Agregar</span>
            </div>
          </div>
        </div>
        <div class="mock-arrow">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </div>
        <div class="mock-frame mock-shot mock-shot-grid">
          <div class="mock-label">Mi horario</div>
          <div class="mock-grid">
            <div class="c"></div><div class="c on" style="--h:210"></div><div class="c"></div><div class="c"></div><div class="c"></div>
            <div class="c"></div><div class="c on" style="--h:210"></div><div class="c"></div><div class="c on" style="--h:152"></div><div class="c"></div>
            <div class="c"></div><div class="c"></div><div class="c"></div><div class="c on" style="--h:152"></div><div class="c"></div>
            <div class="c"></div><div class="c on" style="--h:28"></div><div class="c"></div><div class="c"></div><div class="c"></div>
          </div>
        </div>
      </div>`;
}

// ---------- Empty state: onboarding guide shown before any search ----------
function welcomeGuideHTML(){
  return `<div class="guide-panel inline" data-open="true">
    <div class="guide-head" style="cursor:default;">
      <div class="t">
        <h2>Cómo usar este buscador</h2>
        <p>Aún no has buscado nada — así arma tu horario en 5 pasos.</p>
      </div>
    </div>
    <div class="guide-mock">${guideMockHTML()}</div>
    <div class="guide-body">${guideStepsHTML()}</div>
  </div>`;
}

// ---------- Render: results ----------
const resultsEl = document.getElementById('results');
const resultsHeadEl = document.querySelector('.results-head');
const bottomGuideEl = document.getElementById('bottom-guide-wrap');
// Acordeón de tarjetas de ramo: códigos que están COLAPSADOS ahora mismo.
// Por defecto todas las tarjetas parten expandidas (mismo comportamiento
// que antes de este cambio), y sólo se agregan acá cuando el usuario
// aprieta una para cerrarla. Vive fuera de render() para que sobreviva a
// que se vuelva a llamar render() por otro motivo (agregar sección, cambiar
// filtro, etc.) sin perder qué tarjetas dejó cerradas.
const collapsedCourses = new Set();

function render(){
  const noFiltersActive = !simMode && !showAllForced && !query && !fNivel && !fArea && !fElectTouched && pickedSlots.size===0;
  updateClearAllBtn();

  if(noFiltersActive){
    resultsHeadEl.style.display = 'none';
    bottomGuideEl.style.display = 'none';
    resultsEl.innerHTML = welcomeGuideHTML();
    renderSchedule();
    return;
  }
  resultsHeadEl.style.display = '';
  bottomGuideEl.style.display = '';

  const matched = [];
  COURSES.forEach(course=>{
    const seccs = courseMatches(course);
    if(seccs) matched.push({course, seccs});
  });
  document.getElementById('count-n').textContent = matched.length;

  if(!matched.length){
    resultsEl.innerHTML = `<div class="empty-state">
      <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/></svg>
      <h3>Sin resultados</h3>
      <div>Prueba con otro código, nombre de ramo o profesor, o limpia los filtros de horario.</div>
    </div>`;
  } else {
    resultsEl.innerHTML = matched.map(({course, seccs})=>{
      const hue = hueFor(course.codigo);
      const rows = seccs.map(s=>{
        const key = sectionKey(course, s);
        const isAdded = selected.has(key);
        const chips = fmtHorario(s.bloques).map(h=>
          `<span class="horario-chip" style="--hue:${hue}; background:hsl(var(--hue) var(--chip-bg-sat) var(--chip-bg-light)); border-color:hsl(var(--hue) var(--chip-border-sat) var(--chip-border-light)); color:hsl(var(--hue) var(--chip-text-sat) var(--chip-text-light));">${h.label}</span>`
        ).join('');
        return `<tr>
          <td class="secc-num">${sectionLabel(course, s)}</td>
          <td>${s.profesor || '—'}${s.electividad!=='0' ? '<br><span class="tag elect" style="margin-top:3px;display:inline-block;">Electivo</span>':''}</td>
          <td><span class="cupo-badge ${cupoClass(s.cupo)}">${s.cupo ?? '—'}</span></td>
          <td><div class="horario-chips">${chips || '<span class="mono" style="color:var(--ink-faint)">—</span>'}</div></td>
          <td class="add-cell">
            <button class="add-btn ${isAdded?'added':''}" data-key="${key}" data-codigo="${course.codigo}" data-seccion="${s.seccion}" data-coord="${s.coord||''}" aria-label="${isAdded ? 'Quitar de mi horario' : 'Agregar a mi horario'}">
              <span class="swatch-dot" style="background:hsl(${hue} 60% 50%)"></span>
              <span class="add-label">${isAdded ? 'Agregada' : 'Agregar'}</span>
              <span class="add-icon" aria-hidden="true">${isAdded ? '✓' : '+'}</span>
            </button>
          </td>
        </tr>`;
      }).join('');
      const isOpen = !collapsedCourses.has(course.codigo);
      return `<div class="course-card" style="--course-hue:hsl(${hue} 55% 45%)" data-open="${isOpen}">
        <div class="course-head" role="button" tabindex="0" aria-expanded="${isOpen}" aria-controls="secc-${course.codigo}" data-codigo="${course.codigo}">
          <span class="course-code">${course.codigo}</span>
          <div class="course-title">${course.asignatura}</div>
          <div class="course-tags">
            ${course.nivel!=null ? `<span class="tag nivel">Nivel ${course.nivel}</span>` : ''}
            ${course.area ? `<span class="tag area">${areaLabel(course.area)}</span>` : ''}
            ${course.sct!=null ? `<span class="tag sct">${course.sct} SCT</span>` : ''}
          </div>
          <svg class="course-chevron" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>
        </div>
        <div class="secc-wrap" id="secc-${course.codigo}" style="overflow-x:auto;">
        <table class="secc-table">
          <thead><tr><th style="width:50px;">Sec.</th><th>Profesor</th><th style="width:60px;">Cupo</th><th>Horario</th><th class="add-th">Agregar</th></tr></thead>
          <tbody>${rows}</tbody>
        </table>
        </div>
      </div>`;
    }).join('');
    resultsEl.querySelectorAll('.add-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const course = courseMap.get(btn.dataset.codigo);
        const section = course.secciones.find(s=>String(s.seccion)===btn.dataset.seccion && (s.coord||'')===btn.dataset.coord);
        toggleSection(course, section);
      });
    });
    // Acordeón: apretar el encabezado de una tarjeta (o Enter/Espacio con
    // teclado, igual que el panel de guía de arriba) la colapsa/expande sin
    // volver a dibujar toda la lista de resultados.
    resultsEl.querySelectorAll('.course-head').forEach(head=>{
      const toggle = ()=>{
        const card = head.closest('.course-card');
        const codigo = head.dataset.codigo;
        const nowOpen = card.dataset.open !== 'true';
        card.dataset.open = String(nowOpen);
        head.setAttribute('aria-expanded', String(nowOpen));
        if(nowOpen) collapsedCourses.delete(codigo); else collapsedCourses.add(codigo);
      };
      head.addEventListener('click', toggle);
      head.addEventListener('keydown', e=>{
        if(e.key===' '||e.key==='Enter'){ e.preventDefault(); toggle(); }
      });
    });
  }

  renderSchedule();
}

// ---------- Render: my schedule (right rail + mobile mini preview + big bottom panel) ----------
// Each target keeps its OWN `view` state ('horario' | 'examenes') — the small
// rail panel and the big bottom panel are independent "Mi horario" instances
// showing the same underlying selection, but which of the two tabs (Horario
// semanal / Calendario de pruebas) is active is deliberately NOT shared
// between them, so switching one doesn't flip the other out from under you.
const SCHEDULE_TARGETS = [
  { grid:'week-grid', secc:'sum-secc', sct:'sum-sct', conf:'sum-conf', note:'conflict-note-wrap', list:'selected-list', empty:'rail-empty-wrap',
    tabH:'tab-horario', tabE:'tab-examenes', viewH:'view-horario', viewE:'view-examenes', examCal:'exam-cal', printBtn:'btn-print',
    view:'horario',
    // Al apretar un bloque de la grilla, aparece abajo el nombre del ramo.
    detail:'cell-detail' },
  { grid:'week-grid-big', secc:'sum-secc-big', sct:'sum-sct-big', conf:'sum-conf-big', note:'conflict-note-wrap-big', list:'selected-list-big', empty:'rail-empty-wrap-big',
    tabH:'tab-horario-big', tabE:'tab-examenes-big', viewH:'view-horario-big', viewE:'view-examenes-big', examCal:'exam-cal-big', printBtn:'btn-print-big',
    view:'horario', detail:'cell-detail-big',
    // Only the big bottom panel offers a second "visual" of the weekly
    // schedule (grid-with-numbers vs. day-by-day agenda list with names) —
    // the small rail panel stays grid-only to keep it compact. Which of the
    // two shows is no longer a manual toggle: it's purely a function of
    // viewport width (see mqCompactLayout in renderSchedule) — full names on
    // a "computador grande" (>=1180px, same breakpoint as the rest of the
    // site's desktop/compact split), abbreviated numbers below that, since
    // the named cells don't have room to breathe on narrower layouts.
    agenda:'day-agenda-big' },
];

// "Calendario de pruebas": a second view inside "Mi horario" (toggled via the
// tabs above) showing PEP1/PEP2 dates for the sections currently selected —
// only INGECO carries fechaPEP1/fechaPEP2 (from the Excel de programación;
// Mención Economía's PDF source never had this column), and a a handful of
// INGECO sections (Prácticas, Talleres, Habilidades para la Organización,
// Examen de Grado, and a few "vespertino" electivos) have no PEP date either
// — those sections just don't produce events, nothing is fabricated.

const MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const DOW_MON_LABELS = ['Lun','Mar','Mié','Jue','Vie','Sáb','Dom'];
const DOW_ES_SHORT = ['dom','lun','mar','mié','jue','vie','sáb']; // Date.getDay() order (Sun=0)

function fmtDateEs(iso){
  const [y,m,d] = iso.split('-').map(Number);
  const dt = new Date(y, m-1, d);
  return DOW_ES_SHORT[dt.getDay()]+' '+d+' '+MESES[m-1].slice(0,3)+'.';
}

function computeExamEvents(){
  const events = [];
  selected.forEach((v,key)=>{
    const hue = hueFor(v.course.codigo);
    [['fechaPEP1','PEP1'],['fechaPEP2','PEP2']].forEach(([field,tipo])=>{
      const date = v.section[field];
      if(!date) return;
      events.push({date, tipo, course:v.course, section:v.section, hue, key});
    });
  });
  events.sort((a,b)=> a.date.localeCompare(b.date) || a.tipo.localeCompare(b.tipo));
  return events;
}

function buildMonthCalendar(year, month, dayEvents){
  const first = new Date(year, month, 1);
  const startDow = (first.getDay()+6)%7; // Mon=0..Sun=6
  const daysInMonth = new Date(year, month+1, 0).getDate();
  let cells = '';
  for(let i=0;i<startDow;i++) cells += `<div class="exam-cal-cell empty"></div>`;
  for(let d=1; d<=daysInMonth; d++){
    const evs = dayEvents.get(d) || [];
    const hasCollision = new Set(evs.map(e=>e.course.codigo)).size > 1;
    const dots = evs.map(e=>
      `<span class="exam-dot" style="background:hsl(${e.hue} 60% 50%)" title="${e.course.asignatura} · ${e.tipo}"></span>`
    ).join('');
    cells += `<div class="exam-cal-cell ${evs.length?'has-events':''} ${hasCollision?'collision':''}">
      <span class="daynum">${d}</span>
      <div class="exam-dots">${dots}</div>
    </div>`;
  }
  const trailing = (7 - ((startDow+daysInMonth) % 7)) % 7;
  for(let i=0;i<trailing;i++) cells += `<div class="exam-cal-cell empty"></div>`;
  const header = DOW_MON_LABELS.map(l=>`<div class="exam-cal-hdr">${l}</div>`).join('');
  return `<div class="exam-cal-month">
    <div class="exam-cal-month-title">${MESES[month]} ${year}</div>
    <div class="exam-cal-grid">${header}${cells}</div>
  </div>`;
}

function renderExamCalendarHTML(){
  if(!selected.size){
    return '<div class="rail-empty">Aún no agregas secciones.<br>Usa “Agregar” en los resultados.</div>';
  }
  const events = computeExamEvents();
  if(!events.length){
    return '<div class="rail-empty">Ninguno de los ramos en tu horario tiene fecha de PEP1/PEP2 registrada (por ejemplo, prácticas, talleres o examen de grado).</div>';
  }

  const monthsMap = new Map(); // 'Y-M' -> {y, m, days: Map<day, events[]>}
  events.forEach(e=>{
    const [y,m,d] = e.date.split('-').map(Number);
    const mk = y+'-'+m;
    if(!monthsMap.has(mk)) monthsMap.set(mk, {y, m: m-1, days: new Map()});
    const days = monthsMap.get(mk).days;
    if(!days.has(d)) days.set(d, []);
    days.get(d).push(e);
  });
  const monthsHTML = Array.from(monthsMap.values())
    .sort((a,b)=> (a.y-b.y) || (a.m-b.m))
    .map(mb => buildMonthCalendar(mb.y, mb.m, mb.days))
    .join('');

  const byDate = new Map();
  events.forEach(e=>{
    if(!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  });
  const collisionDates = new Set(
    Array.from(byDate.entries())
      .filter(([,evs])=> new Set(evs.map(x=>x.course.codigo)).size > 1)
      .map(([d])=>d)
  );
  const collisionHTML = collisionDates.size
    ? `<div class="conflict-note">⚠ Tienes ${collisionDates.size} fecha(s) con más de un PEP el mismo día: ${Array.from(collisionDates).map(fmtDateEs).join(', ')}</div>`
    : '';

  const listHTML = events.map(e=>{
    const inCollision = collisionDates.has(e.date);
    return `<div class="exam-list-item ${inCollision?'collision':''}">
      <span class="swatch-dot" style="background:hsl(${e.hue} 55% 45%)"></span>
      <div class="txt">
        <div class="name">${e.course.asignatura}<span class="tag ${e.tipo==='PEP1'?'pep1':'pep2'}">${e.tipo}</span></div>
        <div class="meta">${fmtDateEs(e.date)} · ${e.course.codigo} · Sec. ${sectionLabel(e.course, e.section)}</div>
      </div>
    </div>`;
  }).join('');

  return `<div class="exam-cal-months">${monthsHTML}</div>${collisionHTML}<div class="exam-list">${listHTML}</div>`;
}

function buildWeekGrid(container, occ, conflictSlots, showAbbr, detailEl, conflictKeys, allowRemoveFromDetail){
  container.innerHTML = '';
  container.appendChild(document.createElement('div'));
  DIAS.forEach(d=>{ const h=document.createElement('div'); h.className='hdr'; h.textContent=DIA_LABEL[d]; container.appendChild(h); });
  BLOQUES.forEach(b=>{
    const rl=document.createElement('div'); rl.className='rowlabel'; rl.textContent='M'+b; container.appendChild(rl);
    DIAS.forEach(d=>{
      const key = d+'-'+b;
      const cellData = occ[key];
      const slot = document.createElement('div');
      slot.className = 'slot';
      slot.title = DIA_LABEL_FULL[d]+' · '+MODULOS[b][0]+'–'+MODULOS[b][1];
      if(cellData && cellData.length){
        slot.classList.add('filled');
        if(detailEl){
          slot.tabIndex = 0;
          slot.setAttribute('role', 'button');
          slot.setAttribute('aria-label', 'Ver ramo(s) de este bloque');
          slot.addEventListener('click', ()=> showCellDetail(detailEl, cellData, conflictKeys, allowRemoveFromDetail));
          slot.addEventListener('keydown', (ev)=>{ if(ev.key==='Enter' || ev.key===' '){ ev.preventDefault(); showCellDetail(detailEl, cellData, conflictKeys, allowRemoveFromDetail); } });
        }
        const isConflict = conflictSlots.has(key);
        if(isConflict && cellData.length > 1){
          slot.classList.add('conflict', 'multi');
          const split = document.createElement('div');
          split.className = 'slot-split';
          cellData.forEach(cd=>{
            const band = document.createElement('div');
            band.className = 'split-band';
            band.style.background = `hsl(${cd.hue} 55% 45%)`;
            if(showAbbr){
              const abbr = document.createElement('span');
              abbr.className = 'abbr-mini';
              abbr.textContent = cd.codigo.slice(-3);
              band.appendChild(abbr);
            }
            split.appendChild(band);
          });
          slot.appendChild(split);
        } else {
          const hue = cellData[0].hue;
          slot.style.background = `hsl(${hue} 55% 45%)`;
          slot.style.borderColor = `hsl(${hue} 55% 35%)`;
          if(showAbbr){
            const abbr = document.createElement('span');
            abbr.className = 'abbr';
            abbr.style.color = '#fff';
            abbr.textContent = cellData[0].codigo.slice(-3);
            slot.appendChild(abbr);
          }
          if(isConflict){
            slot.classList.add('conflict');
          }
        }
      }
      container.appendChild(slot);
    });
  });
}

// Al presionar un bloque ocupado de la grilla, muestra abajo el/los ramo(s)
// de ese bloque (mismo diseño de tarjeta que .selected-list). Si la lista
// completa de "Mi horario" ya está visible en pantalla en ese mismo panel
// (siempre en el panel grande; en el chico, salvo en modo amigable donde se
// esconde) esta tarjeta es sólo informativa y NO trae botón de quitar — ya
// hay un botón × para ese mismo ramo en la lista de abajo, y mostrar dos
// controles de borrado para el mismo ramo a la vez es confuso y se sentía
// como un duplicado. Sólo se puede quitar desde acá cuando es la única
// forma de verlo (panel chico en modo amigable, donde la lista está oculta).
function showCellDetail(detailEl, cellData, conflictKeys, allowRemove){
  if(!detailEl || !cellData || !cellData.length) return;
  const html = cellData.map(cd=>{
    const v = selected.get(cd.key);
    if(!v) return '';
    const inConflict = conflictKeys && conflictKeys.has(cd.key);
    return `<div class="selected-item">
      <span class="swatch-dot" style="background:hsl(${cd.hue} 55% 45%); ${inConflict?'outline:2px solid var(--red);outline-offset:1px;':''}"></span>
      <div class="txt">
        <div class="name">${v.course.asignatura}</div>
        <div class="meta">${v.course.codigo} · Sec. ${sectionLabel(v.course, v.section)}${v.section.profesor ? ' · '+v.section.profesor : ''}</div>
      </div>
      ${allowRemove ? `<button class="remove-btn" data-key="${cd.key}" title="Quitar">×</button>` : ''}
    </div>`;
  }).join('');
  if(!html) return;
  detailEl.innerHTML = html;
  detailEl.hidden = false;
  if(allowRemove){
    detailEl.querySelectorAll('.remove-btn').forEach(btn=>{
      btn.addEventListener('click', ()=>{ selected.delete(btn.dataset.key); saveSelection(); render(); });
    });
  }
}

// "Horario con nombres" — a second visual of the same week grid, inspired
// by a printable weekly-schedule photo the user shared: instead of an
// abbreviated 3-digit code, each occupied cell shows the subject name and
// professor directly. Reuses the same DIAS/BLOQUES/MODULOS layout and `occ`
// data as buildWeekGrid (day columns, module rows), just with bigger
// text-bearing cells instead of abbreviated color blocks.
// NOTE: no room/"sala" shown here either — same reason as the old day-list
// view had: the source data has no room column, so nothing is fabricated.
function buildNamedGrid(container, occ, conflictSlots){
  container.className = 'week-grid named-grid';
  container.innerHTML = '';
  container.appendChild(document.createElement('div'));
  DIAS.forEach(d=>{ const h=document.createElement('div'); h.className='hdr'; h.textContent=DIA_LABEL[d]; container.appendChild(h); });
  BLOQUES.forEach(b=>{
    const rl=document.createElement('div'); rl.className='rowlabel'; rl.textContent=MODULOS[b][0]+'–'+MODULOS[b][1]; container.appendChild(rl);
    DIAS.forEach(d=>{
      const key = d+'-'+b;
      const cellData = occ[key];
      const slot = document.createElement('div');
      slot.className = 'slot-named';
      slot.title = DIA_LABEL_FULL[d]+' · '+MODULOS[b][0]+'–'+MODULOS[b][1];
      if(cellData && cellData.length){
        slot.classList.add('filled');
        const isConflict = conflictSlots.has(key);
        const cellHTML = (cd, small)=>{
          const v = selected.get(cd.key);
          if(!v) return '';
          return `<div class="named-subj">${v.course.asignatura}</div>${v.section.profesor ? `<div class="named-prof">${v.section.profesor}</div>` : ''}`;
        };
        if(isConflict && cellData.length > 1){
          slot.classList.add('conflict');
          cellData.forEach(cd=>{
            const band = document.createElement('div');
            band.className = 'named-band';
            band.style.background = `hsl(${cd.hue} 60% 88%)`;
            band.style.borderLeftColor = `hsl(${cd.hue} 55% 45%)`;
            band.innerHTML = cellHTML(cd, true);
            slot.appendChild(band);
          });
        } else {
          const cd = cellData[0];
          slot.style.background = `hsl(${cd.hue} 60% 88%)`;
          slot.style.borderLeftColor = `hsl(${cd.hue} 55% 45%)`;
          slot.innerHTML = cellHTML(cd, false);
        }
      }
      container.appendChild(slot);
    });
  });
}

function renderSchedule(){
  const {conflictSlots, conflictKeys} = computeConflicts();

  let sct = 0;
  let sctUnknown = false;
  selected.forEach(v=>{
    if(v.course.sct==null){ sctUnknown = true; }
    else { sct += v.course.sct; }
  });
  const sctDisplay = sctUnknown ? '—' : sct;

  // grid
  const occ = {}; // "d-b" -> array of {key, hue}
  selected.forEach((v,key)=>{
    const hue = hueFor(v.course.codigo);
    v.section.bloques.forEach(b=>{
      const k = b.dia+'-'+b.bloque;
      (occ[k]=occ[k]||[]).push({key, hue, codigo:v.course.codigo});
    });
  });

  const conflictNoteHTML = conflictSlots.size
    ? `<div class="conflict-note">⚠ Tienes ${conflictSlots.size} bloque(s) con choque de horario. Revisa las secciones marcadas en rojo.</div>`
    : '';

  const selectedListHTML = selected.size ? Array.from(selected.entries()).map(([key,v])=>{
    const hue = hueFor(v.course.codigo);
    const inConflict = conflictKeys.has(key);
    return `<div class="selected-item">
      <span class="swatch-dot" style="background:hsl(${hue} 55% 45%); ${inConflict?'outline:2px solid var(--red);outline-offset:1px;':''}"></span>
      <div class="txt">
        <div class="name">${v.course.asignatura}</div>
        <div class="meta">${v.course.codigo} · Sec. ${sectionLabel(v.course, v.section)}</div>
      </div>
      <button class="remove-btn" data-key="${key}" title="Quitar">×</button>
    </div>`;
  }).join('') : '';

  const examCalHTML = renderExamCalendarHTML();

  SCHEDULE_TARGETS.forEach(t=>{
    document.getElementById(t.secc).textContent = selected.size;
    document.getElementById(t.sct).textContent = sctDisplay;
    document.getElementById(t.conf).textContent = conflictSlots.size;

    const detailEl = t.detail ? document.getElementById(t.detail) : null;
    if(detailEl){ detailEl.hidden = true; detailEl.innerHTML = ''; }
    // Si la lista completa de "Mi horario" ya se ve en pantalla en este panel
    // (siempre en el panel grande; en el chico, salvo en modo amigable, que la
    // esconde por CSS), la tarjeta de detalle es sólo informativa — no se
    // puede quitar desde ahí, porque ya existe un botón × para lo mismo más
    // abajo y dos controles de borrado para el mismo ramo a la vez confunde.
    const listElForVis = document.getElementById(t.list);
    const listIsVisible = !!listElForVis && getComputedStyle(listElForVis).display !== 'none';
    buildWeekGrid(document.getElementById(t.grid), occ, conflictSlots, true, detailEl, conflictKeys, !listIsVisible);

    if(t.agenda){
      // No manual toggle anymore — the viewport decides: named cells on a
      // large "computador" viewport (>=1180px), abbreviated numbers below
      // that, same breakpoint the rest of the layout switches on.
      const showList = !mqCompactLayout.matches;
      document.getElementById(t.grid).hidden = showList;
      document.getElementById(t.agenda).hidden = !showList;
      if(showList) buildNamedGrid(document.getElementById(t.agenda), occ, conflictSlots);
      if(detailEl && showList) detailEl.hidden = true;
    }

    document.getElementById(t.note).innerHTML = conflictNoteHTML;

    const listEl = document.getElementById(t.list);
    const emptyWrap = document.getElementById(t.empty);
    if(!selected.size){
      listEl.innerHTML = '';
      emptyWrap.innerHTML = '<div class="rail-empty">Aún no agregas secciones.<br>Usa “Agregar” en los resultados.</div>';
    } else {
      emptyWrap.innerHTML = '';
      listEl.innerHTML = selectedListHTML;
      listEl.querySelectorAll('.remove-btn').forEach(btn=>{
        btn.addEventListener('click', ()=>{ selected.delete(btn.dataset.key); saveSelection(); render(); });
      });
    }

    document.getElementById(t.examCal).innerHTML = examCalHTML;
    document.getElementById(t.viewH).hidden = t.view !== 'horario';
    document.getElementById(t.viewE).hidden = t.view !== 'examenes';
    document.getElementById(t.tabH).setAttribute('aria-pressed', String(t.view === 'horario'));
    document.getElementById(t.tabE).setAttribute('aria-pressed', String(t.view === 'examenes'));
    document.getElementById(t.printBtn).textContent = t.view === 'examenes' ? 'Imprimir calendario' : 'Imprimir horario';
  });
}

function setScheduleView(target, view){
  target.view = view;
  renderSchedule();
}
SCHEDULE_TARGETS.forEach(t=>{
  document.getElementById(t.tabH).addEventListener('click', ()=> setScheduleView(t, 'horario'));
  document.getElementById(t.tabE).addEventListener('click', ()=> setScheduleView(t, 'examenes'));
});
// Crossing the 1180px breakpoint (e.g. resizing the window, or rotating a
// tablet) flips the big panel between named cells and abbreviated numbers —
// re-render so it updates live instead of waiting for the next selection change.
if(mqCompactLayout.addEventListener) mqCompactLayout.addEventListener('change', renderSchedule);
else if(mqCompactLayout.addListener) mqCompactLayout.addListener(renderSchedule); // older Safari

// ---------- Confirm dialog (used for "Vaciar horario") ----------
const confirmOverlay = document.getElementById('confirm-overlay');
const confirmAccept = document.getElementById('confirm-accept');
const confirmCancel = document.getElementById('confirm-cancel');
let confirmResolve = null;
function askConfirm(){
  confirmOverlay.hidden = false;
  return new Promise(resolve=>{ confirmResolve = resolve; });
}
function closeConfirm(result){
  confirmOverlay.hidden = true;
  if(confirmResolve){ confirmResolve(result); confirmResolve = null; }
}
confirmAccept.addEventListener('click', ()=> closeConfirm(true));
confirmCancel.addEventListener('click', ()=> closeConfirm(false));
confirmOverlay.addEventListener('click', e=>{ if(e.target === confirmOverlay) closeConfirm(false); });
document.addEventListener('keydown', e=>{ if(e.key === 'Escape' && !confirmOverlay.hidden) closeConfirm(false); });

['btn-clear','btn-clear-big'].forEach(id=>{
  document.getElementById(id).addEventListener('click', async ()=>{
    if(!selected.size) return;
    const ok = await askConfirm();
    if(!ok) return;
    selected.clear(); saveSelection(); render();
  });
});
// The print stylesheet only ever shows #rail-right-panel (SCHEDULE_TARGETS[0])
// — .big-schedule-wrap is hidden at print time regardless of screen layout.
// Since the two panels' Horario/Calendario tabs are independent, printing from
// the BIG panel's button needs to briefly mirror its view onto the small panel
// so the printout matches what that button's label promised, then restore the
// small panel's own view once the print dialog closes (not immediately after
// window.print(), which doesn't reliably block until the dialog is done).
function printSchedule(t){
  const railTarget = SCHEDULE_TARGETS[0];
  const prevView = railTarget.view;
  if(railTarget !== t && railTarget.view !== t.view){
    railTarget.view = t.view;
    renderSchedule();
    const restore = ()=>{
      railTarget.view = prevView;
      renderSchedule();
      window.removeEventListener('afterprint', restore);
    };
    window.addEventListener('afterprint', restore);
  }
  window.print();
}
SCHEDULE_TARGETS.forEach(t=>{
  document.getElementById(t.printBtn).addEventListener('click', ()=> printSchedule(t));
});

// ---------- BuscaCursos icon: scroll back to top ----------
document.getElementById('app-mark').addEventListener('click', ()=>{
  window.scrollTo({top:0, behavior:'smooth'});
});

// ---------- Theme toggle (light / dark, remembers choice) ----------
(function initTheme(){
  const root = document.documentElement;
  const btn = document.getElementById('theme-toggle');
  const icon = btn.querySelector('svg');
  const ICON_SUN = '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>';
  const ICON_MOON = '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';

  function systemPrefersDark(){
    return !!(window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  }
  // The underlying light/dark preference, ignoring "modo amigable" — used to
  // know what to fall back to when amigable is switched off, and to decide
  // what the sun/moon icon should show while amigable is on.
  function savedBase(){
    let t = null;
    try{ t = localStorage.getItem('bc-usach-theme'); }catch(e){}
    if(t === 'dark' || t === 'light') return t;
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function isAmigable(){ return root.getAttribute('data-theme') === 'amigable'; }
  function effectiveTheme(){
    const attr = root.getAttribute('data-theme');
    if(attr === 'dark' || attr === 'light') return attr;
    if(attr === 'amigable') return savedBase();
    return systemPrefersDark() ? 'dark' : 'light';
  }
  function updateIcon(){
    const isDark = effectiveTheme() === 'dark';
    icon.innerHTML = isDark ? ICON_MOON : ICON_SUN;
    const label = isDark ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';
    btn.title = label;
    btn.setAttribute('aria-label', label);
  }

  updateIcon(); // data-theme, if saved, was already applied before first paint (see <head>)

  btn.addEventListener('click', ()=>{
    // Clicking the sun/moon toggle always exits "modo amigable" explicitly —
    // it picks a concrete light or dark choice.
    const next = effectiveTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try{
      localStorage.setItem('bc-usach-theme', next);
      localStorage.setItem('bc-usach-amigable', 'off');
    }catch(e){}
    updateAmigableBtn();
    updateIcon();
  });

  // ---------- "Modo amigable" (🎀): warm pink/cream palette, its own toggle,
  // independent of the light/dark cycle above (see the "amigable" CSS block
  // and the note in the CSS for scope — colors only for now). ----------
  const amigBtn = document.getElementById('amigable-toggle');
  function updateAmigableBtn(){
    const on = isAmigable();
    amigBtn.setAttribute('aria-pressed', String(on));
    const label = on ? 'Desactivar modo amigable' : 'Activar modo amigable';
    amigBtn.title = label;
    amigBtn.setAttribute('aria-label', label);
  }
  updateAmigableBtn();
  amigBtn.addEventListener('click', ()=>{
    if(isAmigable()){
      root.setAttribute('data-theme', savedBase());
      try{ localStorage.setItem('bc-usach-amigable', 'off'); }catch(e){}
    } else {
      root.setAttribute('data-theme', 'amigable');
      try{ localStorage.setItem('bc-usach-amigable', 'on'); }catch(e){}
    }
    updateAmigableBtn();
    updateIcon();
    // El modo amigable esconde/muestra .selected-list por CSS en el panel
    // chico (ver bloque de estilos de arriba), lo que cambia si la tarjeta
    // de detalle al apretar un bloque debe traer botón de quitar o no (ver
    // showCellDetail) — hay que re-renderizar para que ese cálculo no quede
    // con el valor del tema anterior.
    if(typeof renderSchedule === 'function') renderSchedule();
  });
})();

// ---------- View mode override: force the "iPad" tablet layout on a phone,
// and back ----------
// Real mobile browsers size their CSS viewport (and every @media query) off
// the <meta name="viewport"> tag, not the physical screen — that's exactly
// how "Request desktop site" works in Chrome/Safari. Swapping that tag's
// content between the normal device-width value and a fixed wide value
// (with no explicit scale, so the browser auto-zooms to fit) makes the page
// render — and the existing 700px/1180px breakpoints kick in — as if the
// phone were a tablet, with zero other CSS/JS changes needed. This has no
// effect on desktop browsers, which ignore the viewport meta tag entirely.
(function initViewMode(){
  const VIEWPORT_DEFAULT = 'width=device-width, initial-scale=1';
  const VIEWPORT_WIDE = 'width=1024';
  const metaViewport = document.querySelector('meta[name="viewport"]');
  const btnTop = document.getElementById('view-mode-toggle-top');
  const btnBottom = document.getElementById('view-mode-toggle-bottom');
  const mqCompact = window.matchMedia('(max-width: 700px)');

  let forcedWide = false;
  try{ forcedWide = localStorage.getItem('bc-usach-view-mode') === 'wide'; }catch(e){}

  function applyViewport(){
    metaViewport.setAttribute('content', forcedWide ? VIEWPORT_WIDE : VIEWPORT_DEFAULT);
  }
  function updateButtons(){
    // Offer "Ver como iPad" only while the layout is actually showing the
    // compact phone arrangement and hasn't already been forced wide.
    btnTop.hidden = forcedWide || !mqCompact.matches;
    // Offer "Ver como iPhone" only while the wide override is the reason
    // we're in the tablet layout.
    btnBottom.hidden = !forcedWide;
  }
  function setForcedWide(v){
    forcedWide = v;
    try{ localStorage.setItem('bc-usach-view-mode', v ? 'wide' : 'auto'); }catch(e){}
    applyViewport();
    // The browser recomputes the CSS viewport (and matchMedia results) after
    // a viewport-meta change asynchronously, so re-check on the next frame;
    // the 'change' listener below is the authoritative catch-all.
    requestAnimationFrame(updateButtons);
  }

  applyViewport();
  updateButtons();
  btnTop.addEventListener('click', ()=> setForcedWide(true));
  btnBottom.addEventListener('click', ()=> setForcedWide(false));
  if(mqCompact.addEventListener) mqCompact.addEventListener('change', updateButtons);
  else if(mqCompact.addListener) mqCompact.addListener(updateButtons); // older Safari
})();

// ---------- Guide panel (collapsible, remembers state) ----------
(function initGuide(){
  const panel = document.getElementById('guide-panel');
  const toggle = document.getElementById('guide-toggle');
  // Rellena el panel colapsable con la misma ilustración y pasos que usa
  // welcomeGuideHTML() — ver la nota junto a GUIDE_STEPS más arriba.
  document.getElementById('guide-mock').innerHTML = guideMockHTML();
  document.getElementById('guide-body').innerHTML = guideStepsHTML();
  let open = false;
  try{
    const saved = localStorage.getItem('bc-usach-guide-open');
    if(saved !== null) open = saved === 'true';
  }catch(e){}
  function setOpen(v){
    open = v;
    panel.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    try{ localStorage.setItem('bc-usach-guide-open', String(open)); }catch(e){}
  }
  setOpen(open);
  toggle.addEventListener('click', ()=> setOpen(!open));
  toggle.addEventListener('keydown', e=>{
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); setOpen(!open); }
  });
})();

// ---------- Guide panel placement: in modo amigable it moves up to live as
// a compact button right below the search bar, instead of down after the
// results/horario layout where it lives in every other theme. Mismo patrón
// de reparenting que initSchedulePlacement de más abajo — mueve el mismo
// nodo entre 2 posiciones fijas del DOM en vez de duplicar el markup, así
// que el estado abierto/cerrado (bc-usach-guide-open, ver initGuide arriba)
// y el contenido (ilustración + pasos) son siempre los mismos, sólo cambia
// dónde vive. ----------
(function initGuidePlacement(){
  const wrap = document.getElementById('bottom-guide-wrap');
  const amigableSlot = document.getElementById('guide-slot-topbar');
  // Fuera de modo amigable, el guide vive donde siempre — inmediatamente
  // antes de #big-schedule-wrap (su posición original en shell.html).
  const defaultAnchor = document.getElementById('big-schedule-wrap');
  if(!wrap || !amigableSlot || !defaultAnchor) return;
  const root = document.documentElement;

  function isAmigable(){ return root.getAttribute('data-theme') === 'amigable'; }

  function place(){
    if(isAmigable()){
      if(wrap.parentElement !== amigableSlot) amigableSlot.appendChild(wrap);
    } else if(wrap.parentElement !== defaultAnchor.parentElement || wrap.nextElementSibling !== defaultAnchor){
      defaultAnchor.parentElement.insertBefore(wrap, defaultAnchor);
    }
  }
  place();

  // El toggle de modo amigable (🎀) vive en otra función (initTheme, más
  // arriba) — en vez de acoplarse a ese código, se observa directamente el
  // atributo data-theme del <html>, así ambas funciones quedan
  // independientes entre sí.
  const mo = new MutationObserver(place);
  mo.observe(root, { attributes:true, attributeFilter:['data-theme'] });
})();

// ---------- Responsive reparenting: move "Mi horario" beside the picker whenever the layout is single-column ----------
(function initSchedulePlacement(){
  const panel = document.getElementById('rail-right-panel');
  const mobileSlot = document.getElementById('mihorario-slot-mobile');
  const desktopSlot = document.querySelector('.rail-right');
  const mq = window.matchMedia('(max-width: 1180px)');
  function place(){
    const target = mq.matches ? mobileSlot : desktopSlot;
    if(panel.parentElement !== target) target.appendChild(panel);
  }
  place();
  if(mq.addEventListener) mq.addEventListener('change', place);
  else if(mq.addListener) mq.addListener(place); // older Safari
})();

// ---------- Picker panel ("Filtrar por horario libre"), collapsible in modo
// amigable (mismo patrón que el guide panel de arriba). Fuera de modo
// amigable el CSS no usa data-open para nada, así que este estado no cambia
// el aspecto del panel en los otros temas — sólo importa cuando 🎀 está
// activo. ----------
(function initPickerCollapse(){
  const panel = document.getElementById('picker-panel');
  const toggle = document.getElementById('picker-toggle');
  if(!panel || !toggle) return;
  let open = false;
  try{
    const saved = localStorage.getItem('bc-usach-picker-open');
    if(saved !== null) open = saved === 'true';
  }catch(e){}
  function setOpen(v){
    open = v;
    panel.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    try{ localStorage.setItem('bc-usach-picker-open', String(open)); }catch(e){}
  }
  setOpen(open);
  toggle.addEventListener('click', ()=> setOpen(!open));
  toggle.addEventListener('keydown', e=>{
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); setOpen(!open); }
  });
})();

// ---------- Panel "Mi horario" (#rail-right-panel), colapsable en modo
// amigable — mismo patrón que initPickerCollapse de arriba (fuera de modo
// amigable el CSS no usa data-open para nada, así que este estado no
// cambia el aspecto del panel en los otros temas). A diferencia del
// picker, acá el chevron no es la ÚNICA forma de abrirlo: apretar
// cualquiera de las 2 pestañas ("Horario semanal" / "Calendario de
// pruebas") también lo despliega — tiene más sentido que el usuario abra
// su horario apretando la pestaña que quiere ver, en vez de tener que
// encontrar la flecha primero. El chevron sigue funcionando en ambos
// sentidos (abre y cierra), pero su rol principal es volver a colapsar.
// Sólo aplica a la instancia chica (#rail-right-panel) — el panel grande
// de abajo (.big-schedule-wrap) queda "siempre visible" como siempre. ----
(function initRailScheduleCollapse(){
  const panel = document.getElementById('rail-right-panel');
  const toggle = document.getElementById('rail-sched-toggle');
  const tabHorario = document.getElementById('tab-horario');
  const tabExamenes = document.getElementById('tab-examenes');
  if(!panel || !toggle) return;
  let open = false;
  try{
    const saved = localStorage.getItem('bc-usach-rail-sched-open');
    if(saved !== null) open = saved === 'true';
  }catch(e){}
  function setOpen(v){
    open = v;
    panel.dataset.open = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    try{ localStorage.setItem('bc-usach-rail-sched-open', String(open)); }catch(e){}
  }
  setOpen(open);
  toggle.addEventListener('click', ()=> setOpen(!open));
  toggle.addEventListener('keydown', e=>{
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); setOpen(!open); }
  });
  // Las pestañas ya tienen su propio listener (setScheduleView, más
  // arriba) que cambia qué vista se muestra — este listener adicional
  // sólo se preocupa de desplegar el panel si estaba colapsado, así que
  // ambos conviven sin pisarse.
  if(tabHorario) tabHorario.addEventListener('click', ()=> setOpen(true));
  if(tabExamenes) tabExamenes.addEventListener('click', ()=> setOpen(true));
})();

// ---------- Panel "Dataset" (Asignaturas/Secciones/Áreas): oculto para
// todo el mundo por defecto (el usuario lo encontró poco útil para el
// alumno normal, se ve más limpio sin él) — sólo se muestra en una
// "versión de administración": visitar la página una vez con ?admin en la
// URL (ej. index.html?admin) lo activa y lo deja recordado en ese
// navegador (localStorage), sin tener que repetir el parámetro cada vez.
// No hay login real porque el sitio no tiene backend — esto es sólo un
// interruptor oculto, no seguridad de verdad; cualquiera que sepa el
// parámetro puede activarlo. Visitar con ?admin=0 lo vuelve a esconder. ----------
(function initDatasetPanel(){
  const panel = document.getElementById('dataset-panel');
  if(!panel) return;
  try{
    const params = new URLSearchParams(location.search);
    if(params.has('admin')){
      const off = params.get('admin') === '0';
      localStorage.setItem('bc-usach-admin', off ? '0' : '1');
    }
    if(localStorage.getItem('bc-usach-admin') === '1') panel.hidden = false;
  }catch(e){}
})();

// ---------- Firma "Sitio en Construcción" (footer #chelpaHazeFooter):
// colapsable, mismo patrón que initGuide/initPickerCollapse de arriba.
// Colapsada por defecto: sólo se ve la barra + la vista previa "dev/Chelpa
// · Haze". Al desplegar aparece la firma completa (banner, tarjeta,
// tuercas). "Francisco · chazeware" queda fuera de #chz-body a propósito,
// así que se ve siempre, esté desplegado o no.
//
// Refactorizada a función reutilizable (antes era una IIFE fija a los ids
// del footer principal) porque ahora hay una segunda copia de la firma
// dentro de la Malla curricular, sólo de prueba — ver "Vista previa de
// firma dentro de la Malla" más abajo. Cada llamado recibe sus propios ids
// y su propia clave de localStorage para que las dos copias no se pisen. ----------
function initChzToggle(toggleId, bodyId, previewId, storageKey){
  const toggle = document.getElementById(toggleId);
  const body = document.getElementById(bodyId);
  const preview = document.getElementById(previewId);
  if(!toggle || !body || !preview) return;
  let open = false;
  try{
    const saved = localStorage.getItem(storageKey);
    if(saved !== null) open = saved === 'true';
  }catch(e){}
  function setOpen(v){
    open = v;
    toggle.setAttribute('aria-expanded', String(open));
    body.hidden = !open;
    preview.hidden = open;
    try{ localStorage.setItem(storageKey, String(open)); }catch(e){}
    // El canvas de humo mide el banner con getBoundingClientRect() sólo al
    // cargar y en window "resize". Mientras el body está oculto ese banner
    // mide 0×0, así que al desplegar hay que forzar un recálculo para que
    // el humo no quede con un canvas de tamaño cero.
    if(open) window.dispatchEvent(new Event('resize'));
  }
  setOpen(open);
  toggle.addEventListener('click', ()=> setOpen(!open));
  toggle.addEventListener('keydown', e=>{
    if(e.key===' '||e.key==='Enter'){ e.preventDefault(); setOpen(!open); }
  });
}
initChzToggle('chz-toggle', 'chz-body', 'chz-preview', 'bc-usach-chz-open');

// Misma barra colapsable "Sitio en Construcción // WIP v0.9", ahora también
// para la firma nueva dentro de la Malla — ids y localStorage propios para
// no pisar la firma principal de arriba.
initChzToggle('chz-toggleMalla', 'chz-bodyMalla', 'chz-previewMalla', 'bc-usach-chz-open-malla');

// Copia completa de la firma original del inicio, reintroducida al fondo de
// la Malla (ver #chelpaHazeFooterMallaOriginal más abajo en el HTML) — ids y
// clave de localStorage propios, no pisa ni la firma real ni la del cogollo.
initChzToggle('chz-toggleMallaOriginal', 'chz-bodyMallaOriginal', 'chz-previewMallaOriginal', 'bc-usach-chz-open-malla-original');
initChzSmoke('chelpaHazeFooterMallaOriginal', 'chzSmokeMallaOriginal');

// Barra "pipeline" decorativa (build → lint → test → deploy) al fondo de
// la Malla curricular, justo debajo de la firma nano de arriba (la que
// muestra "malla_grid.html · grafo" colapsada). Es puramente cosmética:
// no dispara nada real, sólo cicla los 4 estados con setTimeout en loop
// para sentirse como un CI corriendo solo, coherente con el resto de las
// firmas "dev" del sitio.
function initChzPipeline(containerId){
  var root = document.getElementById(containerId);
  if (!root) return;
  var stages = Array.prototype.slice.call(root.querySelectorAll('.chz-pipeline-stage'));
  var statusEl = root.querySelector('.chz-pipeline-status');
  if (!stages.length || !statusEl) return;

  var MESSAGES = {
    build: 'build → compilando index.html…',
    lint: 'lint → revisando estilos y clases…',
    test: 'test → corriendo la suite de Playwright…',
    deploy: 'deploy → publicando en GitHub Pages…'
  };
  var RUN_MS = 1100;
  var GAP_MS = 250;
  var DONE_HOLD_MS = 2600;
  var RESTART_GAP_MS = 900;
  var DONE_MSG = '✓ pipeline OK — todo verde, listo para producción';

  function setState(el, state){
    el.classList.remove('chz-pipeline-stage--idle', 'chz-pipeline-stage--running', 'chz-pipeline-stage--done');
    el.classList.add('chz-pipeline-stage--' + state);
  }

  function resetAll(){
    stages.forEach(function(s){ setState(s, 'idle'); });
    statusEl.textContent = 'esperando…';
    statusEl.classList.remove('chz-pipeline-status--ok');
  }

  function runStage(i){
    if (i >= stages.length){
      statusEl.textContent = DONE_MSG;
      statusEl.classList.add('chz-pipeline-status--ok');
      setTimeout(function(){
        resetAll();
        setTimeout(function(){ runStage(0); }, RESTART_GAP_MS);
      }, DONE_HOLD_MS);
      return;
    }
    var stage = stages[i];
    var key = stage.getAttribute('data-stage');
    setState(stage, 'running');
    statusEl.textContent = MESSAGES[key] || '…';
    setTimeout(function(){
      setState(stage, 'done');
      setTimeout(function(){ runStage(i + 1); }, GAP_MS);
    }, RUN_MS);
  }

  resetAll();
  runStage(0);
}
initChzPipeline('chzPipeline');

// ---------- Segunda firma, sólo dentro de la Malla curricular ----------
// #malla-footer-preview, al fondo de la Malla: la firma nueva ("nano_gollo",
// con Tailwind, aceptada por el usuario) que marca esta sección como
// todavía en construcción. Es una firma propia y aparte — no reemplaza ni
// duplica la firma original de la página principal (#chelpaHazeFooter),
// que sigue intacta con su propio initChzSmoke/initChzToggle más arriba.
// Humo ambiente detrás del cogollo — mismo motor de partículas que
// initChzSmoke, pero sale siempre que el elemento esté visible (no depende
// de un toggle desplegable) y nace del centro del círculo del dibujo en vez
// del banner.
(function initNanoSmoke(){
  const wrap = document.querySelector('#malla-footer-preview .nano-bud-wrap');
  const canvas = document.getElementById('nano-smoke');
  if(!wrap || !canvas) return;
  const ctx = canvas.getContext('2d');
  if(!ctx) return;
  let particles = [];
  let running = false;
  let raf = null;
  function resize(){
    const rect = wrap.getBoundingClientRect();
    canvas.width = Math.max(1, Math.round(rect.width));
    canvas.height = Math.max(1, Math.round(rect.height));
  }
  resize();
  window.addEventListener('resize', resize);
  function spawn(){
    for(let i=0;i<3;i++){
      particles.push({
        x: canvas.width/2 + (Math.random()-0.5)*36,
        y: canvas.height*0.5 + (Math.random()-0.5)*30,
        r: 4 + Math.random()*9,
        vy: -0.35 - Math.random()*0.6,
        vx: (Math.random()-0.5)*0.35,
        alpha: 0.55 + Math.random()*0.3,
        color: Math.random()>0.5 ? '235,235,235' : '82,224,196'
      });
    }
  }
  function tick(){
    ctx.clearRect(0,0,canvas.width,canvas.height);
    particles.forEach(p=>{
      p.x+=p.vx; p.y+=p.vy; p.r+=0.07; p.alpha-=0.0045;
      ctx.beginPath();
      ctx.fillStyle = 'rgba('+p.color+','+Math.max(p.alpha,0)+')';
      ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
      ctx.fill();
    });
    particles = particles.filter(p=> p.alpha>0 && p.y>-20);
    if(running){
      if(Math.random()<0.25) spawn();
      raf = requestAnimationFrame(tick);
    }
  }
  function start(){ if(running) return; running=true; tick(); }
  function stop(){ running=false; if(raf) cancelAnimationFrame(raf); raf=null; }
  if('IntersectionObserver' in window){
    const io = new IntersectionObserver(entries=>{
      entries.forEach(entry=>{ if(entry.isIntersecting) start(); else stop(); });
    }, {threshold:0.1});
    io.observe(wrap);
  } else {
    start();
  }
})();

render();
