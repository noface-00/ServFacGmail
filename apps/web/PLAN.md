# PLAN.md — Integración de las pantallas de Stitch en `apps/web`

Plan de trabajo para convertir las pantallas generadas en Google Stitch (proyecto `11193141380827308496`) en una aplicación React basada en componentes, conectada a la API de `apps/api`.

Documentos relacionados: [`DESIGN.md`](./DESIGN.md) (sistema de diseño) · [`STITCH.md`](./STITCH.md) (prompts de Stitch).

> **Regla de mantenimiento:** cada avance (tarea terminada, decisión tomada o bloqueo encontrado) actualiza la sección **Estado del proyecto** y añade una línea a la **Bitácora** al final de este archivo, en el mismo cambio que el código.

---

## Estado del proyecto

**Fase actual:** Fase 0 — Preparación (en curso)
**Última actualización:** 2026-10-05

| Fase | Nombre | Estado | Avance |
|---|---|---|---|
| 0 | Preparación del entorno | 🟦 En curso (0.9 bloqueada) | 8 / 9 |
| 1 | Fundaciones: tokens, componentes base y layout | ⬜ Pendiente | 0 / 14 |
| 2 | Sesión y acceso | ⬜ Pendiente | 0 / 8 |
| 3 | Cuentas de Gmail | ⬜ Pendiente | 0 / 8 |
| 4 | Escaneo de facturas | ⬜ Pendiente | 0 / 11 |
| 5 | Detalle de factura y descarga | ⬜ Pendiente | 0 / 6 |
| 6 | Administración de claves de API | ⬜ Pendiente | 0 / 6 |
| 7 | Calidad, responsive y despliegue | ⬜ Pendiente | 0 / 9 |

Leyenda: ⬜ Pendiente · 🟦 En curso · ✅ Terminada · ⛔ Bloqueada

### Pantallas de Stitch

| Pantalla en Stitch | ID | Estado en Stitch | Integrada en | Estado |
|---|---|---|---|---|
| Acceso - Clave de API | `7bd47151e2cd45f1a5d6c58d9e49fca1` | ✅ Generada | Fase 2 | ⬜ |
| Escanear - Facturas Recibidas | `9cdf1f8fb11d4e288b68ebc21dc914bd` | ✅ Generada | Fase 4 | ⬜ |
| Detalle de Factura (Drawer) | `b2dcabfa99da46829f9bbca31ba859aa` | ✅ Generada | Fase 5 | ⬜ |
| Cuentas de Gmail y Conexión OAuth | `d519020c25df43ce860d889af0e34945` | ✅ Generada | Fase 3 | ⬜ |
| Administración - Claves de API | `6b9acbdf9ab0417b9947351579664cc1` | ✅ Generada | Fase 6 | ⬜ |
| Registro - Crear Cuenta | `279b50da97e74b888807a5879da53033` | ⚠️ Sin endpoint | — (descartar) | — |
| Escanear - Emitidas (STITCH.md 3.4) | — | ⬜ Falta generar | Fase 4 | ⬜ |
| Carga y vacío del escaneo (3.3) | — | ⬜ Falta generar | Fase 4 | ⬜ |
| Confirmar desconexión (3.8) | — | ⬜ Falta generar | Fase 3 | ⬜ |
| Crear clave y revelado (3.10) | — | ⬜ Falta generar | Fase 6 | ⬜ |
| Errores globales (3.11) | — | ⬜ Falta generar | Fase 7 | ⬜ |
| Versión móvil (3.12) | — | ⬜ Falta generar | Fase 7 | ⬜ |

### Bloqueos y decisiones abiertas

- **`pnpm dev` de la API falla con Node 26**: `ts-node` 10 no es compatible (`ERR_INVALID_ARG_TYPE` en `fileURLToPath`). No bloquea el frontend: se puede usar `pnpm --filter @servfac/api build && node apps/api/dist/index.js`. Pendiente decidir si se migra el script `dev` a `tsx`.
- **Generación de pantallas en Stitch (0.9) falló**: `generate_screen_from_text` para "Escanear - Emitidas" agotó el tiempo y la pantalla no apareció tras ~25 min. Pendiente reintentar (desde la interfaz de Stitch o por MCP).
- **"Registro - Crear Cuenta" sigue en Stitch**: el MCP no permite borrar pantallas; hay que eliminarla a mano desde la interfaz de Stitch.

---

## Decisiones técnicas

| Tema | Decisión | Motivo |
|---|---|---|
| Estilos | **Tailwind CSS v4** (`@tailwindcss/vite`) con el tema de Stitch portado a `@theme` | Stitch exporta HTML con Tailwind; así el marcado se reutiliza casi tal cual en JSX en vez de reescribir cada pantalla |
| Tokens | Los colores de Stitch (`primary`, `surface-container`, …) se mapean a los tokens de `DESIGN.md` §3 en `src/assets/css/tokens.css` | Una sola fuente de verdad; permite modo oscuro con variables CSS |
| Iconos | Material Symbols Outlined (fuente de Google, como en Stitch) envuelto en un componente `<Icon name="…" />` | Coincide con el HTML exportado; se puede cambiar de librería tocando un solo componente |
| Lenguaje | JavaScript + JSX (como el proyecto actual), con JSDoc en la capa `api/` | No cambiar el stack ya creado; los tipos de respuesta quedan documentados |
| Rutas | `react-router` v8 (modo librería; v8 es la versión actual al instalar) | Rutas protegidas por sesión y por rol |
| Datos del servidor | `@tanstack/react-query` | Caché de `/accounts`, sondeo durante el OAuth, estados loading/error uniformes |
| HTTP | `axios` (ya instalado) con interceptores | Añade `x-api-key` y normaliza `{ userMessage, technicalError }` |
| Estado global | React Context en `src/stores/` | Sin dependencias nuevas; solo sesión, cuenta seleccionada y toasts |
| Pruebas | Vitest 5 + Testing Library + MSW 2 (MSW 2 por compatibilidad con Vitest 5) | Mismo enfoque que la API: sin red real |

Si alguna decisión cambia, se registra aquí y en la Bitácora.

---

## Estructura de carpetas

Se respeta la distribución creada en `apps/web/src` (`api/routes/`, `assets/css/`, `assets/logos/`, `pages/`, `stores/`) y se completa con `components/`, `hooks/`, `layouts/` y `lib/`. Decidido el 2026-10-05 (ver Bitácora).

```
apps/web/
├── .env / .env.example            ← en la raíz de apps/web (Vite solo lee aquí)
├── design/stitch/                 ← referencia: HTML y capturas exportadas de Stitch (no se importa desde src)
├── index.html
└── src/
    ├── main.jsx                   ← providers: QueryClient, Router, stores (Context)
    ├── App.jsx                    ← definición de rutas
    ├── api/
    │   ├── axios.js               ← instancia + interceptores (x-api-key, normalización de errores)
    │   ├── errors.js              ← normalización { status, userMessage, technicalError } (DESIGN.md §6.1)
    │   └── routes/                ← un archivo por recurso del backend
    │       ├── health.js          ← GET /health
    │       ├── accounts.js        ← GET /accounts · GET /auth/google/login · DELETE /accounts/:email
    │       ├── scan.js            ← POST /scan · POST /scan-sent · GET /download-pdf
    │       └── apiKeys.js         ← /admin/api-keys (POST, GET, DELETE)
    ├── assets/
    │   ├── css/                   ← tokens.css (variables --sf-* + @theme de Tailwind), base.css
    │   └── logos/                 ← logo de ServFacGmail
    ├── components/                ← presentación pura: solo props, sin llamadas a la API
    │   ├── ui/                    ← Button, Input, Select, Badge, Alert, Toast, Dialog, Drawer, Icon, Spinner, Skeleton
    │   ├── data/                  ← DataTable, StatCard, EmptyState, MoneyCell
    │   ├── form/                  ← EmailChipsInput, SegmentedControl, DateInput, TextareaCounter
    │   ├── layout/                ← TopBar, Sidebar, PageHeader, AdminSection, HealthIndicator
    │   ├── accounts/              ← AccountSelector, ConnectAccountDialog, DisconnectDialog
    │   ├── scan/                  ← ScanForm, ScanResults, InvoiceTable, FailedList, ScanProgress
    │   ├── invoice/               ← InvoiceDrawer, InvoiceItems, PdfPreview
    │   └── admin/                 ← CreateKeyDialog, SecretRevealDialog, RevokeDialog
    ├── hooks/                     ← acceso a datos con React Query: useAccounts, useScan, useDownloadPdf, useApiKeys, useHealth
    ├── layouts/                   ← layouts de ruta: AppLayout (shell), AdminLayout, AuthLayout
    ├── lib/                       ← utilidades puras: format.js (moneda/fechas), csv.js, download.js, storage.js
    ├── pages/                     ← una página por ruta: LoginPage, AccountsPage, ScanPage, ApiKeysPage, NotFoundPage, ServiceUnavailablePage
    ├── stores/                    ← estado global con React Context: SessionStore (clave + rol), AccountStore (cuenta seleccionada), ToastStore
    └── tests/                     ← setup de Vitest, handlers de MSW, fixtures de facturas
```

**Reglas de componentes:**
1. `components/` no importa de `api/`, `hooks/`, `stores/` ni `pages/`: solo recibe props.
2. Solo `hooks/` llama a `api/routes/`; las páginas obtienen datos a través de hooks.
3. `stores/` guarda únicamente estado de cliente (sesión, cuenta elegida, toasts); los datos del backend viven en React Query.
4. Las páginas (`pages/*Page.jsx`) componen layouts, componentes y hooks; no contienen marcado complejo propio.
5. Un componente por archivo, nombre en PascalCase; hooks en camelCase con prefijo `use`.
6. Al pasar una pantalla de Stitch a JSX: partir de `design/stitch/`, extraer los bloques a `components/`, reemplazar datos de ejemplo por props y omitir lo que la API no respalda (ver `design/stitch/README.md`).

---

## Fases

### Fase 0 — Preparación del entorno

**Objetivo:** que el proyecto arranque, hable con la API y tenga las herramientas listas.

- [x] 0.1 Corregir `src/api/axios.js`: `Process.env.VITE_API_URL` → `import.meta.env.VITE_API_URL`.
- [x] 0.2 Mover `src/.env` y `src/.env.example` a `apps/web/`; añadir `.env` al `.gitignore` si no está.
- [x] 0.3 Configurar `CORS_ORIGINS=http://localhost:5173` en `apps/api/.env` (y documentarlo en `.env.example` de la API).
- [x] 0.4 Instalar dependencias: `tailwindcss`, `@tailwindcss/vite`, `react-router`, `@tanstack/react-query`; de desarrollo: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `msw`.
- [x] 0.5 Configurar Tailwind en `vite.config.js` y Vitest (`test.environment: 'jsdom'`).
- [x] 0.6 `index.html`: `lang="es"`, título "ServFacGmail", fuentes IBM Plex Sans/Mono y Material Symbols.
- [x] 0.7 Crear la estructura de carpetas (adaptada a la existente, ver arriba) y eliminar el contenido del template de Vite (`App.css`, logos, `hero.png`, `icons.svg`).
- [x] 0.8 Exportar desde Stitch el HTML y la captura de las 5 pantallas válidas a `design/stitch/` (con `README.md` que lista lo que Stitch inventó y no se implementa).
- [ ] 0.9 🟦 Generar en Stitch las pantallas que faltan (STITCH.md 3.3, 3.4, 3.8, 3.10, 3.11, 3.12) y descartar "Registro - Crear Cuenta".

**Criterio de aceptación:** `pnpm dev:web` muestra una página en blanco con estilos Tailwind; `pnpm --filter @servfac/web test` corre (aunque sin pruebas); desde el navegador, `GET /health` responde sin error de CORS.

---

### Fase 1 — Fundaciones: tokens, componentes base y layout

**Objetivo:** tener el kit de componentes y el armazón de la app, sin lógica de negocio.
**Fuente:** el `tailwind.config` embebido en cualquier HTML de Stitch + `DESIGN.md` §3–4.

- [ ] 1.1 `assets/css/tokens.css`: variables `--sf-*` (claro y oscuro) y bloque `@theme` con los nombres de Stitch apuntando a ellas.
- [ ] 1.2 `assets/css/base.css`: tipografía base 14 px, foco visible, `prefers-reduced-motion`.
- [ ] 1.3 `ui/Icon`, `ui/Spinner`, `ui/Skeleton`.
- [ ] 1.4 `ui/Button` (primary, secondary, ghost, danger, admin; sm/md/lg; loading).
- [ ] 1.5 `ui/Input`, `ui/Select`, `form/TextareaCounter`, `form/DateInput` (label, ayuda, error).
- [ ] 1.6 `form/EmailChipsInput` (validación de email, límite 200, pegado múltiple).
- [ ] 1.7 `form/SegmentedControl`.
- [ ] 1.8 `ui/Badge` con las variantes de `DESIGN.md` §4.4.
- [ ] 1.9 `ui/Alert` con detalle técnico plegable y botón Copiar.
- [ ] 1.10 `ui/Toast` + `ToastProvider` + hook `useToast`.
- [ ] 1.11 `ui/Dialog` y `ui/Drawer` (trampa de foco, `Esc`, retorno de foco).
- [ ] 1.12 `data/DataTable` (ordenación, estados loading/empty/error), `data/StatCard`, `data/EmptyState`, `data/MoneyCell`.
- [ ] 1.13 `layouts/AppLayout`, `layout/TopBar`, `Sidebar`, `PageHeader`, `AdminSection`, extraídos del marco común de las pantallas de Stitch.
- [ ] 1.14 Página temporal `/_kit` (solo en desarrollo) que muestra todos los componentes, y pruebas unitarias de Button, EmailChipsInput, Alert y Dialog.

**Criterio de aceptación:** `/_kit` coincide visualmente con Stitch en claro y oscuro; pruebas en verde.

---

### Fase 2 — Sesión y acceso

**Endpoints:** `GET /accounts` (validar clave) · `GET /admin/api-keys` (detectar rol) · `GET /health`.
**Pantalla Stitch:** Acceso - Clave de API.

- [ ] 2.1 `api/errors.js`: convierte errores de axios a `{ status, userMessage, technicalError }`, incluidos red y timeout.
- [ ] 2.2 `api/axios.js`: interceptor que añade `x-api-key` desde `lib/storage.js` (`sessionStorage`); ante `401`, cierra la sesión.
- [ ] 2.3 `stores/SessionStore` + hook `useSession` (`apiKey`, `role: 'admin' | 'client'`, `login()`, `logout()`).
- [ ] 2.4 `LoginPage` a partir del HTML de Stitch: validación con `GET /accounts`, mensajes para 401 y 503.
- [ ] 2.5 Detección de rol con `GET /admin/api-keys` (200 → admin, 403 → cliente).
- [ ] 2.6 `RequireAuth` y `RequireAdmin` (en `layouts/`) como guardas de ruta; definir rutas en `App.jsx`.
- [ ] 2.7 `layout/HealthIndicator` + `hooks/useHealth` en la TopBar (consulta cada 60 s) y `ServiceUnavailablePage`.
- [ ] 2.8 Pruebas: login correcto, clave inválida, rol admin y cliente, cierre de sesión por 401.

**Criterio de aceptación:** con la clave maestra se ve Administración; con una clave de cliente no; una clave inválida muestra el error y no entra.

---

### Fase 3 — Cuentas de Gmail

**Endpoints:** `GET /accounts` · `GET /auth/google/login` · `DELETE /accounts/:email`.
**Pantallas Stitch:** Cuentas de Gmail y Conexión OAuth · Confirmar desconexión.

- [ ] 3.1 `api/routes/accounts.js` + hook `useAccounts` (React Query).
- [ ] 3.2 `AccountsPage`: tabla con correo, fecha de conexión, último token y acción "Escanear".
- [ ] 3.3 `AccountSelector` en la TopBar; la cuenta elegida se guarda en `sessionStorage` y la usan las pantallas de escaneo.
- [ ] 3.4 `ConnectAccountDialog`: pide `authUrl`, abre un popup, sondea `/accounts` cada 3 s hasta 10 min, maneja el popup bloqueado y la caducidad (DESIGN.md §6.2).
- [ ] 3.5 `DisconnectDialog` con confirmación escribiendo el correo.
- [ ] 3.6 Acciones de administración visibles solo con `role === 'admin'`; misma vista reutilizada en `/admin/cuentas`.
- [ ] 3.7 Estado vacío diferente para admin y cliente.
- [ ] 3.8 Pruebas: listado filtrado, flujo OAuth con sondeo simulado, desconexión y error 404.

**Criterio de aceptación:** un admin conecta una cuenta real de Gmail desde la UI y la ve aparecer sin recargar; la desconexión pide confirmación y actualiza la tabla.

---

### Fase 4 — Escaneo de facturas

**Endpoints:** `POST /scan` · `POST /scan-sent`.
**Pantallas Stitch:** Escanear - Facturas Recibidas · Emitidas · Carga y vacío.

- [ ] 4.1 `api/routes/scan.js` con timeout propio de 10 min y soporte de `AbortController`.
- [ ] 4.2 Hook `useScan(kind: 'received' | 'sent')` con React Query (`useMutation`); los resultados se conservan al cambiar de pestaña.
- [ ] 4.3 `ScanForm`: cuenta, modo Simple / Consulta avanzada, `sinceDate`, `supplierEmails` o `clientEmails`, "Usar lista por defecto del servidor" y `geminiApiKey` en Opciones avanzadas.
- [ ] 4.4 Validaciones en cliente iguales a `apps/api/src/validation.ts`; los errores 400 de la API se asocian al campo correspondiente.
- [ ] 4.5 `ScanProgress` con mensajes rotativos, tiempo transcurrido y botón Cancelar.
- [ ] 4.6 `ScanResults`: StatCards (total, total por moneda, leídas por IA, fallidas) y alerta de `truncated`.
- [ ] 4.7 `InvoiceTable` sobre `DataTable`: columnas de `DESIGN.md` §5.3, badges de origen, búsqueda y filtro por origen.
- [ ] 4.8 `FailedList` para `fallidas`.
- [ ] 4.9 Exportar CSV de la tabla visible (`lib/csv.js`).
- [ ] 4.10 Rutas `/escanear/recibidas` y `/escanear/emitidas` compartiendo componentes; los `fileBase64` se guardan aparte de las filas.
- [ ] 4.11 Pruebas: envío de los dos modos, 404 de cuenta, 429 con cuenta regresiva, `truncated`, fallidas y exportación CSV.

**Criterio de aceptación:** un escaneo real contra una cuenta conectada muestra facturas, totales y fallidas; cancelar deja el formulario usable.

---

### Fase 5 — Detalle de factura y descarga

**Endpoint:** `GET /download-pdf`.
**Pantalla Stitch:** Detalle de Factura (Drawer).

- [ ] 5.1 `InvoiceDrawer` con emisor, documento, correo y clave de acceso copiable.
- [ ] 5.2 `InvoiceItems` con suma de ítems y aviso si no cuadra con el subtotal.
- [ ] 5.3 `PdfPreview` usando el `fileBase64` ya recibido (sin pedirlo de nuevo).
- [ ] 5.4 `useDownloadPdf`: si existe el base64 del PDF, descarga local; si no, `GET /download-pdf` con `responseType: 'blob'` y nombre desde `Content-Disposition` (`lib/download.js`).
- [ ] 5.5 Botón Descargar en la tabla y en el drawer con estado de carga y toast de error.
- [ ] 5.6 Pruebas: apertura del drawer, descuadre de ítems, descarga local y descarga por API.

**Criterio de aceptación:** se descarga el PDF correcto tanto de un adjunto PDF directo como de uno dentro de un ZIP.

---

### Fase 6 — Administración de claves de API

**Endpoints:** `POST /admin/api-keys` · `GET /admin/api-keys` · `DELETE /admin/api-keys/:id`.
**Pantallas Stitch:** Administración - Claves de API · Crear clave y revelado.

- [ ] 6.1 `api/routes/apiKeys.js` + hooks `useApiKeys`, `useCreateApiKey`, `useRevokeApiKey`.
- [ ] 6.2 `ApiKeysPage` dentro de `AdminSection`: tabla con prefijo, alcance, creación, último uso y estado; filtro "Mostrar revocadas".
- [ ] 6.3 `CreateKeyDialog` con `name` (1–100) y `allowedAccounts` sugeridas desde `/accounts`.
- [ ] 6.4 `SecretRevealDialog`: muestra la clave una vez, botón Copiar, cierre bloqueado hasta confirmar; la clave no se guarda en ningún estado global.
- [ ] 6.5 `RevokeDialog` y actualización de la tabla tras revocar.
- [ ] 6.6 Pruebas: crear, revelar, revocar y 404 al revocar una clave inexistente.

**Criterio de aceptación:** una clave creada desde la UI sirve para iniciar sesión como cliente y solo ve sus cuentas permitidas; tras revocarla, esa sesión vuelve a Acceso.

---

### Fase 7 — Calidad, responsive y despliegue

**Pantallas Stitch:** Errores globales · Versión móvil.

- [ ] 7.1 Revisar todos los errores contra la tabla de `DESIGN.md` §6.1 (400, 401, 403, 404, 429, 500, 503, red).
- [ ] 7.2 Responsive: Sidebar como drawer bajo 768 px, tabla de facturas como tarjetas, objetivos táctiles de 44 px.
- [ ] 7.3 Modo oscuro completo y selector manual de tema.
- [ ] 7.4 Accesibilidad: navegación por teclado, `aria-sort`, `role="status"`/`role="alert"`, contraste (DESIGN.md §7).
- [ ] 7.5 `NotFoundPage` y eliminar la ruta `/_kit` del build de producción.
- [ ] 7.6 `pnpm lint` y `pnpm build` sin errores; revisar el tamaño del bundle.
- [ ] 7.7 Despliegue: build estático servido por Caddy (añadir el sitio al `Caddyfile` y al `docker-compose.yml`) con `VITE_API_URL` de producción y `CORS_ORIGINS` actualizado.
- [ ] 7.8 Actualizar `README.md` y `CLAUDE.md` con los comandos y la arquitectura del frontend.
- [ ] 7.9 Prueba de punta a punta manual: acceso → conectar cuenta → escanear → detalle → descargar → crear y revocar clave.

**Criterio de aceptación:** la aplicación funciona en producción detrás de Caddy, en escritorio y móvil, con todos los flujos de la API cubiertos.

---

## Dependencias entre fases

```
Fase 0 ─▶ Fase 1 ─▶ Fase 2 ─┬─▶ Fase 3 ─▶ Fase 4 ─▶ Fase 5 ─┐
                            └─▶ Fase 6 ─────────────────────┴─▶ Fase 7
```

La Fase 6 solo depende de la sesión (Fase 2), así que puede avanzar en paralelo con las Fases 3 a 5.

---

## Bitácora

| Fecha | Fase | Cambio |
|---|---|---|
| 2026-10-05 | — | Plan creado. Stitch tiene 6 pantallas generadas (5 válidas y "Registro" sin endpoint) y faltan 6 por generar. Se decide usar Tailwind v4 para reutilizar el HTML exportado. |
| 2026-10-05 | 0 | Tareas 0.1–0.8 terminadas: `axios.js` usa `import.meta.env`, `.env` en la raíz de `apps/web`, `CORS_ORIGINS=http://localhost:5173` en la API (verificado con preflight de `x-api-key`), Tailwind v4 + React Router 8 + React Query + Vitest/Testing Library/MSW 2 instalados, `index.html` en español con IBM Plex y Material Symbols, plantilla de Vite eliminada, 5 pantallas exportadas a `design/stitch/`. `pnpm test`, `lint` y `build` en verde. |
| 2026-10-05 | 0 | Estructura de carpetas adaptada a la existente: `pages/`, `stores/` (React Context), `api/routes/`, `assets/css/`, `assets/logos/`; `api/layouts` se mueve a `src/layouts/`; se descarta `features/` y `styles/`. |
| 2026-10-05 | 0 | Bloqueo menor registrado: `pnpm dev` de la API no arranca en Node 26 por `ts-node` 10. |
| 2026-10-05 | 0 | Tailwind limitado a `src/` con `@import 'tailwindcss' source('.')`: leía los HTML de `design/stitch/` y el CSS subía de 5 kB a 28 kB. README de `apps/web` reescrito con capturas de la Fase 0 (`docs/img/`) y galería de diseños de Stitch. |
| 2026-10-05 | 0 | 0.9 bloqueada: la generación de "Escanear - Emitidas" en Stitch no terminó (timeout y sin pantalla nueva tras ~25 min). |
