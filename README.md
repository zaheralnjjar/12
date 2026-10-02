# Nuevo Musulmán

Registro y seguimiento de nuevos musulmanes, sobre Google Sheets, Google Forms y Google Apps Script.
Interfaz en español; construida sobre la estructura de la app «Actividades de los predicadores» (duat-app).

- **Supervisor**: ve todo y configura la aplicación (sheij, cuentas, campos, listas, importación del formulario, exportación).
- **Sheij / maestro**: quien acompañó la shahada; ve y sigue solo a las personas asignadas.
- **Colaborador**: solo registra; después de enviar no ve nada.
- **La persona**: completa el formulario de Google o un enlace personal de un solo uso que recibe por WhatsApp.

## Desarrollo

```
npm ci
npm test                 # servidor real sobre servicios de Google simulados + utilidades
npx tsc -b && npm run lint && npm run build
npm run dev:server       # API local con datos ficticios
VITE_API_URL=http://localhost:8787 VITE_DEV_LOGIN=1 npm run dev
```

- `server/` — Apps Script (una sola puerta de permisos: `20_Gate.js`).
- `src/` — React + TypeScript.
- `tests/` — todo con datos ficticios. **Nunca** subir respuestas reales del formulario.

## Documentos

- [`docs/PLAN.md`](docs/PLAN.md) — decisiones y estado (árabe).
- [`docs/AGENT_PLAN.md`](docs/AGENT_PLAN.md) — segunda fase para el agente externo (árabe).
- [`docs/DEPLOY.md`](docs/DEPLOY.md) — puesta en marcha en la cuenta de Google (árabe).
