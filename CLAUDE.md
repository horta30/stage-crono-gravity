# Stage Crono — Contexto del proyecto para Claude Code

> Fuente única de verdad para que cualquier instancia de Claude Code (terminal, VS Code, JetBrains) tome control del ecosistema Stage Crono sin contexto previo. Leerlo entero antes de tocar código.
>
> **Última actualización**: 28 Jun 2026

---

## 1. Visión y posicionamiento

Stage Crono es una plataforma de cronometraje GPS para deportes outdoor masivos. Sport-agnostic por diseño: hoy MTB enduro y DH, mañana trail running, motociclismo, regularidad, orientación.

**Visión de plataforma**: capa de software para experiencias outdoor que combina (1) cronometraje GPS sin hardware, (2) levantamiento de datos territoriales, (3) orientación al usuario, (4) monitoreo de seguridad en tiempo real, (5) panel para organizador.

**Categoría de mercado**: "Outdoor Tech Stack". Capa entre Strava (comunidad), AllTrails (exploración) y Komoot (planificación). Cubre el momento de evento masivo, donde los anteriores no juegan.

**Operador**: Pablo Horta — fundador de Gravitas Solutions (Dos Ruedas SpA). Builder-operator, no founder digital puro. Comunicación en español chileno coloquial.

---

## 2. Arquitectura actual (estado vigente al 28 Jun 2026)

El ecosistema se compone de **2 piezas vivas** + **motores legacy deprecados**. **Lovable fue removido del flujo** — el Hub ahora se desarrolla 100% con Claude Code.

```
┌────────────────────────────────────────────────────────┐
│                                                        │
│   stage-crono-gravity                                  │
│   Motor unificado (PWA) ⭐ VIGENTE                     │
│                                                        │
│   ?event=las_varas  →  catálogo Las Varas             │
│   ?event=puchuncavi →  catálogo Puchuncaví            │
│                                                        │
│   GitHub Pages → horta30.github.io/stage-crono-gravity│
│                                                        │
│   Acceso restringido: REQUIRE_HUB_ENTRY = true        │
│   (no se entra directo, se entra desde el Hub)        │
│                                                        │
└────────────────────────────────────────────────────────┘
                          │
                          │ escribe/lee
                          ▼
            ┌──────────────────────────┐
            │  Supabase REAL           │
            │  sgmzacwxfuznolthyjff    │
            │  São Paulo · Free tier   │
            │                          │
            │  Aislamiento por columna │
            │  `evento`                │
            └──────────────────────────┘
                          ▲
                          │ lee
                          │
┌────────────────────────────────────────────────────────┐
│                                                        │
│   stage-crono-flow (Hub) ⭐ VIGENTE                    │
│                                                        │
│   React + Vite + TypeScript                            │
│   Desarrollo local: localhost:8080                     │
│   Editado con Claude Code directo desde local          │
│                                                        │
│   Deploy: Vercel → stage-crono-flow.vercel.app         │
│                                                        │
└────────────────────────────────────────────────────────┘
```

### Motores deprecados (NO modificar)

| Repo | Estado | Por qué deprecado |
|------|--------|---|
| `STAGE-CRONO-LAS-VARAS` | Archived en GitHub | Reemplazado por Gravity |
| `DH-PUCHUNCAVI` | Activo pero obsoleto | Reemplazado por Gravity. Backup vivo durante 2-3 eventos. |

Pueden seguir online sirviendo eventos legacy pero **toda funcionalidad nueva va a Gravity**.

---

## 3. Repos GitHub

| Repo | Propósito | Quién lo edita |
|------|-----------|----------------|
| `stage-crono-gravity` | Motor unificado vigente | Claude Code desde local |
| `stage-crono-flow` | Hub central | Claude Code desde local (Lovable desconectado) |
| `STAGE-CRONO-LAS-VARAS` | Motor legacy archivado | No tocar |
| `DH-PUCHUNCAVI` | Motor legacy en backup | No tocar (a archivar pronto) |

URL completa: `https://github.com/horta30/<NOMBRE_REPO>`

Clonados localmente en: `~/stage-crono/`

---

## 4. Backend compartido — Supabase

- **Project ID real**: `sgmzacwxfuznolthyjff` (dashboard: `stage-crono-las-varas`)
- **Región**: AWS sa-east-1 (São Paulo)
- **Plan**: Free
- **URL**: `https://sgmzacwxfuznolthyjff.supabase.co`
- **Publishable key**: `sb_publishable_-wDAA3WMgcrJSGA9B4Gciw_wOuM27pw`

Estas credenciales son **públicas** (están en código cliente en GitHub Pages). La `service_role` key sí es secreta y nunca aparece en cliente.

### Project ID FANTASMA (no usar)

Existió un project ID `teruaqpwwfhisegvsrgc` que era la base autocreada por Lovable Cloud. **Fue purgada del Hub el 28 Jun 2026** junto con la desconexión de Lovable. Si en algún momento reaparece esa URL en código o requests, es señal de regresión — investigar y eliminar.

### Schema clave

```sql
resultados (
  id uuid PK,
  evento text,
  stage_number int,
  rider_name text,
  pin_hash text,
  time_ms bigint,
  time_formatted text,
  created_at timestamp
)

mejores_tiempos (vista derivada)
campeonato (vista derivada)
```

Aislamiento entre eventos: columna `evento`.

---

## 5. Stack técnico — Motor Gravity

### Estructura modular
```
stage-crono-gravity/
├── index.html              # entrada (lock / event view / stage select)
├── crono.html              # pantalla del cronómetro activo
├── resultados.html         # leaderboards
├── manifest.json
├── sw.js                   # service worker (PWA)
├── assets/
│   ├── js/
│   │   ├── config.js       # SUPA_URL, SUPA_KEY, HUB_URL, REQUIRE_HUB_ENTRY
│   │   ├── events.js       # catálogo: las_varas + puchuncavi con sus stages
│   │   ├── session.js      # identidad del piloto (localStorage)
│   │   ├── utils.js        # helpers puros
│   │   ├── gps.js          # módulo único para navigator.geolocation
│   │   ├── wakelock.js     # módulo único para navigator.wakeLock
│   │   ├── audio.js        # módulo único para speechSynthesis
│   │   ├── supabase.js     # cliente + offline buffer
│   │   └── crono-app.js    # lógica principal (812 líneas)
│   ├── events/
│   │   ├── las_varas/{seg01.js, seg02.js}
│   │   └── puchuncavi/{seg01.js}
│   ├── logo.png
│   └── ...
├── icons/
└── .github/workflows/
    └── keepalive.yml       # cron diario anti-pausa Supabase
```

### Las tres reglas Capacitor-readiness (CRÍTICAS)

Gravity está preparado para migrar a app nativa con Capacitor en pocos días, no semanas. Las reglas:

1. **APIs sensibles centralizadas.** Todas las llamadas a `navigator.geolocation`, `navigator.wakeLock` y `speechSynthesis` viven en módulos únicos (`gps.js`, `wakelock.js`, `audio.js`). El día de la migración, solo cambian estos archivos.

2. **Lógica de negocio limpia.** `crono-app.js` NO llama directamente a APIs del navegador. Todo pasa por las abstracciones. Helpers matemáticos viven en `utils.js`, sin DOM ni APIs.

3. **Comentarios marcando deuda transitoria.** Hacks PWA-specific marcados con `// CAPACITOR FUTURE:` o `// PWA-only:`.

**No romper estas reglas al hacer cambios.** Si necesitás una API del navegador, agregala al módulo correspondiente.

### Política de acceso

`REQUIRE_HUB_ENTRY: true` en `config.js`. Esto significa:
- Si alguien entra directo sin params (`?event=` + `?rider=`), ve pantalla "lock" que lo redirige al Hub
- Para testing local rápido, podés cambiar a `false` (revertir antes de commitear)

### Limitaciones conocidas (PWA)

- **Cronómetro requiere pantalla encendida**. Si rider apaga pantalla, browser suspende JS.
- **Battery Saver agresivo** (Xiaomi, Huawei) puede matar la pestaña.
- Solución: migrar a Capacitor (futuro).

---

## 6. Stack técnico — Hub

### Frontend
- **React 18 + Vite 5.4 + TypeScript**
- **Tailwind CSS** + **shadcn/ui**
- **React Router** + **TanStack Query**

### Estructura clave
```
src/
  data/
    stagesConfig.ts          # config estática + eventCronoUrl
  hooks/
    useStagesData.ts         # fetch stages con LIVE data
    useRankingsData.ts       # rankings por evento
    useAuth.tsx              # auth mock por ahora
  pages/
    Stages.tsx, StageDetail.tsx, EventDetail.tsx, Rankings.tsx
    Auth.tsx, Profile.tsx
  components/
    home/Hero.tsx, LiveStages.tsx, RankingGeneral.tsx
  lib/
    supabase.ts              # cliente único (lee del .env)
```

### .env del Hub (correcto al 28 Jun 2026)
```
VITE_SUPABASE_URL=https://sgmzacwxfuznolthyjff.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_-wDAA3WMgcrJSGA9B4Gciw_wOuM27pw
VITE_SUPABASE_PROJECT_ID=sgmzacwxfuznolthyjff
```

**Importante**: el `.env` no se commitea (está en `.gitignore`). Cuando clones el repo en otra máquina, hay que crearlo manualmente.

### Conexión Hub → Gravity

En `src/data/stagesConfig.ts`:
```typescript
export const eventCronoUrl: Record<string, string> = {
  las_varas: "https://horta30.github.io/stage-crono-gravity/?event=las_varas",
  puchuncavi: "https://horta30.github.io/stage-crono-gravity/?event=puchuncavi",
};
```

### Flujo de desarrollo local

```bash
cd ~/stage-crono/stage-crono-flow
npm install                      # solo primera vez
npm run dev                      # arranca en http://localhost:8080
```

### Deploy (RESUELTO — 28 Jun 2026)

- **Plataforma**: Vercel (Hobby / free tier)
- **URL**: `https://stage-crono-flow.vercel.app`
- **Deploy automático**: cada push a `main` en GitHub triggerea rebuild
- **Env vars**: configuradas en panel de Vercel (las 3 `VITE_SUPABASE_*`)

---

## 7. Reglas críticas de trabajo

### Regla 1 — Lovable está OUT del flujo
- **NO reconectar Lovable** al repo del Hub. Causó problemas serios (cliente Supabase fantasma regenerado, `.env` reescrito en background).
- El Hub se edita con Claude Code desde local, push directo a GitHub.
- Si necesitás revivir el preview hosted, **usar Vercel/Netlify**, no Lovable.

### Regla 2 — Gravity es territorio libre
- Editable directo desde local con Claude Code o GitHub
- Mantener compatibilidad con schema Supabase compartido
- **Respetar las 3 reglas de Capacitor-readiness**

### Regla 3 — KMZ workflow
- Pablo depura KMZ en **Google Earth Pro**
- Respetar **literal** la posición de waypoints y dirección del track
- **NO invertir tracks ni reposicionar waypoints** sin aprobación explícita

### Regla 4 — Identidad débil = leaderboards privados
- Hoy: nombre + PIN 4 dígitos. Bajo para producción.
- Leaderboards públicos deliberadamente desactivados
- Decisión de producto. No abrir hasta tener WhatsApp/email validado.

### Regla 5 — Imágenes y assets en commits separados
- Cambios de código y de imagen → commits separados
- Imágenes con kebab-case sin espacios

### Regla 6 — Nunca generar copies/posts finales sin aprobación
- Solo borradores para revisión
- Esperar trigger explícito antes de marcar como final

### Regla 7 — Cuidar las 3 reglas de Capacitor en Gravity
- Nueva funcionalidad con APIs del browser → pasar por módulos centralizados
- Mantener `crono-app.js` libre de llamadas directas a APIs

---

## 8. Convenciones de naming y datos

### Slugs
- Eventos (snake_case): `las_varas`, `puchuncavi`
- Stages (kebab-case): `anfiteatro-norte`, `anfiteatro-clasic`, `la-canela`
- Archivos JS (kebab-case): `seg01.js`, `crono-app.js`

### Naming canónico del stage de Puchuncaví
- **Correcto**: "DH Puchuncaví"
- **Obsoleto**: "DH La Canela"
- Estado actual: Hub y Gravity ambos dicen "DH Puchuncaví" ✅ (resuelto 28 Jun 2026)

### Catálogo de eventos en Gravity (`assets/js/events.js`)
```javascript
SC_EVENTS = {
  las_varas: {
    stages: [
      { numero: 1, nombre: 'Anfiteatro Norte', distancia: 0.79, desnivel: 166 },
      { numero: 2, nombre: 'Anfiteatro Clásic', distancia: 1.10, desnivel: 160 },
    ]
  },
  puchuncavi: {
    stages: [
      { numero: 1, nombre: 'DH Puchuncaví', distancia: 2.57, desnivel: 464 }
    ]
  }
}
```

---

## 9. Problemas activos conocidos (al 28 Jun 2026)

### Problema 1 — Naming inconsistente Gravity vs Hub (✅ RESUELTO 28 Jun 2026)

Gravity actualizado a "DH Puchuncaví". Consistente con Hub.

Archivo: `stage-crono-gravity/assets/js/events.js`, key `puchuncavi.stages[0].nombre`.

Fix (con Claude Code):
```bash
cd ~/stage-crono/stage-crono-gravity
sed -i '' "s/'DH La Canela'/'DH Puchuncaví'/g" assets/js/events.js
git add assets/js/events.js
git commit -m "fix: actualizar nombre del stage de Puchuncaví"
git push
```

### Problema 2 — Hub local sin commit a GitHub (✅ RESUELTO 28 Jun 2026)

Commit `f8694b8` pusheado. Incluye eliminación de carpeta Lovable, cliente fantasma, y `.env` sacado del tracking.

### Problema 3 — Deploy del Hub (✅ RESUELTO 28 Jun 2026)

Deployado en Vercel: `https://stage-crono-flow.vercel.app`. Deploy automático desde GitHub.

### Problema 4 — Keep-alive Supabase frágil

El cron de GitHub Actions falló durante un período suficiente para pausar la base. Se restauró manualmente el 27 Jun 2026.

Mejora pendiente: healthcheck post-ping + alerta a email si falla N veces.

---

## 10. Comandos / operaciones frecuentes

### Verificar estado del backend
```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "apikey: sb_publishable_-wDAA3WMgcrJSGA9B4Gciw_wOuM27pw" \
  "https://sgmzacwxfuznolthyjff.supabase.co/rest/v1/resultados?limit=1"

curl -s -o /dev/null -w "%{http_code}\n" \
  https://horta30.github.io/stage-crono-gravity/
```

### Reactivar Supabase tras pausa
1. Dashboard Supabase → proyecto `stage-crono-las-varas`
2. Click "Resume project"
3. Esperar 1-3 min al estado "Healthy"

### Levantar Hub en desarrollo local
```bash
cd ~/stage-crono/stage-crono-flow
npm install                    # solo primera vez
npm run dev                    # arranca http://localhost:8080
```

### Agregar un evento nuevo a Gravity
1. Editar `assets/js/events.js`, agregar entrada en `SC_EVENTS`
2. Crear `assets/events/<slug>/seg01.js` con waypoints + meta del KMZ
3. Si tiene varios stages, crear `seg02.js`, etc.
4. En el Hub, editar `src/data/stagesConfig.ts`:
   - Agregar el evento al array
   - Agregar URL a `eventCronoUrl`: `https://horta30.github.io/stage-crono-gravity/?event=<slug>`
5. Commit Gravity + Hub, push ambos

### Test de un evento sin tocar producción
- Cambiar `REQUIRE_HUB_ENTRY: false` en `config.js` local de Gravity
- Probar con `?event=puchuncavi&rider=Test123`
- **Revertir a `true` antes de commitear**

---

## 11. Próximos pasos inmediatos (orden recomendado)

### A. ✅ Commitear el Hub limpio a GitHub (resuelto 28 Jun 2026)
### B. ✅ Fix naming Gravity (resuelto 28 Jun 2026)
### C. ✅ Deploy del Hub en Vercel (resuelto 28 Jun 2026)
### D. Retomar Roadmap normal

---

## 12. Roadmap / prioridades

### Inmediato (esta semana)
- ✅ Reactivar Supabase tras pausa (resuelto 27 Jun)
- ✅ Arreglar Hub → Supabase real (resuelto 28 Jun)
- ✅ Commit + push Hub a GitHub (resuelto 28 Jun)
- ✅ Corregir naming Gravity → "DH Puchuncaví" (resuelto 28 Jun)
- ✅ Deploy Hub en Vercel (resuelto 28 Jun)
- ⏳ Healthcheck robusto en keep-alive

### Corto plazo (semanas)
- Identidad validada (WhatsApp o email con OTP)
- Modo "evento oficial" con código de activación
- Eliminar mocks visibles en Hub

### Medio plazo (meses)
- Migración Gravity → Capacitor (app nativa)
- Panel de organizador (white-label posible)
- Motor configurable: nuevo evento sin tocar repo

### Largo plazo
- Plataforma sport-agnostic (MTB, trail, moto, ski randonée)
- Capa de seguridad en tiempo real
- Capa de datos territoriales

---

## 13. Contexto comercial (para decisiones de producto)

- **Cliente anchor potencial**: organizadores deportivos red Welcu (TransAndes, Andes Pacífico Enduro, UCI MTB Masters Chillán, Conquista Chile). Welcu hace ticketing, no cronometraje — gap claro.
- **Stage Crono ≠ Strava**: foco en evento oficial cronometrado, no feed de comunidad.
- **Hardware opcional**: "software-first, hardware-optional".
- **Pricing en exploración**: B2B (organizadores pagan) > B2C. Open Core con free tier.

---

## 14. Cosas que Claude Code NO debe hacer

- ❌ **Reconectar Lovable al repo del Hub** bajo ninguna circunstancia
- ❌ Modificar motores legacy `STAGE-CRONO-LAS-VARAS` o `DH-PUCHUNCAVI`
- ❌ Tocar geometría de KMZ sin confirmación explícita
- ❌ Romper las 3 reglas de Capacitor-readiness
- ❌ Generar texto publicado sin aprobación
- ❌ Asumir que Supabase está despierto en operaciones críticas
- ❌ Mezclar código con imágenes en un mismo commit
- ❌ Crear archivos en `src/integrations/supabase/` o carpeta `supabase/` del Hub
- ❌ Hardcodear el project ID fantasma `teruaqpwwfhisegvsrgc` en ningún lado

---

## 15. Bitácora de cambios mayores

- **27 Jun 2026**: Supabase pausado por inactividad, restaurado manualmente
- **27-28 Jun 2026**: Detectado y resuelto enredo crítico — Hub apuntaba a base fantasma de Lovable
- **28 Jun 2026**: Lovable desconectado del repo `stage-crono-flow`. Hub migrado a desarrollo local con Claude Code.
- **28 Jun 2026**: Hub commiteado y pusheado a GitHub (limpieza Lovable + .env sacado del tracking)
- **28 Jun 2026**: Naming Gravity corregido — "DH La Canela" → "DH Puchuncaví"
- **28 Jun 2026**: Hub deployado en Vercel → `stage-crono-flow.vercel.app`

---

*Última actualización: 28 Jun 2026 — Pablo Horta / Gravitas Solutions*
