// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · supabase.js
// Cliente Supabase mínimo + lógica de guardado de resultados con
// fallback a localStorage cuando no hay conexión.
//
// REGLA 2 (Capacitor-readiness): la lógica de "guardar resultado"
// es de negocio puro. No depende del runtime. Las llamadas fetch
// funcionan igual en PWA y en Capacitor.
// ════════════════════════════════════════════════════════════

const OFFLINE_KEY = 'crono_pending_results';

const SC_Supabase = {
  // Guardar un resultado. Intenta enviar a Supabase; si falla
  // (sin conexión, error de red), lo persiste localmente para
  // sincronizar después.
  // Retorna true si se envió correctamente, false si quedó
  // pendiente.
  async guardarResultado(payload) {
    const url = `${SC_CONFIG.SUPA_URL}/rest/v1/resultados`;
    const headers = {
      'apikey': SC_CONFIG.SUPA_KEY,
      'Authorization': `Bearer ${SC_CONFIG.SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      if (r.ok) return true;
      this._guardarLocal(payload);
      return false;
    } catch (e) {
      this._guardarLocal(payload);
      return false;
    }
  },

  _guardarLocal(payload) {
    const pending = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    pending.push(payload);
    localStorage.setItem(OFFLINE_KEY, JSON.stringify(pending));
  },

  // Reintenta enviar todos los resultados pendientes. Llamar al
  // arrancar la app y al recuperar conexión.
  async sincronizarPendientes() {
    const pending = JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]');
    if (pending.length === 0) return { enviados: 0, pendientes: 0 };

    const url = `${SC_CONFIG.SUPA_URL}/rest/v1/resultados`;
    const headers = {
      'apikey': SC_CONFIG.SUPA_KEY,
      'Authorization': `Bearer ${SC_CONFIG.SUPA_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'return=minimal',
    };

    const enviados = [];
    for (const payload of pending) {
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers,
          body: JSON.stringify(payload),
        });
        if (r.ok) enviados.push(payload.session_id);
      } catch (e) {}
    }

    if (enviados.length > 0) {
      const restantes = pending.filter(p => !enviados.includes(p.session_id));
      localStorage.setItem(OFFLINE_KEY, JSON.stringify(restantes));
    }

    return { enviados: enviados.length, pendientes: pending.length - enviados.length };
  },

  // Cantidad de resultados pendientes de enviar.
  contarPendientes() {
    return JSON.parse(localStorage.getItem(OFFLINE_KEY) || '[]').length;
  },
};

// Auto-sync al arrancar y al volver la conexión
window.addEventListener('online', () => SC_Supabase.sincronizarPendientes());
setTimeout(() => SC_Supabase.sincronizarPendientes(), 3000);
