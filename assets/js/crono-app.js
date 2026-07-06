// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · crono-app.js
// Lógica principal del cronómetro. Usa los módulos centralizados
// SC_GPS, SC_WakeLock, SC_Audio, SC_Supabase y la sesión local.
//
// ESTRUCTURA:
//   1. INIT (datos del stage + UI inicial)
//   2. MAPA (Leaflet)
//   3. NAVEGACIÓN (bearing, brújula, follow mode)
//   4. ESTADO DEL CRONÓMETRO (S)
//   5. PROCESAMIENTO DE POSICIÓN (waypoints, triggers)
//   6. UI (splits, toast, resultados)
//   7. ACCIONES (reset, share, navegación post-stage)
//
// REGLA 2 (Capacitor-readiness): este archivo contiene lógica
// de presentación + lógica de cronometraje. La parte de
// cronometraje (estado S, processPos, triggers) es lógica de
// negocio pura que sobrevive a la migración. La parte de UI
// permanece igual (DOM web sigue siendo DOM en webview).
// ════════════════════════════════════════════════════════════

'use strict';

// ════════════════════════════════════════════════════════════
// 1. INIT — DATOS DEL STAGE
// ════════════════════════════════════════════════════════════

// CT viene del archivo seg0N.js cargado dinámicamente desde el
// HTML (basado en ?event=...&stage=...).
// Si CT no existe, hubo un error de carga — redirigir.
if (typeof CT === 'undefined') {
  alert('Error cargando datos del stage. Volviendo a inicio.');
  window.location.replace('./index.html');
}

const _eventSlug = getEventFromUrl();
const _stageNum = getStageFromUrl();
const _eventCfg = getEvent(_eventSlug);
const _nombre = GravitasSession.getPilot() || '';
const _accentColor = CT.meta.color || '#00ff41';

// Aplicar color de acento del stage
document.documentElement.style.setProperty('--accent', _accentColor);

// Splash UI
document.getElementById('splash-stage-badge').textContent = `STAGE ${CT.meta.stage}`;
document.getElementById('splash-stage-name').textContent = CT.meta.nombre.toUpperCase();
if (_nombre) document.getElementById('splash-name').textContent = _nombre.toUpperCase();
document.getElementById('splash-zone').textContent = CT.meta.zona;
document.getElementById('splash-back').href = `./index.html?event=${_eventSlug}`;
document.getElementById('back-btn').href = `./index.html?event=${_eventSlug}`;
document.getElementById('rs-rider').textContent = _nombre ? _nombre.toUpperCase() : 'PILOTO';

// Stage tag styling
const stageTag = document.getElementById('rs-stage-tag');
stageTag.textContent = `STAGE ${CT.meta.stage} · ${CT.meta.nombre.toUpperCase()}`;
stageTag.style.background = `${_accentColor}18`;
stageTag.style.color = _accentColor;
stageTag.style.border = `1px solid ${_accentColor}40`;

// Separar waypoint de staging (punto 0) del resto (cronometraje)
const stagingWP = CT.waypoints.find(wp => wp.type === 'staging') || null;
const cronoWPs  = CT.waypoints.filter(wp => wp.type !== 'staging');

// Construir barra de splits solo con waypoints de cronometraje
(function buildSplitsBar() {
  const bar = document.getElementById('splits-bar');
  cronoWPs.forEach((wp, i) => {
    const div = document.createElement('div');
    div.className = 'split-col' + (wp.type === 'finish' ? ' finish' : '');
    div.id = `sc-${i}`;
    const shortName = wp.name.split(' ')[0].substring(0, 6);
    div.innerHTML = `<div class="sc-name">${shortName}</div><div class="sc-time">-:--</div>`;
    bar.appendChild(div);
  });
})();

// ════════════════════════════════════════════════════════════
// 2. MAPA (Leaflet)
// ════════════════════════════════════════════════════════════

const TILES = {
  topo: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
  satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  osm: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
};
const lmap = L.map('leaflet-map', {
  center: [cronoWPs[0].lat, cronoWPs[0].lon],
  zoom: 15,
  zoomControl: false,
  attributionControl: false,
  rotate: true,
  touchRotate: true,
  rotateControl: false,
});
let currentTile = L.tileLayer(TILES.topo, { maxZoom: 19 }).addTo(lmap);
L.polyline(CT.track, { color: 'rgba(0,255,65,.1)', weight: 20 }).addTo(lmap);
const routeLine = L.polyline(CT.track, { color: _accentColor, weight: 3.5, opacity: .9 }).addTo(lmap);
const doneLine = L.polyline([CT.track[0]], { color: 'rgba(255,255,255,.35)', weight: 5 }).addTo(lmap);

// Dibujar marcadores de cronometraje (sin staging)
cronoWPs.forEach(wp => {
  const col = wp.color;
  const label = wp.type === 'start' ? 'S' : wp.type === 'finish' ? 'F' : wp.id;
  const icon = L.divIcon({
    className: '',
    html: `<div style="width:26px;height:26px;background:${col};clip-path:polygon(0 0,calc(100% - 7px) 0,100% 7px,100% 100%,7px 100%,0 calc(100% - 7px));display:flex;align-items:center;justify-content:center;box-shadow:0 0 10px ${col}66;"><span style="font-size:10px;font-weight:900;color:#000;">${label}</span></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
  });
  L.marker([wp.lat, wp.lon], { icon, zIndexOffset: 500 }).addTo(lmap);
});

// Dibujar PUNTO 0 (staging) con ícono especial amarillo
if (stagingWP) {
  const icon0 = L.divIcon({
    className: '',
    html: `<div style="width:32px;height:32px;background:#ffd600;border-radius:50%;display:flex;align-items:center;justify-content:center;box-shadow:0 0 12px #ffd60088;border:2px solid #000;"><span style="font-size:14px;">🚵</span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
  L.marker([stagingWP.lat, stagingWP.lon], { icon: icon0, zIndexOffset: 600 })
    .bindPopup('<b>PUNTO 0</b><br>Ubícate aquí y entra en movimiento hacia INICIO')
    .addTo(lmap);
}
lmap.fitBounds(L.latLngBounds(CT.track), { padding: [40, 40] });

window.setStyle = function (btn) {
  document.querySelectorAll('.sbtn').forEach(b => b.classList.remove('on'));
  btn.classList.add('on');
  lmap.removeLayer(currentTile);
  currentTile = L.tileLayer(TILES[btn.dataset.l], { maxZoom: 19 }).addTo(lmap);
  routeLine.bringToFront();
  doneLine.bringToFront();
};

// ════════════════════════════════════════════════════════════
// 3. NAVEGACIÓN — Bearing, brújula, follow mode, Waze mode
// ════════════════════════════════════════════════════════════

let currentBearing = 0;
let wazeMode = true;
let followMode = true;

function updateNorthNeedle(mapBearing) {
  const el = document.getElementById('north-needle');
  if (el) el.style.transform = `rotate(${mapBearing}deg)`;
}

function applyBearing(b) {
  currentBearing = ((b % 360) + 360) % 360;
  if (wazeMode) document.getElementById('leaflet-map').style.transform = `rotate(${-currentBearing}deg)`;
  updateNorthNeedle(currentBearing);
  document.getElementById('compass-needle').style.transform = `rotate(${currentBearing}deg)`;
}

window.resetNorth = function () {
  currentBearing = 0;
  document.getElementById('leaflet-map').style.transform = 'rotate(0deg)';
  document.getElementById('compass-needle').style.transform = 'rotate(0deg)';
};

window.toggleWaze = function () {
  wazeMode = !wazeMode;
  const b = document.getElementById('waze-btn');
  b.classList.toggle('on', wazeMode);
  b.textContent = wazeMode ? '🧭 Waze' : '🗺 Norte';
  if (!wazeMode) document.getElementById('leaflet-map').style.transform = 'rotate(0deg)';
};

window.toggleFollow = function () {
  followMode = !followMode;
  const fb = document.getElementById('follow-btn');
  if (followMode) {
    fb.classList.add('on');
    fb.textContent = '⊙ Siguiendo';
    wazeMode = true;
    document.getElementById('waze-btn').classList.add('on');
    document.getElementById('waze-btn').textContent = '🧭 Waze';
    if (userMarker) {
      lmap.panTo(userMarker.getLatLng());
      applyBearing(lastBearing);
    }
  } else {
    fb.classList.remove('on');
    fb.textContent = '⊙ Seguirme';
  }
};

lmap.on('rotate', (e) => {
  if (e && e.target) updateNorthNeedle(e.target.getBearing ? e.target.getBearing() : 0);
});

lmap.on('dragstart', () => {
  followMode = false;
  wazeMode = false;
  document.getElementById('follow-btn').classList.remove('on');
  document.getElementById('follow-btn').textContent = '⊙ Seguirme';
  document.getElementById('waze-btn').classList.remove('on');
  document.getElementById('waze-btn').textContent = '🗺 Norte';
  document.getElementById('leaflet-map').style.transform = 'rotate(0deg)';
  document.getElementById('compass-needle').style.transform = `rotate(${lastBearing}deg)`;
});

// Rotation lock (se activa al detectar inicio cercano)
let rotationLocked = false;
function lockRotation() {
  rotationLocked = true;
  if (lmap.touchRotate) lmap.touchRotate.disable();
  wazeMode = true;
  followMode = true;
  document.getElementById('waze-btn').classList.add('on');
  document.getElementById('waze-btn').textContent = '🧭 Waze';
  document.getElementById('follow-btn').classList.add('on');
  document.getElementById('follow-btn').textContent = '⊙ Siguiendo';
  document.getElementById('north-compass').style.opacity = '0.3';
  document.getElementById('north-compass').style.pointerEvents = 'none';
}
function unlockRotation() {
  rotationLocked = false;
  if (lmap.touchRotate) lmap.touchRotate.enable();
  wazeMode = false;
  document.getElementById('waze-btn').classList.remove('on');
  document.getElementById('waze-btn').textContent = '🗺 Norte';
  document.getElementById('north-compass').style.opacity = '1';
  document.getElementById('north-compass').style.pointerEvents = 'auto';
  resetNorth();
}

// Marker del usuario en el mapa
let userMarker = null;
function makeUserIcon() {
  return L.divIcon({
    className: '',
    html: `<div style="position:relative;width:18px;height:18px;display:flex;align-items:center;justify-content:center;"><div style="position:absolute;width:42px;height:42px;border-radius:50%;background:rgba(0,255,65,.06);border:1px solid rgba(0,255,65,.2);animation:uPulse 2s infinite;"></div><div style="width:14px;height:14px;border-radius:50%;background:#00ff41;border:2.5px solid #080808;box-shadow:0 0 10px rgba(0,255,65,.9);z-index:2;"></div></div>`,
    iconSize: [18, 18],
    iconAnchor: [9, 9],
  });
}

// ════════════════════════════════════════════════════════════
// 4. ESTADO DEL CRONÓMETRO
// ════════════════════════════════════════════════════════════

const SEQ = cronoWPs.map((_, i) => i); // [0, 1, 2, ..., n] sobre cronoWPs
const S = {
  phase: 'init', // 'init' | 'locked' | 'waiting' | 'running' | 'finished'
  stagingDone: false, // true una vez que el rider pasó por el PUNTO 0
  seqIdx: 0,
  startTime: null,
  splits: [],
  timerInterval: null,
  toastTimeout: null,
  alertDone: false,
  triggered: false,
  history: [],
};

const SESSION_ID = crypto.randomUUID();
let gpsTrack = [];
let gpsInicio = null;
let gpsFin = null;
let lastBearing = 0;
let firstFix = true;

// ════════════════════════════════════════════════════════════
// 5. CONTROL DE GPS / AUDIO / WAKE LOCK
// (delegan en los módulos centralizados)
// ════════════════════════════════════════════════════════════

window.initGPS = function () {
  if (!SC_GPS.isAvailable()) {
    alert('GPS no disponible en este navegador.');
    return;
  }

  // Tap del usuario: aprovechamos para activar audio y wake lock
  // (ambos requieren gesto del usuario para inicializarse).
  SC_Audio.unlock();
  SC_WakeLock.request();

  const btn = document.getElementById('splash-btn');
  btn.textContent = 'Conectando...';
  btn.disabled = true;
  document.getElementById('gps-dot').className = 'gps-dot searching';

  SC_GPS.start(onPos, onPosErr);
};

window.toggleGPS = function () {
  if (!SC_GPS.isActive()) {
    document.getElementById('gps-dot').className = 'gps-dot searching';
    SC_GPS.start(onPos, onPosErr);
  } else {
    SC_GPS.stop();
    document.getElementById('gps-dot').className = 'gps-dot';
    document.getElementById('gps-btn').classList.remove('active');
    document.getElementById('gps-label').textContent = 'GPS';
  }
};

window.toggleAudio = function () {
  const enabled = SC_Audio.toggle();
  const b = document.getElementById('audio-btn');
  b.textContent = enabled ? '🔊 Audio' : '🔇 Mudo';
  b.classList.toggle('on', enabled);
  if (enabled) SC_Audio.speak('Audio activado', true);
};

// ════════════════════════════════════════════════════════════
// 6. CALLBACKS DE GPS
// ════════════════════════════════════════════════════════════

function onPos(c) {
  const { lat, lon, accuracy: acc, heading: hdg } = c;

  document.getElementById('gps-dot').className = 'gps-dot on';
  document.getElementById('gps-btn').classList.add('active');
  document.getElementById('gps-label').textContent = `±${Math.round(acc)}m`;

  if (firstFix) {
    firstFix = false;
    document.getElementById('splash').classList.add('hidden');
    lmap.setView([lat, lon], 16);
    if (stagingWP) {
      S.phase = 'locked';
      document.getElementById('chrono-label').textContent = 'Dirígete al PUNTO 0 🚵';
      const msg = _nombre
        ? `Atención ${_nombre}. Primero dirígete al Punto cero marcado en el mapa. El cronómetro se armará desde ahí.`
        : 'Atención. Primero dirígete al Punto cero marcado en el mapa. El cronómetro se armará desde ahí.';
      setTimeout(() => SC_Audio.speak(msg, true), 700);
    } else {
      S.phase = 'waiting';
      document.getElementById('chrono-label').textContent = 'Dirígete al INICIO';
      const msg = _nombre
        ? `Atención ${_nombre}. Cronómetro activa al pasar el inicio. Pasa en movimiento.`
        : 'Atención. Cronómetro activa al pasar el inicio. Pasa en movimiento.';
      setTimeout(() => SC_Audio.speak(msg, true), 700);
    }
  }

  if (!userMarker) {
    userMarker = L.marker([lat, lon], { icon: makeUserIcon(), zIndexOffset: 1000 }).addTo(lmap);
  } else {
    userMarker.setLatLng([lat, lon]);
  }

  if (hdg !== null && hdg !== undefined && !isNaN(hdg)) lastBearing = hdg;
  if (wazeMode) applyBearing(lastBearing);
  else document.getElementById('compass-needle').style.transform = `rotate(${lastBearing}deg)`;
  if (followMode) lmap.panTo([lat, lon], { animate: true, duration: .25, easeLinearity: 1 });

  // Brújula: locked → apunta PUNTO 0; waiting → apunta INICIO
  if (S.phase === 'locked' || S.phase === 'waiting' || S.phase === 'init') {
    const compass = document.getElementById('inicio-compass');
    compass.classList.add('show');
    const target = (S.phase === 'locked' && stagingWP)
      ? stagingWP
      : (stagingWP && distM(lat, lon, stagingWP.lat, stagingWP.lon) > stagingWP.radio && S.phase === 'waiting')
        ? stagingWP : cronoWPs[0];
    const b = bearingTo(lat, lon, target.lat, target.lon);
    const rel = ((b - lastBearing) + 360) % 360;
    document.getElementById('ic-arrow').style.transform = `rotate(${rel}deg)`;
  } else {
    document.getElementById('inicio-compass').classList.remove('show');
  }

  // Sample del track GPS (cada 5 segundos durante running)
  if (S.phase === 'running') {
    const now = Date.now();
    if (!gpsTrack._last || now - gpsTrack._last > 5000) {
      gpsTrack.push({ lat, lon, t: now });
      gpsTrack._last = now;
    }
  }

  // Highlight del recorrido completado
  let minD = Infinity, minI = 0;
  CT.track.forEach(([la, lo], i) => {
    const d = Math.hypot(lat - la, lon - lo);
    if (d < minD) { minD = d; minI = i; }
  });
  if (minI > 1) doneLine.setLatLngs(CT.track.slice(0, minI + 1));

  if (S.phase === 'locked' || S.phase === 'waiting' || S.phase === 'running') processPos(lat, lon);
}

function onPosErr() {
  document.getElementById('gps-dot').className = 'gps-dot';
  document.getElementById('gps-label').textContent = 'Sin señal';
}

// ════════════════════════════════════════════════════════════
// 7. PROCESAMIENTO DE POSICIÓN — detecta cruces de waypoints
// ════════════════════════════════════════════════════════════

function processPos(lat, lon) {
  if (S.phase === 'finished') return;

  // Fase LOCKED: esperando que el rider toque el PUNTO 0 antes de armar el crono
  if (S.phase === 'locked' && stagingWP) {
    const d = distM(lat, lon, stagingWP.lat, stagingWP.lon);
    if (d <= stagingWP.radio && !S.stagingDone) {
      S.stagingDone = true;
      S.phase = 'waiting';
      document.getElementById('chrono-label').textContent = 'Dirígete al INICIO';
      const msg = _nombre
        ? `¡Listo ${_nombre}! Cronómetro armado. Ahora pasa el inicio en movimiento.`
        : '¡Listo! Cronómetro armado. Ahora pasa el inicio en movimiento.';
      SC_Audio.speak(msg, true);
      showToast('🚵', 'PUNTO 0', '✓', 'Cronómetro armado — ve al INICIO', 'normal');
    }
    return;
  }

  // Fase WAITING: esperando que el rider cruce el INICIO
  if (S.phase === 'waiting') {
    const wp0 = cronoWPs[0];
    const d = distM(lat, lon, wp0.lat, wp0.lon);
    if (d <= 300) {
      document.getElementById('prox-ring').style.display = 'block';
      document.getElementById('prox-dist').textContent = Math.round(d);
      document.getElementById('prox-dist').className = d < wp0.radio ? 'close' : '';
    } else {
      document.getElementById('prox-ring').style.display = 'none';
    }
    if (d <= CT.meta.radioAlerta && d > wp0.radio && !S.alertDone) {
      S.alertDone = true;
      SC_Audio.speak('Inicio en 100 metros. Prepárate.', true);
      showToast('⚡', 'INICIO EN 100m', '', 'Mantén velocidad', 'normal');
      lockRotation();
    }
    if (d <= wp0.radio && !S.triggered) {
      S.triggered = true;
      triggerStart();
    }
    return;
  }

  // Fase RUNNING: rider corriendo entre waypoints
  if (S.phase === 'running') {
    if (S.seqIdx >= SEQ.length) return;
    const wp = cronoWPs[SEQ[S.seqIdx]];
    const d = distM(lat, lon, wp.lat, wp.lon);
    const r = wp.radio || CT.meta.radio;
    document.getElementById('prox-ring').style.display = 'block';
    document.getElementById('prox-dist').textContent = Math.round(d);
    document.getElementById('prox-dist').className = d < r ? 'close' : '';
    if (d <= r && !S.triggered) {
      S.triggered = true;
      const isLast = (S.seqIdx === SEQ.length - 1);
      if (isLast) triggerFinish(); else triggerSplit();
    }
  }
}

// ════════════════════════════════════════════════════════════
// 8. TRIGGERS — eventos del cronómetro
// ════════════════════════════════════════════════════════════

function triggerStart() {
  S.startTime = Date.now();
  S.phase = 'running';
  S.seqIdx = 1;
  S.triggered = false;
  gpsInicio = Date.now();
  gpsTrack = [];
  document.getElementById('chrono').className = 'running';
  document.getElementById('chrono-label').textContent = '↑ EN CARRERA';
  markSplitDone(0, '00:00.0');
  markSplitNext(1);
  S.timerInterval = setInterval(() => {
    if (S.phase === 'running') {
      document.getElementById('chrono').textContent = fmt(Date.now() - S.startTime);
    }
  }, 100);
  document.getElementById('reset-btn').style.display = 'block';
  const nextWP = cronoWPs[SEQ[1]];
  showToast('🟢', 'INICIO', '00:00.0', 'Cronómetro iniciado', 'normal');
  SC_Audio.speak(_nombre
    ? `${_nombre}, cronómetro iniciado. Primer parcial en ${nextWP.name}.`
    : `Cronómetro iniciado. Primer parcial en ${nextWP.name}.`, true);
}

function triggerSplit() {
  const elapsed = Date.now() - S.startTime;
  const prevE = S.splits.length > 0 ? S.splits[S.splits.length - 1].elapsed : 0;
  const lap = elapsed - prevE;
  const wpIdx = SEQ[S.seqIdx];
  const splitNum = S.splits.length + 1;
  S.splits.push({ wpIdx, elapsed, lap });
  markSplitDone(S.seqIdx, fmtS(lap));
  S.seqIdx++;
  S.triggered = false;
  markSplitNext(S.seqIdx);
  const wp = cronoWPs[wpIdx];
  const vozExtra = wp.voz ? ` ${wp.voz}` : '';
  showToast('⏱', `PARCIAL ${splitNum} — ${wp.name}`, fmtS(lap), `Acum: ${fmtS(elapsed)}`, 'normal');
  SC_Audio.speak(`Llevas ${fmtVoz(elapsed)}.${vozExtra} Segmento ${fmtVoz(lap)}.`, true);
}

function triggerFinish() {
  const elapsed = Date.now() - S.startTime;
  const prevE = S.splits.length > 0 ? S.splits[S.splits.length - 1].elapsed : 0;
  const lap = elapsed - prevE;
  const wpIdx = SEQ[S.seqIdx];
  gpsFin = Date.now();
  S.splits.push({ wpIdx, elapsed, lap });
  S.phase = 'finished';
  clearInterval(S.timerInterval);
  document.getElementById('reset-btn').style.display = 'none';
  S.history.push({
    totalMs: elapsed,
    splits: [...S.splits],
    date: new Date().toLocaleString('es-CL', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }),
  });
  document.getElementById('chrono').textContent = fmt(elapsed);
  document.getElementById('chrono').className = 'finished';
  document.getElementById('chrono-label').textContent = 'TIEMPO FINAL';
  markSplitDone(SEQ.length - 1, fmtS(elapsed));
  document.getElementById('prox-ring').style.display = 'none';
  document.getElementById('leaflet-map').style.transform = 'rotate(0deg)';
  showToast('🏆', 'LLEGADA', fmt(elapsed), 'Recorrido completado!', 'finish');
  SC_Audio.speak(_nombre
    ? `Bien hecho ${_nombre}! Tiempo final: ${fmtVoz(elapsed)}. Recorrido completado.`
    : `Tiempo final: ${fmtVoz(elapsed)}. Recorrido completado.`, true);

  // Persistencia local
  GravitasSession.saveTime(_eventSlug, CT.meta.stage, elapsed, S.splits);

  // Persistencia remota (Supabase, con fallback offline)
  const payload = {
    session_id: SESSION_ID,
    evento: _eventSlug,
    nombre: _nombre || 'Anónimo',
    pin: GravitasSession.pin(_nombre || ''),
    stage: CT.meta.stage,
    tiempo_ms: elapsed,
    splits: S.splits.map(s => ({
      wpIdx: s.wpIdx,
      elapsed: s.elapsed,
      lap: s.lap,
      name: cronoWPs[s.wpIdx]?.name || '',
    })),
    track: gpsTrack.slice(),
    gps_inicio: gpsInicio || Date.now(),
    gps_fin: gpsFin || Date.now(),
    valido: true,
  };
  SC_Supabase.guardarResultado(payload).then(ok => {
    setTimeout(() => showToast(
      ok ? '✅' : '⚠️',
      ok ? 'GUARDADO' : 'SIN CONEXIÓN',
      '',
      ok ? 'Tiempo guardado' : 'Guardado local',
      'normal'
    ), 4000);
  });

  setTimeout(() => showResult(elapsed), 3500);
}

// ════════════════════════════════════════════════════════════
// 9. UI — splits bar, toasts, pantalla de resultados
// ════════════════════════════════════════════════════════════

function markSplitDone(pos, t) {
  const el = document.getElementById(`sc-${pos}`);
  if (!el) return;
  el.classList.remove('next');
  el.classList.add('done');
  el.querySelector('.sc-time').textContent = t;
}

function markSplitNext(pos) {
  const el = document.getElementById(`sc-${pos}`);
  if (!el) return;
  el.classList.add('next');
}

function showToast(icon, wp, time, sub, type) {
  if (S.toastTimeout) clearTimeout(S.toastTimeout);
  document.getElementById('toast-icon').textContent = icon;
  document.getElementById('toast-wp').textContent = wp;
  document.getElementById('toast-time').textContent = time;
  document.getElementById('toast-sub').textContent = sub;
  const inner = document.getElementById('toast-inner');
  inner.className = type === 'finish' ? 'toast-inner finish' : 'toast-inner';
  document.getElementById('toast-time').style.color = type === 'finish' ? 'var(--yellow)' : 'var(--green)';
  document.getElementById('toast').classList.add('show');
  S.toastTimeout = setTimeout(() => document.getElementById('toast').classList.remove('show'), 3500);
}

function showResult(totalMs) {
  document.getElementById('rs-time').textContent = fmt(totalMs);
  document.getElementById('rs-date').textContent = new Date().toLocaleString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }).toUpperCase();

  // Tabla de splits
  const cont = document.getElementById('rs-splits');
  cont.innerHTML = '';
  const startWP = cronoWPs[0];
  const r0 = document.createElement('div');
  r0.className = 'rs-row';
  r0.innerHTML = `<div class="rs-idx" style="color:var(--green)">S</div><div class="rs-info"><div class="rs-wp-name" style="color:var(--green)">${startWP.name}</div><div class="rs-type">Punto de salida</div></div><div class="rs-times"><div class="rs-lap" style="color:var(--green)">00:00.0</div><div class="rs-accum">acum: 00:00.0</div></div>`;
  cont.appendChild(r0);
  S.splits.forEach((s, i) => {
    const wp = cronoWPs[s.wpIdx];
    const isLast = i === S.splits.length - 1;
    const row = document.createElement('div');
    row.className = 'rs-row';
    row.innerHTML = `<div class="rs-idx" style="color:${isLast ? 'var(--yellow)' : 'var(--orange)'}">${isLast ? 'F' : i + 1}</div><div class="rs-info"><div class="rs-wp-name" style="color:${isLast ? 'var(--yellow)' : 'var(--white)'}">${wp.name}</div><div class="rs-type">${isLast ? 'Llegada' : 'Parcial ' + (i + 1)}</div></div><div class="rs-times"><div class="rs-lap" style="color:${isLast ? 'var(--yellow)' : 'var(--green)'}">${fmtS(s.lap)}</div><div class="rs-accum">acum: ${fmtS(s.elapsed)}</div></div>`;
    cont.appendChild(row);
  });

  // Historia de la sesión actual
  const histCont = document.getElementById('rs-history');
  histCont.innerHTML = '';
  if (S.history.length > 1) {
    const sec = document.createElement('div');
    sec.className = 'rs-hist-section';
    sec.innerHTML = `<div class="rs-hist-title">STAGE ${CT.meta.stage} · ${CT.meta.nombre} — ${S.history.length} intentos</div>`;
    S.history.forEach((r, i) => {
      const isBest = r.totalMs === Math.min(...S.history.map(h => h.totalMs));
      const row = document.createElement('div');
      row.className = 'rs-hist-row';
      row.innerHTML = `<span class="rs-hist-num">#${i + 1}</span><span class="rs-hist-time">${fmt(r.totalMs)}</span>${isBest ? '<span class="rs-hist-badge">MEJOR</span>' : ''}<span class="rs-hist-date">${r.date}</span>`;
      sec.appendChild(row);
    });
    histCont.appendChild(sec);
  }

  // Bloque de "campeonato" (suma de stages) si aplica
  const campBlock = document.getElementById('rs-camp-block');
  campBlock.innerHTML = '';
  if (_eventCfg && _eventCfg.modalidad === 'enduro' && _eventCfg.stages.length > 1) {
    const total = GravitasSession.getEventTotal(_eventSlug);
    if (total) {
      const partials = _eventCfg.stages.map(stg => {
        const t = GravitasSession.getTime(_eventSlug, stg.numero);
        return t ? `S${stg.numero} ${fmt(t.ms)}` : '';
      }).filter(Boolean).join(' + ');
      campBlock.innerHTML = `<div class="rs-camp-card"><div class="rs-camp-title">🏆 RANKING COMPLETO</div><div class="rs-camp-time">${fmt(total)}</div><div class="rs-camp-sub" style="margin-top:4px">${partials}</div></div>`;
    }
  }

  // Botones de navegación post-stage
  buildPostStageActions();

  document.getElementById('result-screen').classList.add('show');
}

function buildPostStageActions() {
  const actionsBlock = document.getElementById('rs-actions-block');

  // ── Lógica genérica: ¿hay otros stages en este evento? ──
  let nextLabel = '🏆 IR AL RANKING';
  let nextAction = `goLeaderboard()`;
  let nextColor = 'var(--yellow)';

  if (_eventCfg && _eventCfg.stages.length > 1) {
    // Buscar el próximo stage que aún no esté completado
    const pendiente = _eventCfg.stages.find(stg => {
      if (stg.numero === CT.meta.stage) return false; // ya lo corrimos
      return !GravitasSession.getTime(_eventSlug, stg.numero);
    });
    if (pendiente) {
      nextLabel = `➡️ STAGE ${pendiente.numero}`;
      nextAction = `goStage(${pendiente.numero})`;
      nextColor = 'var(--orange)';
    }
  }

  actionsBlock.innerHTML = `
    <button class="rs-share" onclick="shareResult()">📤 COMPARTIR POR WHATSAPP</button>
    <div class="rs-actions">
      <button class="rs-btn rs-btn-retry" onclick="resetSession()">🔁 REINTENTAR</button>
      <button class="rs-btn rs-btn-next" style="background:${nextColor}; color:#000;" onclick="${nextAction}">
        ${nextLabel}
      </button>
    </div>
    <div class="rs-nav-row">
      <button class="rs-nav-btn" onclick="goLeaderboard()">🏆 Ranking</button>
      <button class="rs-nav-btn" onclick="goHome()">🏠 Stages</button>
    </div>`;
}

// ════════════════════════════════════════════════════════════
// 10. NAVEGACIÓN POST-STAGE
// ════════════════════════════════════════════════════════════

window.goStage = function (n) {
  window.location.href = `./crono.html?event=${_eventSlug}&stage=${n}`;
};
window.goHome = function () {
  window.location.href = `./index.html?event=${_eventSlug}`;
};
window.goLeaderboard = function () {
  window.location.href = `./resultados.html?event=${_eventSlug}`;
};

// ════════════════════════════════════════════════════════════
// 11. RESET / CANCEL
// ════════════════════════════════════════════════════════════

window.resetSession = function () {
  unlockRotation();
  clearInterval(S.timerInterval);
  const hist = S.history;
  const resetPhase = stagingWP ? 'locked' : 'waiting';
  Object.assign(S, {
    phase: resetPhase,
    stagingDone: false,
    seqIdx: 0,
    startTime: null,
    splits: [],
    timerInterval: null,
    toastTimeout: null,
    alertDone: false,
    triggered: false,
  });
  S.history = hist;
  document.getElementById('chrono').textContent = '00:00.0';
  document.getElementById('chrono').className = 'waiting';
  document.getElementById('chrono-label').textContent = stagingWP ? 'Dirígete al PUNTO 0 🚵' : 'Dirígete al INICIO';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('result-screen').classList.remove('show');
  document.getElementById('toast').classList.remove('show');
  document.querySelectorAll('.split-col').forEach(el => {
    el.classList.remove('done', 'next');
    el.querySelector('.sc-time').textContent = '-:--';
  });
};

window.cancelRun = function () {
  unlockRotation();
  clearInterval(S.timerInterval);
  const hist = S.history;
  const resetPhase = stagingWP ? 'locked' : 'waiting';
  Object.assign(S, {
    phase: resetPhase,
    stagingDone: false,
    seqIdx: 0,
    startTime: null,
    splits: [],
    timerInterval: null,
    toastTimeout: null,
    alertDone: false,
    triggered: false,
  });
  S.history = hist;
  document.getElementById('chrono').textContent = '00:00.0';
  document.getElementById('chrono').className = 'waiting';
  document.getElementById('chrono-label').textContent = stagingWP ? 'Dirígete al PUNTO 0 🚵' : 'Dirígete al INICIO';
  document.getElementById('reset-btn').style.display = 'none';
  document.getElementById('toast').classList.remove('show');
  document.querySelectorAll('.split-col').forEach(el => {
    el.classList.remove('done', 'next');
    el.querySelector('.sc-time').textContent = '-:--';
  });
  showToast('↩', 'ANULADO', '', 'Listo para nueva pasada', 'normal');
  SC_Audio.speak('Reiniciado. Listo para comenzar.', true);
};

// ════════════════════════════════════════════════════════════
// 12. SHARE — mensaje de WhatsApp con el resultado
// ════════════════════════════════════════════════════════════

window.shareResult = function () {
  if (S.splits.length === 0) return;
  const total = S.splits[S.splits.length - 1].elapsed;
  const fecha = new Date().toLocaleString('es-CL', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' });
  const eventoNombreCorto = (_eventCfg ? _eventCfg.nombreCorto : _eventSlug).toUpperCase();
  let txt = `🏁 *STAGE CRONO ${eventoNombreCorto} · Stage ${CT.meta.stage} — ${CT.meta.nombre.toUpperCase()}*\n`;
  if (_nombre) txt += `👤 *${_nombre}*\n`;
  txt += `⏱ *Tiempo total: ${fmt(total)}*\n📅 ${fecha}\n\n`;
  S.splits.forEach((s, i) => {
    const wp = cronoWPs[s.wpIdx];
    const isLast = i === S.splits.length - 1;
    txt += `${isLast ? '🏆' : '📍'} ${wp.name}: *${fmtS(s.lap)}* (acum ${fmtS(s.elapsed)})\n`;
  });

  // Bloque de campeonato si todos los stages del evento están hechos
  if (_eventCfg && _eventCfg.modalidad === 'enduro' && _eventCfg.stages.length > 1) {
    const totalCamp = GravitasSession.getEventTotal(_eventSlug);
    if (totalCamp) {
      const partials = _eventCfg.stages.map(stg => {
        const t = GravitasSession.getTime(_eventSlug, stg.numero);
        return t ? `S${stg.numero}: ${fmt(t.ms)}` : '';
      }).filter(Boolean).join(' · ');
      txt += `\n🏆 *Ranking: ${fmt(totalCamp)}*\n${partials}\n`;
    }
  }

  txt += `\n_Stage Crono · Gravitas Solutions_`;
  if (navigator.share) navigator.share({ title: `Stage Crono S${CT.meta.stage}`, text: txt }).catch(() => {});
  else navigator.clipboard.writeText(txt).then(() => alert('Copiado al portapapeles'));
};

// ════════════════════════════════════════════════════════════
// 13. SPLASH CANVAS — animación decorativa de fondo del splash
// ════════════════════════════════════════════════════════════

(function () {
  const c = document.getElementById('splash-canvas');
  function resize() { c.width = window.innerWidth; c.height = window.innerHeight; }
  resize();
  window.addEventListener('resize', resize);
  const lats = CT.track.map(p => p[0]);
  const lons = CT.track.map(p => p[1]);
  const mnLat = Math.min(...lats), mxLat = Math.max(...lats);
  const mnLon = Math.min(...lons), mxLon = Math.max(...lons);
  const pad = 0.12;
  function tx(lon) { return pad * c.width + (lon - mnLon) / (mxLon - mnLon) * c.width * (1 - pad * 2); }
  function ty(lat) { return pad * c.height + (1 - (lat - mnLat) / (mxLat - mnLat)) * c.height * (1 - pad * 2); }
  let prog = 0;
  function draw() {
    if (document.getElementById('splash').classList.contains('hidden')) return;
    const W = c.width, H = c.height, ctx = c.getContext('2d');
    ctx.clearRect(0, 0, W, H);
    for (let i = 0; i < 10; i++) {
      ctx.beginPath();
      ctx.moveTo(0, H * .05 + i * H * .1);
      ctx.lineTo(W, H * .05 + i * H * .1);
      ctx.strokeStyle = `rgba(0,255,65,.018)`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.beginPath();
    CT.track.forEach(([la, lo], i) => { const x = tx(lo), y = ty(la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = 'rgba(0,255,65,.07)';
    ctx.lineWidth = 14;
    ctx.filter = 'blur(8px)';
    ctx.stroke();
    ctx.filter = 'none';
    ctx.beginPath();
    CT.track.forEach(([la, lo], i) => { const x = tx(lo), y = ty(la); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    ctx.strokeStyle = _accentColor;
    ctx.lineWidth = 1.5;
    ctx.globalAlpha = .45;
    ctx.stroke();
    ctx.globalAlpha = 1;
    cronoWPs.forEach(wp => {
      ctx.beginPath();
      ctx.arc(tx(wp.lon), ty(wp.lat), 3.5, 0, Math.PI * 2);
      ctx.fillStyle = wp.type === 'start' ? 'rgba(0,255,65,.8)' : wp.type === 'finish' ? 'rgba(255,214,0,.7)' : 'rgba(255,107,0,.6)';
      ctx.fill();
    });
    prog = (prog + .004) % 1;
    const [la, lo] = CT.track[Math.floor(prog * CT.track.length)];
    const px = tx(lo), py = ty(la);
    ctx.beginPath();
    ctx.arc(px, py, 8, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(0,255,65,.1)';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(px, py, 3, 0, Math.PI * 2);
    ctx.fillStyle = _accentColor;
    ctx.fill();
    requestAnimationFrame(draw);
  }
  draw();
})();
