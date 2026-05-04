// ════════════════════════════════════════════════════════════
// STAGE CRONO GRAVITY · events.js
// Catálogo de eventos disponibles. Cada evento es un objeto con
// metadata y la lista de stages. Los datos GPS de cada stage
// (waypoints + track) viven en archivos separados que se cargan
// dinámicamente desde el cronómetro.
//
// Para agregar un evento nuevo:
//   1. Agregá una entrada acá con su slug y stages.
//   2. Creá los archivos assets/events/<slug>/seg0N.js
//
// CAPACITOR FUTURE: este catálogo eventualmente vivirá en una
// tabla `events` de Supabase. Hoy queda hardcodeado para mantener
// la PWA simple en esta etapa de pruebas.
// ════════════════════════════════════════════════════════════

const SC_EVENTS = {
  las_varas: {
    slug: 'las_varas',
    nombre: 'Stage Crono Las Varas',
    nombreCorto: 'LAS VARAS',
    zona: 'Las Varas · RM',
    descripcion: '2 especiales cronometradas en Las Varas. Compite contra el reloj, acumula los mejores tiempos y entra al ranking general.',
    modalidad: 'enduro', // 'enduro' (suma de stages) | 'descenso' (un solo stage)
    stages: [
      {
        numero: 1,
        nombre: 'Anfiteatro Norte',
        zona: 'Las Varas · RM',
        distancia: 0.79,
        desnivel: 166,
        parciales: 3,
        modalidad: 'DH',
        color: '#00ff41',
      },
      {
        numero: 2,
        nombre: 'Anfiteatro Clásic',
        zona: 'Las Varas · RM',
        distancia: 1.10,
        desnivel: 160,
        parciales: 3,
        modalidad: 'DH',
        color: '#ff6b00',
      },
    ],
  },

  puchuncavi: {
    slug: 'puchuncavi',
    nombre: 'Stage Crono Puchuncaví',
    nombreCorto: 'PUCHUNCAVÍ',
    zona: 'Puchuncaví · V Región',
    descripcion: 'DH puro de 2.57 km y 464 m de desnivel en La Canela, Puchuncaví. Compite contra el reloj y entra al ranking.',
    modalidad: 'descenso',
    stages: [
      {
        numero: 1,
        nombre: 'DH La Canela',
        zona: 'Puchuncaví · V Región',
        distancia: 2.57,
        desnivel: 464,
        parciales: 0,
        modalidad: 'DH',
        color: '#00ff41',
      },
    ],
  },
};

// ── Helpers ─────────────────────────────────────────────────
function getEvent(slug) {
  return SC_EVENTS[slug] || null;
}

function getStage(eventSlug, stageNumber) {
  const ev = getEvent(eventSlug);
  if (!ev) return null;
  return ev.stages.find(s => s.numero === stageNumber) || null;
}

function getEventSlugs() {
  return Object.keys(SC_EVENTS);
}
