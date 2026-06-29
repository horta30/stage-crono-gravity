// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · config.js
// Configuración central. Único lugar donde viven URLs, keys y
// constantes globales. Cualquier cambio de entorno se hace acá.
// ════════════════════════════════════════════════════════════

const SC_CONFIG = {
  // Supabase
  SUPA_URL: 'https://sgmzacwxfuznolthyjff.supabase.co',
  SUPA_KEY: 'sb_publishable_-wDAA3WMgcrJSGA9B4Gciw_wOuM27pw',

  // URL del hub (para botones "volver al hub")
  HUB_URL: 'https://stage-crono-flow.vercel.app',

  // Política de acceso: si true, exige ?event=... y ?rider=... en index
  REQUIRE_HUB_ENTRY: true,

  // Versión del cliente (útil para debugging y para detectar problemas
  // de cache en Service Worker)
  VERSION: '1.0.0-gravity',
};
