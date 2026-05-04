// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · wakelock.js
// Módulo centralizado de Wake Lock. ÚNICO punto donde se llama
// a navigator.wakeLock. El resto de la app usa esta abstracción.
//
// REGLA 1 (Capacitor-readiness): este archivo se reemplazará en
// la versión nativa. En Capacitor el Wake Lock no es necesario
// porque el background geolocation real mantiene el sistema
// activo por su cuenta. Acá lo dejamos como módulo separado para
// que al migrar simplemente desactivemos sus llamadas.
//
// IMPORTANTE: Wake Lock solo mantiene la pantalla ENCENDIDA.
// No bloquea el touch ni evita que el usuario apague la pantalla
// manualmente con el botón lateral. Si la pantalla se apaga, el
// Wake Lock se libera y la PWA pierde confiabilidad. Esta
// limitación no se resuelve con código — solo con Capacitor.
// ════════════════════════════════════════════════════════════

const SC_WakeLock = {
  _lock: null,
  _wanted: false, // ¿queremos que esté activo? (para re-adquirir
                  // después de visibility change)

  // ¿Está disponible la API en este navegador?
  isAvailable() {
    return 'wakeLock' in navigator;
  },

  async request() {
    if (!this.isAvailable()) return false;
    this._wanted = true;
    try {
      this._lock = await navigator.wakeLock.request('screen');
      this._lock.addEventListener('release', () => {
        // Si lo perdemos pero seguimos queriéndolo, intentamos
        // re-adquirir cuando la pestaña vuelva a estar visible.
        this._lock = null;
      });
      return true;
    } catch (e) {
      this._lock = null;
      return false;
    }
  },

  async release() {
    this._wanted = false;
    if (this._lock) {
      try { await this._lock.release(); } catch (e) {}
      this._lock = null;
    }
  },

  isActive() {
    return this._lock !== null;
  },

  // Re-adquisición automática cuando la pestaña vuelve a estar
  // visible (Wake Lock se libera al perder visibilidad).
  _setupAutoReacquire() {
    if (this._setupDone) return;
    this._setupDone = true;
    document.addEventListener('visibilitychange', async () => {
      if (document.visibilityState === 'visible' && this._wanted && !this._lock) {
        await this.request();
      }
    });
  },
};

// Activar auto-reacquire al cargar el módulo
SC_WakeLock._setupAutoReacquire();
