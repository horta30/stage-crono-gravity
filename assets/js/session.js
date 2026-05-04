// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · session.js
// Sesión persistente del piloto y tiempos acumulados por evento.
//
// CAMBIO RESPECTO A LA VERSIÓN ANTERIOR:
// La identidad del rider ahora se recibe desde la URL (?rider=)
// inyectada por el hub. La sesión local actúa como cache para
// continuidad durante la corrida, pero la fuente de verdad es el
// parámetro de URL en cada entrada nueva al sistema.
//
// CAPACITOR FUTURE: cuando migremos a Capacitor, la identidad
// vendrá de una sesión nativa compartida con el hub. Hoy queda
// como localStorage por simplicidad.
// ════════════════════════════════════════════════════════════

const GravitasSession = {
  // Una key por evento para que los tiempos no se pisen entre
  // eventos distintos del mismo rider.
  keyFor(eventSlug) {
    return `stageCrono_session_${eventSlug || 'default'}`;
  },

  // ── Identidad del piloto ──────────────────────────────────
  // El piloto se guarda globalmente (no por evento) porque es la
  // misma persona corriendo varios eventos.
  PILOT_KEY: 'stageCrono_pilot',

  setPilot(name) {
    if (!name) return;
    localStorage.setItem(this.PILOT_KEY, name.trim());
  },

  getPilot() {
    return localStorage.getItem(this.PILOT_KEY) || null;
  },

  clearPilot() {
    localStorage.removeItem(this.PILOT_KEY);
  },

  // ── Tiempos por evento + stage ────────────────────────────
  _read(eventSlug) {
    try {
      return JSON.parse(localStorage.getItem(this.keyFor(eventSlug))) || { times: {} };
    } catch {
      return { times: {} };
    }
  },

  _write(eventSlug, data) {
    localStorage.setItem(this.keyFor(eventSlug), JSON.stringify(data));
  },

  saveTime(eventSlug, stageNumber, ms, splits) {
    const s = this._read(eventSlug);
    const key = `s${stageNumber}`;
    if (!s.times[key] || ms < s.times[key].ms) {
      s.times[key] = { ms, splits, date: new Date().toISOString() };
      this._write(eventSlug, s);
    }
  },

  getTime(eventSlug, stageNumber) {
    const s = this._read(eventSlug);
    return s.times?.[`s${stageNumber}`] || null;
  },

  getTimes(eventSlug) {
    return this._read(eventSlug).times || {};
  },

  // Suma de mejores tiempos de todos los stages de un evento.
  // Solo retorna número si están TODOS los stages completados.
  getEventTotal(eventSlug) {
    const ev = (typeof SC_EVENTS !== 'undefined') ? SC_EVENTS[eventSlug] : null;
    if (!ev) return null;
    const t = this.getTimes(eventSlug);
    let total = 0;
    for (const stage of ev.stages) {
      const st = t[`s${stage.numero}`];
      if (!st) return null;
      total += st.ms;
    }
    return total;
  },

  // PIN derivado del nombre — útil para identificar al rider en
  // resultados sin requerir auth real.
  pin(nombre) {
    return String([...(nombre || '').toLowerCase()]
      .reduce((h, c) => (Math.imul(31, h) + c.charCodeAt(0)) | 0, 0) >>> 0)
      .slice(-4).padStart(4, '0');
  },

  clearEvent(eventSlug) {
    localStorage.removeItem(this.keyFor(eventSlug));
  },
};
