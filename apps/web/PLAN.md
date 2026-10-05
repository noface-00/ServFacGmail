# PLAN.md — Integración de las pantallas de Stitch en `apps/web`

Plan de trabajo para convertir las pantallas generadas en Google Stitch (proyecto `11193141380827308496`) en una aplicación React basada en componentes, conectada a la API de `apps/api`.

Documentos relacionados: [`DESIGN.md`](./DESIGN.md) (sistema de diseño) · [`STITCH.md`](./STITCH.md) (prompts de Stitch).

> **Regla de mantenimiento:** cada avance (tarea terminada, decisión tomada o bloqueo encontrado) actualiza la sección **Estado del proyecto** y añade una línea a la **Bitácora** al final de este archivo, en el mismo cambio que el código.

---

## Estado del proyecto

**Fase actual:** Fase 0 — Preparación (sin iniciar)
**Última actualización:** 2026-10-05

| Fase | Nombre | Estado | Avance |
|---|---|---|---|
| 0 | Preparación del entorno | ⬜ Pendiente | 0 / 9 |
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

- Ninguno por ahora.

---

## Decisiones técnicas

| Tema | Decisión | Motivo |
|---|---|---|
| Estilos | **Tailwind CSS v4** (`@tailwindcss/vite`) con el tema de Stitch portado a `@theme` | Stitch exporta HTML con Tailwind; así el marcado se reutiliza casi tal cual en JSX en vez de reescribir cada pantalla |
| Tokens | Los colores de Stitch (`primary`, `surface-container`, …) se mapean a los tokens de `DESIGN.md` §3 en `src/styles/tokens.css` | Una sola fuente de verdad; permite modo oscuro con variables CSS |
| Iconos | Material Symbols Outlined (fuente de Google, como en Stitch) envuelto en un componente `<Icon name="…" />` | Coincide con el HTML exportado; se puede cambiar de librería tocando un solo componente |
| Lenguaje | JavaScript + JSX (como el proyecto actual), con JSDoc en la capa `api/` | No cambiar el stack ya creado; los tipos de respuesta quedan documentados |
| Rutas | `react-router` v7 (modo librería) | Rutas protegidas por sesión y por rol |
| Datos del servidor | `@tanstack/react-query` | Caché de `/accounts`, sondeo durante el OAuth, estados loading/error uniformes |
| HTTP | `axios` (ya instalado) con interceptores | Añade `x-api-key` y normaliza `{ userMessage, technicalError }` |
| Pruebas | Vitest + Testing Library + MSW | Mismo enfoque que la API: sin red real |

Si alguna decisión cambia, se registra aquí y en la Bitácora.

---

## Estructura de carpetas

Se conserva lo que ya existe (`src/api/`, `src/assets/`, `main.jsx`, `App.jsx`) y se amplía según `DESIGN.md` §9:

```
apps/web/
├── .env / .env.example            ← se mueven aquí desde src/ (Vite solo lee la raíz)
├── design/stitch/                 ← referencia: HTML y capturas exportadas de Stitch (no se importa desde src)
│   ├── acceso.html  acceso.png
│   └── …
├── index.html
└── src/
    ├── main.jsx                   ← providers: QueryClient, Router, Session, Toasts
    ├── App.jsx                    ← definición de rutas
    ├── api/                       ← capa HTTP, un archivo por recurso del backend
    │   ├── axios.js               ← instancia + interceptores
    │   ├── errors.js              ← normalización de errores (DESIGN.md §6.1)
    │   ├── health.js              ← GET /health
    │   ├── accounts.js            ← GET /accounts · GET /auth/google/login · DELETE /accounts/:email
    │   ├── scan.js                ← POST /scan · POST /scan-sent · GET /download-pdf
    │   └── apiKeys.js             ← /admin/api-keys (POST, GET, DELETE)
    ├── assets/
    ├── components/                ← componentes de presentación reutilizables, sin llamadas a la API
    │   ├── ui/                    ← Button, Input, Select, Badge, Alert, Toast, Dialog, Drawer, Icon, Spinner, Skeleton
    │   ├── data/                  ← DataTable, StatCard, EmptyState, MoneyCell, MonoText
    │   ├── form/                  ← EmailChipsInput, SegmentedControl, DateInput, TextareaCounter
    │   └── layout/                ← AppShell, TopBar, Sidebar, PageHeader, AdminSection
    ├── features/                  ← una carpeta por área funcional: páginas + componentes y hooks propios
    │   ├── auth/                  ← LoginPage, SessionProvider, useSession, RequireAuth, RequireAdmin
    │   ├── accounts/              ← AccountsPage, AccountSelector, ConnectAccountDialog, DisconnectDialog, useAccounts
    │   ├── scan/                  ← ScanPage, ScanForm, ScanResults, InvoiceTable, FailedList, ScanProgress, useScan
    │   ├── invoice/               ← InvoiceDrawer, InvoiceItems, PdfPreview, useDownloadPdf
    │   ├── admin/                 ← ApiKeysPage, CreateKeyDialog, SecretRevealDialog, RevokeDialog
    │   └── system/                ← NotFoundPage, ServiceUnavailablePage, HealthIndicator
    ├── lib/                       ← utilidades puras: format.js (moneda/fechas), csv.js, download.js, storage.js
    ├── styles/
    │   ├── tokens.css             ← variables --sf-* (DESIGN.md §3) + @theme de Tailwind
    │   └── base.css               ← reset, tipografía, foco
    └── tests/                     ← setup de Vitest, handlers de MSW, fixtures de facturas
```

**Reglas de componentes:**
1. `components/` no importa nada de `api/` ni de `features/`: solo recibe props.
2. Cada `feature` habla con el backend solo a través de hooks propios (`useAccounts`, `useScan`…) que usan `api/`.
3. Las páginas (`*Page.jsx`) componen; la lógica vive en hooks.
4. Un componente por archivo, nombre en PascalCase; hooks en camelCase con prefijo `use`.
5. Al pasar una pantalla de Stitch a JSX: copiar el HTML a `design/stitch/`, identificar bloques repetidos, extraerlos a `components/`, y reemplazar los datos de ejemplo por props.

---

## Fases

### Fase 0 — Preparación del entorno

**Objetivo:** que el proyecto arranque, hable con la API y tenga las herramientas listas.

- [ ] 0.1 Corregir `src/api/axios.js`: `Process.env.VITE_API_URL` → `import.meta.env.VITE_API_URL`.
- [ ] 0.2 Mover `src/.env` y `src/.env.example` a `apps/web/`; añadir `.env` al `.gitignore` si no está.
- [ ] 0.3 Configurar `CORS_ORIGINS=http://localhost:5173` en `apps/api/.env` (y documentarlo en `.env.example` de la API).
- [ ] 0.4 Instalar dependencias: `tailwindcss`, `@tailwindcss/vite`, `react-router`, `@tanstack/react-query`; de desarrollo: `vitest`, `@testing-library/react`, `@testing-library/user-event`, `jsdom`, `msw`.
- [ ] 0.5 Configurar Tailwind en `vite.config.js` y Vitest (`test.environment: 'jsdom'`).
- [ ] 0.6 `index.html`: `lang="es"`, título "ServFacGmail", fuentes IBM Plex Sans/Mono y Material Symbols.
- [ ] 0.7 Crear la estructura de carpetas vacía y eliminar el contenido del template de Vite (`App.css`, logos, `hero.png`).
- [ ] 0.8 Exportar desde Stitch el HTML y la captura de las 5 pantallas válidas a `design/stitch/`.
- [ ] 0.9 Generar en Stitch las pantallas que faltan (STITCH.md 3.3, 3.4, 3.8, 3.10, 3.11, 3.12) y descartar "Registro - Crear Cuenta".

**Criterio de aceptación:** `pnpm dev:web` muestra una página en blanco con estilos Tailwind; `pnpm --filter @servfac/web test` corre (aunque sin pruebas); desde el navegador, `GET /health` responde sin error de CORS.

---

### Fase 1 — Fundaciones: tokens, componentes base y layout

**Objetivo:** tener el kit de componentes y el armazón de la app, sin lógica de negocio.
**Fuente:** el `tailwind.config` embebido en cualquier HTML de Stitch + `DESIGN.md` §3–4.

- [ ] 1.1 `styles/tokens.css`: variables `--sf-*` (claro y oscuro) y bloque `@theme` con los nombres de Stitch apuntando a ellas.
- [ ] 1.2 `styles/base.css`: tipografía base 14 px, foco visible, `prefers-reduced-motion`.
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
- [ ] 1.13 `layout/AppShell`, `TopBar`, `Sidebar`, `PageHeader`, `AdminSection`, extraídos del marco común de las pantallas de Stitch.
- [ ] 1.14 Página temporal `/_kit` (solo en desarrollo) que muestra todos los componentes, y pruebas unitarias de Button, EmailChipsInput, Alert y Dialog.

**Criterio de aceptación:** `/_kit` coincide visualmente con Stitch en claro y oscuro; pruebas en verde.

---

### Fase 2 — Sesión y acceso

**Endpoints:** `GET /accounts` (validar clave) · `GET /admin/api-keys` (detectar rol) · `GET /health`.
**Pantalla Stitch:** Acceso - Clave de API.

- [ ] 2.1 `api/errors.js`: convierte errores de axios a `{ status, userMessage, technicalError }`, incluidos red y timeout.
- [ ] 2.2 `api/axios.js`: interceptor que añade `x-api-key` desde `lib/storage.js` (`sessionStorage`); ante `401`, cierra la sesión.
- [ ] 2.3 `features/auth/SessionProvider` + `useSession` (`apiKey`, `role: 'admin' | 'client'`, `login()`, `logout()`).
- [ ] 2.4 `LoginPage` a partir del HTML de Stitch: validación con `GET /accounts`, mensajes para 401 y 503.
- [ ] 2.5 Detección de rol con `GET /admin/api-keys` (200 → admin, 403 → cliente).
- [ ] 2.6 `RequireAuth` y `RequireAdmin` como guardas de ruta; definir rutas en `App.jsx`.
- [ ] 2.7 `system/HealthIndicator` en la TopBar (consulta cada 60 s) y `ServiceUnavailablePage`.
- [ ] 2.8 Pruebas: login correcto, clave inválida, rol admin y cliente, cierre de sesión por 401.

**Criterio de aceptación:** con la clave maestra se ve Administración; con una clave de cliente no; una clave inválida muestra el error y no entra.

---

### Fase 3 — Cuentas de Gmail

**Endpoints:** `GET /accounts` · `GET /auth/google/login` · `DELETE /accounts/:email`.
**Pantallas Stitch:** Cuentas de Gmail y Conexión OAuth · Confirmar desconexión.

- [ ] 3.1 `api/accounts.js` + hook `useAccounts` (React Query).
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

- [ ] 4.1 `api/scan.js` con timeout propio de 10 min y soporte de `AbortController`.
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

- [ ] 6.1 `api/apiKeys.js` + hooks `useApiKeys`, `useCreateApiKey`, `useRevokeApiKey`.
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
