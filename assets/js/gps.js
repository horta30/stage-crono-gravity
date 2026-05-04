// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · gps.js
// Módulo centralizado de geolocalización. ÚNICO punto donde se
// llama a navigator.geolocation. El resto de la app usa esta
// abstracción.
//
// REGLA 1 (Capacitor-readiness): este archivo es el único que
// va a cambiar al migrar a Capacitor. La firma pública (start,
// stop, onPosition, etc.) se mantendrá idéntica; lo que cambia
// es la implementación interna, que pasará a usar el plugin
// @capacitor-community/background-geolocation.
//
// CAPACITOR FUTURE: reemplazar el cuerpo de start() por:
//   import { BackgroundGeolocation } from '...';
//   BackgroundGeolocation.addWatcher({ ... }, callback);
// ════════════════════════════════════════════════════════════

const SC_GPS = {
  _watchId: null,
  _onPos: null,
  _onErr: null,
  _active: false,

  // ¿Está disponible la API en este navegador?
  isAvailable() {
    return 'geolocation' in navigator;
  },

  // Activa el seguimiento continuo de posición.
  // - onPos(coords): callback con { lat, lon, accuracy, heading, timestamp }
  // - onErr(error): callback opcional para errores
  start(onPos, onErr) {
    if (!this.isAvailable()) {
      if (onErr) onErr({ code: 'unavailable', message: 'GPS no disponible' });
      return false;
    }
    if (this._active) this.stop();

    this._onPos = onPos;
    this._onErr = onErr;
    this._active = true;

    this._watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!this._active) return;
        const { latitude, longitude, accuracy, heading } = pos.coords;
        this._onPos && this._onPos({
          lat: latitude,
          lon: longitude,
          accuracy,
          heading,
          timestamp: pos.timestamp,
        });
      },
      (err) => {
        if (!this._active) return;
        this._onErr && this._onErr(err);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 }
    );
    return true;
  },

  // Detiene el seguimiento.
  stop() {
    this._active = false;
    if (this._watchId !== null) {
      navigator.geolocation.clearWatch(this._watchId);
      this._watchId = null;
    }
    this._onPos = null;
    this._onErr = null;
  },

  isActive() {
    return this._active;
  },
};
