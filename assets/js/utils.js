// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · utils.js
// Helpers puros (sin DOM, sin APIs del navegador). Son funciones
// matemáticas y de formato. Reutilizables entre páginas y
// totalmente reaprovechables al migrar a Capacitor.
//
// REGLA 2 (Capacitor-readiness): este archivo es lógica de
// negocio limpia. No depende del runtime. Sobrevive intacto a
// cualquier migración.
// ════════════════════════════════════════════════════════════

// ── Distancia en metros entre dos coordenadas (Haversine) ──
function distM(la1, lo1, la2, lo2) {
  const R = 6371000;
  const dLa = (la2 - la1) * Math.PI / 180;
  const dLo = (lo2 - lo1) * Math.PI / 180;
  const a = Math.sin(dLa / 2) ** 2 +
            Math.cos(la1 * Math.PI / 180) *
            Math.cos(la2 * Math.PI / 180) *
            Math.sin(dLo / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Bearing (rumbo) en grados entre dos coordenadas ──
function bearingTo(lat1, lon1, lat2, lon2) {
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const y = Math.sin(dLon) * Math.cos(lat2 * Math.PI / 180);
  const x = Math.cos(lat1 * Math.PI / 180) * Math.sin(lat2 * Math.PI / 180) -
            Math.sin(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180 / Math.PI) + 360) % 360;
}

// ── Formato de tiempo MM:SS.d (con padding fijo) ──
function fmt(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  const t = Math.floor((ms % 1000) / 100);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}.${t}`;
}

// ── Formato corto M:SS.d (sin padding del minuto) ──
function fmtS(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  const t = Math.floor((ms % 1000) / 100);
  return `${m}:${String(ss).padStart(2, '0')}.${t}`;
}

// ── Formato de tiempo en lenguaje natural (para TTS) ──
function fmtVoz(ms) {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const ss = s % 60;
  if (m > 0 && ss > 0) return `${m} minuto${m > 1 ? 's' : ''} con ${ss} segundo${ss !== 1 ? 's' : ''}`;
  if (m > 0) return `${m} minuto${m > 1 ? 's' : ''}`;
  return `${ss} segundo${ss !== 1 ? 's' : ''}`;
}

// ── Helpers de URL ─────────────────────────────────────────
function getUrlParam(name) {
  return new URLSearchParams(location.search).get(name);
}

function getEventFromUrl() {
  return getUrlParam('event');
}

function getStageFromUrl() {
  const n = parseInt(getUrlParam('stage'));
  return isNaN(n) ? 1 : n;
}

function getRiderFromUrl() {
  const r = getUrlParam('rider');
  return r ? r.trim() : null;
}
