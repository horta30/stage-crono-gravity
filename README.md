# Stage Crono · Gravity

Cronómetro GPS unificado para enduro y descenso. PWA construida en HTML + JavaScript plano + Supabase, alojada en GitHub Pages.

## Visión general

Stage Crono Gravity es el **cronómetro** del ecosistema Stage Crono. La cara pública (catálogo, rankings, perfil) vive en **Stage Crono Hub** (`stagecronohub.com`). Esta PWA recibe al rider desde el hub con los parámetros del evento y el nombre, y le ofrece la experiencia de cronometraje.

```
HUB (Lovable)  ──redirección con ?event=...&rider=...──>  GRAVITY (esta PWA)
```

Por diseño, esta PWA **no es un punto de entrada público**. Si alguien llega a la URL sin parámetros válidos, ve una pantalla que lo redirige al hub.

## Eventos soportados

- **Las Varas** (`?event=las_varas`) — Modalidad enduro, 2 stages (Anfiteatro Norte + Anfiteatro Clásic).
- **Puchuncaví** (`?event=puchuncavi`) — Modalidad descenso, 1 stage (DH La Canela).

Para agregar un evento nuevo:
1. Agregá una entrada al catálogo en `assets/js/events.js`.
2. Creá los archivos de stages en `assets/events/<slug>/seg0N.js`.

## Estructura

```
stage-crono-gravity/
├── index.html              # Pantalla de entrada / catálogo del evento
├── crono.html              # Cronómetro (un único archivo, parametrizado por URL)
├── resultados.html         # Leaderboards (parametrizado por URL)
├── manifest.json
├── sw.js                   # Service Worker
├── assets/
│   ├── js/
│   │   ├── config.js       # Configuración central (Supabase, hub URL, etc.)
│   │   ├── events.js       # Catálogo de eventos
│   │   ├── session.js      # Identidad del piloto (localStorage)
│   │   ├── utils.js        # Helpers puros (fmt, distM, bearingTo)
│   │   ├── gps.js          # Módulo centralizado de GPS  (REGLA 1)
│   │   ├── wakelock.js     # Módulo centralizado de Wake Lock  (REGLA 1)
│   │   ├── audio.js        # Módulo centralizado de Audio  (REGLA 1)
│   │   ├── supabase.js     # Cliente Supabase + offline buffer
│   │   └── crono-app.js    # Lógica principal del cronómetro
│   ├── events/
│   │   ├── las_varas/{seg01.js, seg02.js}
│   │   └── puchuncavi/{seg01.js}
│   ├── logo.png
│   └── ...
├── icons/
└── og-image.png
```

## Las tres reglas (preparación para Capacitor)

Este repo aplica las **tres reglas de Capacitor-readiness** para que la futura migración a app nativa con Capacitor sea de pocos días, no de semanas:

1. **APIs sensibles centralizadas.** Todas las llamadas a `navigator.geolocation`, `navigator.wakeLock` y `speechSynthesis` viven en módulos únicos (`gps.js`, `wakelock.js`, `audio.js`). El día de la migración, solo cambian estos archivos; el resto del código no se toca.

2. **Lógica de negocio limpia.** La lógica de cronometraje (`crono-app.js` — estado `S`, `processPos`, triggers) no llama directamente a APIs del navegador. Todo pasa por las abstracciones. Los helpers matemáticos viven en `utils.js`, sin DOM ni APIs.

3. **Comentarios marcando deuda transitoria.** Cualquier hack o workaround específico de PWA está marcado con `// CAPACITOR FUTURE:` o `// PWA-only:` para que sea trivial encontrarlos al migrar.

## Limitaciones conocidas (PWA)

Esta versión PWA tiene una limitación estructural de los navegadores que no se resuelve con código:

- **El cronómetro requiere pantalla encendida.** Si el rider apaga la pantalla con el botón lateral, el navegador suspende JavaScript y el cronómetro pierde precisión / GPS.
- **Battery Saver agresivo (Xiaomi, Huawei, etc.) puede matar la pestaña** sin importar lo que pida la app.

Para uso confiable con el celular en el bolsillo y la pantalla apagada (escenario real de DH), la solución es la migración a Capacitor, prevista en una iteración futura.

## Configuración

Las URLs y credenciales viven en `assets/js/config.js`:

```javascript
SUPA_URL: 'https://sgmzacwxfuznolthyjff.supabase.co'
SUPA_KEY: 'sb_publishable_...'
HUB_URL: 'https://stagecronohub.com'
```

## Despliegue

GitHub Pages con la rama `main` apuntando al root del repo. No requiere build step.

## Licencia

MTB Project License.
