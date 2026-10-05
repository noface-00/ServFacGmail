# DESIGN.md — Sistema de diseño de ServFacGmail Web

Sistema de diseño para el panel web (`apps/web`) que consume la API de `apps/api`. Todo lo que aparece aquí se deriva de los endpoints reales, sus respuestas y sus errores: si un componente no tiene un endpoint que lo alimente, no está en este documento.

---

## 1. Principios

1. **Datos de facturas primero.** Es una herramienta contable: densidad de información alta, números alineados, cero decoración que compita con los montos.
2. **Confianza visible.** Cada resultado dice de dónde salió (XML local vs. PDF leído por IA), si el escaneo se cortó (`truncated`) y qué falló (`fallidas`). Nunca se esconde un fallo parcial.
3. **El error lo explica el `userMessage`.** La API ya devuelve mensajes en español para el usuario; la UI los muestra tal cual y deja el `technicalError` en un detalle plegable.
4. **Los privilegios se notan.** Las acciones que exigen la clave maestra (conectar/desconectar cuentas, gestionar claves) viven en una zona "Administración" separada y con estilo distinto.
5. **Operaciones lentas con feedback honesto.** Un escaneo puede tardar minutos (paginación de Gmail + llamadas a Gemini). Se muestra progreso indeterminado con contexto, no un spinner mudo.

---

## 2. Mapa de endpoints → pantallas

| Endpoint | Auth | Pantalla / componente | Notas de UI |
|---|---|---|---|
| `GET /health` | ninguna | Indicador de estado en la barra superior | Punto verde/rojo; se consulta al cargar y cada 60 s |
| `GET /accounts` | cualquier clave | **Cuentas** (lista) y selector de cuenta global | Una clave restringida solo ve sus cuentas (`allowedAccounts`) |
| `GET /auth/google/login` | maestra | Botón "Conectar cuenta de Gmail" | Devuelve `{ authUrl }`; se abre en ventana nueva |
| `GET /auth/google/callback` | `state` firmado | — (página HTML servida por la API) | El frontend no la renderiza; ver §7.2 |
| `DELETE /accounts/:email` | maestra | Acción "Desconectar" en fila de cuenta | Requiere diálogo de confirmación destructiva |
| `POST /scan` | cualquier clave + scope | **Escanear → Recibidas** | Facturas de proveedores |
| `POST /scan-sent` | cualquier clave + scope | **Escanear → Emitidas** | Facturas enviadas a clientes |
| `GET/POST /download-pdf` | cualquier clave + scope | Botón "Descargar" en fila/detalle de factura | Respuesta binaria (blob) |
| `POST /admin/api-keys` | maestra | **Administración → Claves de API** (crear) | La clave en claro se muestra **una sola vez** |
| `GET /admin/api-keys` | maestra | **Administración → Claves de API** (lista) | |
| `DELETE /admin/api-keys/:id` | maestra | Acción "Revocar" | Confirmación destructiva |

### Arquitectura de información

```
┌ Barra superior: logo · selector de cuenta · estado API · menú de sesión
├ Navegación lateral
│  ├ Escanear
│  │   ├ Recibidas   (POST /scan)
│  │   └ Emitidas    (POST /scan-sent)
│  ├ Cuentas         (GET /accounts)
│  └ Administración  (solo clave maestra)
│      ├ Cuentas de Gmail  (login / delete)
│      └ Claves de API     (CRUD /admin/api-keys)
└ Pantalla de acceso (ingreso de x-api-key)
```

**Detección de rol:** la API no expone "quién soy". Tras ingresar la clave, el frontend llama `GET /admin/api-keys`: `200` → rol admin; `403` → rol cliente (se oculta Administración); `401` → clave inválida.

---

## 3. Tokens de diseño

Todos los tokens son variables CSS en `:root` (reemplazan las del template de Vite en `src/index.css`). Prefijo `--sf-`.

### 3.1 Color — base (modo claro)

| Token | Valor | Uso |
|---|---|---|
| `--sf-bg` | `#F7F8FA` | Fondo de la app |
| `--sf-surface` | `#FFFFFF` | Tarjetas, tablas, diálogos |
| `--sf-surface-muted` | `#F1F3F6` | Encabezados de tabla, filas hover, inputs deshabilitados |
| `--sf-border` | `#E2E5EA` | Bordes y divisores |
| `--sf-border-strong` | `#C9CED6` | Bordes de inputs |
| `--sf-text` | `#1B2230` | Texto principal |
| `--sf-text-muted` | `#5B6474` | Texto secundario, etiquetas |
| `--sf-text-subtle` | `#8A92A0` | Placeholders, metadatos |

### 3.2 Color — marca y semánticos (modo claro)

| Token | Valor | Uso |
|---|---|---|
| `--sf-primary` | `#0E6E64` | Acciones principales, enlaces, foco |
| `--sf-primary-hover` | `#0A5A52` | |
| `--sf-primary-soft` | `#E3F3F0` | Fondo de selección, chip activo |
| `--sf-success` | `#1F7A3A` / soft `#E6F4EA` | Cuenta conectada, XML parseado, 2xx |
| `--sf-warning` | `#9A5B00` / soft `#FDF3E1` | `truncated`, datos extraídos por IA, 429 |
| `--sf-danger` | `#B42318` / soft `#FDECEA` | Errores, `fallidas`, acciones destructivas, clave revocada |
| `--sf-info` | `#1D5FA8` / soft `#E7F0FB` | Avisos neutros, 404 de cuenta no conectada |
| `--sf-admin` | `#5B3CC4` / soft `#EFEBFB` | Marca visual de la zona de Administración |

### 3.3 Color — modo oscuro

Se aplica con `@media (prefers-color-scheme: dark)` y con `[data-theme="dark"]` para el selector manual.

| Token | Valor |
|---|---|
| `--sf-bg` | `#0F1318` |
| `--sf-surface` | `#161B22` |
| `--sf-surface-muted` | `#1E242D` |
| `--sf-border` | `#2A313C` |
| `--sf-border-strong` | `#3A4250` |
| `--sf-text` | `#E6E9EE` |
| `--sf-text-muted` | `#A3ABB8` |
| `--sf-text-subtle` | `#6E7685` |
| `--sf-primary` | `#3CC0AE` (hover `#5BD0C0`, soft `#12302C`) |
| `--sf-success` | `#4CC27A` (soft `#132A1C`) |
| `--sf-warning` | `#E3A33B` (soft `#2E2310`) |
| `--sf-danger` | `#F0705F` (soft `#341815`) |
| `--sf-info` | `#6AA6EA` (soft `#142336`) |
| `--sf-admin` | `#A08BF0` (soft `#221C3A`) |

Contraste mínimo: texto normal ≥ 4.5:1 sobre `--sf-surface` en ambos modos; los colores semánticos nunca son el único portador de significado (siempre van con icono o texto).

### 3.4 Tipografía

| Token | Valor |
|---|---|
| `--sf-font-sans` | `"IBM Plex Sans", system-ui, "Segoe UI", Roboto, sans-serif` |
| `--sf-font-mono` | `"IBM Plex Mono", ui-monospace, Consolas, monospace` |

Escala (base 14 px — es una herramienta de datos, no una landing):

| Token | Tamaño / interlineado | Peso | Uso |
|---|---|---|---|
| `--sf-text-xs` | 12 / 16 | 400 | Metadatos, chips, pie de tabla |
| `--sf-text-sm` | 13 / 18 | 400 | Celdas de tabla, ayudas de formulario |
| `--sf-text-md` | 14 / 20 | 400 | Texto base, inputs, botones |
| `--sf-text-lg` | 16 / 24 | 500 | Títulos de tarjeta |
| `--sf-text-xl` | 20 / 28 | 600 | Título de pantalla |
| `--sf-text-2xl` | 28 / 36 | 600 | Cifras de resumen (totales) |

Reglas:
- **Montos, RUC/RUT, número de factura, clave de acceso, `keyPrefix`, `messageId`** → `--sf-font-mono` con `font-variant-numeric: tabular-nums`. Los montos se alinean a la derecha.
- Montos con `Intl.NumberFormat('es', { style: 'currency', currency: moneda ?? 'USD' })`. Si `moneda` falta, se muestra el número sin símbolo y un chip "Moneda desconocida".
- Fechas con `Intl.DateTimeFormat('es', { dateStyle: 'medium' })`; fechas relativas ("hace 3 h") solo para `lastUsedAt`/`updatedAt`, con la fecha absoluta en `title`.

### 3.5 Espaciado, radios, sombras, movimiento

| Grupo | Tokens |
|---|---|
| Espaciado (base 4) | `--sf-space-1: 4px` · `2: 8px` · `3: 12px` · `4: 16px` · `5: 20px` · `6: 24px` · `8: 32px` · `10: 40px` · `12: 48px` |
| Radios | `--sf-radius-sm: 4px` (chips, inputs) · `--sf-radius-md: 8px` (botones, tarjetas) · `--sf-radius-lg: 12px` (diálogos) · `--sf-radius-full: 999px` |
| Sombras | `--sf-shadow-sm: 0 1px 2px rgb(16 24 40 / .06)` · `--sf-shadow-md: 0 4px 12px rgb(16 24 40 / .08)` · `--sf-shadow-lg: 0 12px 32px rgb(16 24 40 / .14)` (en oscuro, opacidad ×3) |
| Movimiento | `--sf-ease: cubic-bezier(.2,.8,.2,1)` · `--sf-dur-fast: 120ms` · `--sf-dur: 200ms`. Respetar `prefers-reduced-motion: reduce` (sin animaciones salvo opacidad) |
| Z-index | `--sf-z-nav: 10` · `--sf-z-drawer: 40` · `--sf-z-dialog: 50` · `--sf-z-toast: 60` |

### 3.6 Layout

- Barra superior de 56 px; navegación lateral de 232 px (colapsa a iconos de 64 px bajo 1200 px y a menú tipo drawer bajo 768 px).
- Contenido con ancho máximo de 1280 px y padding horizontal `--sf-space-6` (en móvil `--sf-space-4`, 16 px).
- Breakpoints: `sm 640` · `md 768` · `lg 1024` · `xl 1280`.
- En móvil las tablas de facturas pasan a lista de tarjetas (§5.4); nunca scroll horizontal de página.

---

## 4. Componentes base

Cada componente lista sus variantes y estados. Todos tienen foco visible: `outline: 2px solid var(--sf-primary); outline-offset: 2px`.

### 4.1 Button
- Variantes: `primary` (relleno `--sf-primary`), `secondary` (borde `--sf-border-strong`, fondo `--sf-surface`), `ghost` (sin borde), `danger` (relleno `--sf-danger`), `admin` (borde y texto `--sf-admin`).
- Tamaños: `sm` 28 px · `md` 36 px · `lg` 44 px (mínimo táctil en móvil).
- Estados: hover, active, focus, disabled, **loading** (spinner a la izquierda, texto se mantiene, ancho fijo para no saltar).
- Un solo `primary` por vista.

### 4.2 Inputs
- `TextInput`, `EmailInput`, `DateInput`, `Textarea`, `Select`.
- Etiqueta siempre visible arriba; ayuda debajo en `--sf-text-muted`; error debajo en `--sf-danger` con icono.
- Validación en cliente que **espeja `validation.ts`** de la API: email válido ≤ 254, `q` ≤ 1000 caracteres (contador visible desde 800), `name` de clave 1–100, listas ≤ 200 emails.

### 4.3 EmailChipsInput
Para `supplierEmails`, `clientEmails` y `allowedAccounts`.
- Separa por coma, espacio, Enter o pegado múltiple; cada email es un chip con botón ✕.
- Chip inválido en estilo `danger` con tooltip "Correo no válido".
- Contador `n / 200`; al llegar a 200 se bloquea la entrada.
- Opción "Usar lista por defecto del servidor" (envía el campo omitido → la API usa `SUPPLIER_EMAILS` / `CLIENT_EMAILS`).

### 4.4 Badge / Chip
| Badge | Color | Cuándo |
|---|---|---|
| `XML` | success | Factura parseada desde XML (gratuito, exacto) |
| `PDF · IA` | warning | Datos extraídos de PDF con Gemini (revisar) |
| `ZIP` | neutral | El adjunto venía comprimido |
| `Sin datos` | neutral | `parsedData` ausente |
| `Activa` / `Revocada` | success / danger | Estado de clave de API (`revokedAt`) |
| `Todas las cuentas` / `n cuentas` | neutral | `allowedAccounts` vacío / con elementos |
| `Admin` | admin | Rol de la sesión actual |

### 4.5 Alert (en página)
Variantes `info`, `success`, `warning`, `danger`. Estructura: icono · título (`userMessage`) · cuerpo opcional · `<details>` "Detalle técnico" con `technicalError` en monoespaciada y botón "Copiar".

### 4.6 Toast
Para confirmaciones breves (cuenta desconectada, clave revocada, PDF descargado). Máx. 3 apilados, 5 s, pausa al hover, región `aria-live="polite"`. Los errores que bloquean una tarea **no** van en toast: van en Alert dentro de la vista.

### 4.7 Dialog
- `ConfirmDialog` destructivo: título en forma de pregunta, consecuencia explícita, botón `danger` con verbo concreto ("Desconectar cuenta", "Revocar clave"). Para desconectar cuenta, el usuario escribe el email para confirmar.
- `SecretRevealDialog` (ver §6.3).
- Trampa de foco, `Esc` cierra (excepto `SecretRevealDialog` hasta confirmar), foco vuelve al disparador.

### 4.8 DataTable
- Encabezado pegajoso en `--sf-surface-muted`, filas de 44 px, hover en `--sf-surface-muted`.
- Columnas numéricas alineadas a la derecha y en mono.
- Orden por columna (cliente), filtro de texto, selección múltiple opcional.
- Estados obligatorios: `loading` (6 filas skeleton), `empty` (EmptyState), `error` (Alert).

### 4.9 EmptyState
Icono lineal 40 px, título, una línea de explicación y una acción. Textos en §8.

### 4.10 StatCard
Cifra en `--sf-text-2xl` mono + etiqueta. Usada en el resumen de escaneo.

### 4.11 ScanProgress
Barra indeterminada + texto que rota cada ~8 s ("Buscando correos…", "Descargando adjuntos…", "Leyendo facturas…") + tiempo transcurrido + botón "Cancelar" (aborta el `AbortController`; el servidor puede seguir trabajando, se aclara en la ayuda).

---

## 5. Pantallas

### 5.1 Acceso
- Campo "Clave de API" (password con botón mostrar), botón "Entrar".
- Al enviar: `GET /accounts` con `x-api-key` → `200` entra; `401` → "La clave no es válida"; `503` → "El servicio no está configurado" (falta `SERVICE_API_KEY`).
- Luego detección de rol (§2).
- La clave se guarda en `sessionStorage` (no `localStorage`) y se borra con "Cerrar sesión".

### 5.2 Cuentas (`GET /accounts`)
- Tabla: **Correo** · **Conectada el** (`connectedAt`) · **Última actualización de token** (`updatedAt`) · acciones.
- Acción "Escanear" en cada fila → va a Escanear con esa cuenta preseleccionada.
- Si rol admin: botón `admin` "Conectar cuenta de Gmail" y acción "Desconectar" por fila.
- Empty: "No hay cuentas conectadas" + (admin) "Conectar cuenta" / (cliente) "Pida a un administrador que conecte una cuenta".

### 5.3 Escanear — Recibidas / Emitidas
Mismo layout, dos pestañas. Formulario a la izquierda (o arriba en < 1024 px), resultados a la derecha.

**Formulario**
- `accountEmail`: Select con las cuentas de `GET /accounts` (por defecto la del selector global).
- Modo: segmented control **Simple** | **Consulta avanzada**.
  - Simple: `sinceDate` (DateInput, requerido) + `supplierEmails` (Recibidas) o `clientEmails` (Emitidas) con EmailChipsInput.
  - Avanzada: Textarea `q` en mono con ayuda de sintaxis de Gmail (`from:`, `after:`, `has:attachment`). Al usar `q` se ignoran fecha y correos — se indica con texto de ayuda.
- Sección plegable "Opciones": `geminiApiKey` (password, opcional, "Si se omite se usa la del servidor").
- Botón primary "Escanear".

**Resultados** (`{ facturas, count, fallidas, truncated }`)
1. Fila de StatCards: Facturas encontradas (`count`) · Total acumulado por moneda · Leídas por IA (n con badge `PDF · IA`) · Fallidas (`fallidas.length`, en danger si > 0).
2. Si `truncated: true` → Alert `warning`: "Se alcanzó el límite de 500 correos por escaneo. Acote la fecha o la consulta para ver el resto."
3. DataTable de facturas:

| Columna | Fuente |
|---|---|
| Fecha emisión | `parsedData.fechaEmision` (fallback `emailDate`) |
| Proveedor / Cliente | `parsedData.supplierName` + RUC en mono debajo (`supplierRuc`) |
| N.º factura | `parsedData.numeroFactura` |
| Subtotal · IVA · Total | `subtotal`, `iva`, `total` + `moneda` |
| Origen | Badge XML / PDF · IA / ZIP |
| Correo | `senderEmail` (Recibidas) o `parsedData.recipientEmail` (Emitidas) |
| Acciones | Ver detalle · Descargar |

4. Panel "Fallidas" (si hay): lista con `filename`, `messageId` en mono y `error`. Colapsado por defecto si son pocas, con badge rojo en el encabezado.
5. Exportar CSV (cliente) de la tabla visible.

### 5.4 Detalle de factura (drawer lateral, 480 px; pantalla completa en móvil)
- Encabezado: proveedor, número, total grande, badge de origen.
- Bloques: Emisor (nombre, RUC), Documento (número, fecha, clave de acceso con copiar), Correo (asunto `emailSubject`, remitente, fecha, `filename`).
- Tabla de ítems (`items[]`): Descripción · Cantidad · P. unitario · Total. Pie con suma de ítems; si difiere del `subtotal`, se marca la diferencia en `warning` ("Los ítems no cuadran con el subtotal") — adelanta el `needsReview` pendiente en el roadmap.
- Acciones: "Descargar PDF" (primary) y "Ver adjunto original" si no es PDF.
- Si el adjunto es PDF, vista previa embebida con el `fileBase64` ya recibido (sin pedir de nuevo).

### 5.5 Administración → Claves de API
- Tabla: **Nombre** · **Prefijo** (`keyPrefix…` en mono) · **Alcance** (badge) · **Creada** · **Último uso** (`lastUsedAt` o "Nunca") · **Estado** · acciones.
- Filas revocadas con opacidad 60 % y sin acción "Revocar"; filtro "Mostrar revocadas".
- Botón "Crear clave" → diálogo con `name` y `allowedAccounts` (EmailChipsInput con sugerencias de `GET /accounts`; vacío = "Acceso a todas las cuentas" explicado en la ayuda).

### 5.6 Administración → Cuentas de Gmail
Misma tabla de §5.2 con acciones admin; vive aquí también para que la zona privilegiada sea autocontenida. Encabezado de sección con franja izquierda de 3 px en `--sf-admin`.

---

## 6. Patrones de interacción

### 6.1 Formato de error único
Toda respuesta no-2xx con JSON `{ userMessage, technicalError }` se normaliza en el interceptor de axios a:

```js
{ status, userMessage, technicalError }
```

| Estado | Presentación |
|---|---|
| `400` | Alert `danger` sobre el formulario; si `technicalError` empieza con `Invalid request:` se intenta mapear `campo: mensaje` al input correspondiente |
| `401` | Cerrar sesión y volver a Acceso con "Su clave de API no es válida o fue revocada" |
| `403` | Alert `danger`: "Esta clave no tiene acceso a esta cuenta" (scope) o pantalla "Solo administradores" (admin) |
| `404` (cuenta) | Alert `info` con el `userMessage` y, si admin, botón "Conectar esta cuenta" |
| `429` | Alert `warning` con el `userMessage`; deshabilitar "Escanear" 60 s con cuenta regresiva |
| `500` | Alert `danger` con `userMessage` + detalle técnico |
| `503` | Pantalla completa "Servicio no disponible" |
| Red/timeout | Alert `danger`: "No se pudo contactar con el servicio" + botón "Reintentar" |

### 6.2 Conectar cuenta de Gmail (OAuth)
1. Admin pulsa "Conectar cuenta de Gmail" → `GET /auth/google/login` → `{ authUrl }`.
2. Se abre `authUrl` con `window.open` (popup 520×640). Si el navegador lo bloquea, se muestra el enlace como botón.
3. La UI muestra un estado "Esperando autorización en Google…" y consulta `GET /accounts` cada 3 s (máx. 10 min = TTL del `state`) hasta que aparece una cuenta nueva o se cierra el popup.
4. Éxito → toast "Cuenta conectada" y la fila nueva resaltada 2 s con `--sf-primary-soft`.
5. El enlace caduca a los 10 min: pasado ese tiempo se ofrece "Generar nuevo enlace".

### 6.3 Revelado de secreto (crear clave)
- `POST /admin/api-keys` → `201 { key, apiKey }`.
- `SecretRevealDialog`: la clave `sfg_…` en un bloque mono grande, botón "Copiar", Alert `warning` con el `userMessage` de la API ("Guárdela ahora: no se volverá a mostrar").
- El diálogo no se cierra con `Esc` ni clic fuera; el botón "Listo" se habilita tras copiar o marcar "Ya la guardé".
- La clave nunca se guarda en estado global ni en storage.

### 6.4 Descarga de PDF
- No se puede usar `<a href>` porque la API exige `x-api-key` en cabecera. Se usa `GET /download-pdf?accountEmail=&messageId=&attachmentId=&filename=` con `responseType: 'blob'`, y se dispara la descarga con un object URL; el nombre sale de `Content-Disposition`.
- Botón en estado loading mientras dura; error → toast `danger` (aquí sí toast, porque no bloquea la vista).
- Si la respuesta ya incluye `fileBase64` del PDF, se descarga directamente sin llamar al endpoint.

### 6.5 Escaneos largos
- Timeout específico para `/scan` y `/scan-sent` de al menos 10 min (el `timeout: 15000` global de `src/api/axios.js` cancelaría casi cualquier escaneo real).
- Durante el escaneo el formulario queda deshabilitado y se muestra ScanProgress en el área de resultados.
- Los resultados del último escaneo se conservan en memoria al cambiar de pestaña; aviso antes de lanzar otro que los reemplace.
- Respuestas grandes: cada factura trae `fileBase64`; no se re-renderiza la tabla con el base64 en props — se guarda aparte por `gmailAttachmentId`.

---

## 7. Accesibilidad

- Navegación completa por teclado; orden de foco = orden visual.
- Iconos solos siempre con `aria-label`; badges con texto, no solo color.
- Tablas con `<th scope>` y `aria-sort` en columnas ordenables.
- `ScanProgress` con `role="status"` y `aria-live="polite"`; Alerts de error con `role="alert"`.
- Objetivo táctil mínimo 44 px en móvil.
- Idioma del documento: `<html lang="es">`.

---

## 8. Voz y textos

- Español neutro, trato de **usted** (coherente con los `userMessage` de la API: "Conéctela primero…", "Guárdela ahora…").
- Verbos concretos en botones: "Escanear", "Conectar cuenta", "Desconectar", "Revocar", "Descargar PDF". Nunca "Aceptar"/"OK" en acciones destructivas.
- Sin jerga técnica en la superficie: "consulta avanzada" en vez de "query", "clave de API" en vez de "API key", "leído por IA" en vez de "Gemini".

| Contexto | Texto |
|---|---|
| Empty — Escanear sin ejecutar | "Elija una cuenta y una fecha para buscar facturas." |
| Empty — Escaneo sin resultados | "No se encontraron facturas con esos criterios. Pruebe con una fecha anterior o revise la lista de correos." |
| Empty — Claves | "Aún no hay claves de API. Cree una por cada sistema que vaya a consultar el servicio." |
| Badge PDF · IA (tooltip) | "Datos extraídos automáticamente del PDF. Revise los montos antes de usarlos." |
| Confirmar desconexión | "¿Desconectar {email}? El servicio dejará de poder leer esta bandeja hasta que se vuelva a conectar." |
| Confirmar revocación | "¿Revocar la clave «{name}»? Los sistemas que la usen dejarán de tener acceso de inmediato." |

---

## 9. Implementación en `apps/web`

Estado actual: template de Vite + React 19 (JS) con axios. Pasos para alinearlo con este sistema:

1. **Tokens:** reemplazar `src/index.css` por las variables de §3 y eliminar los estilos del template en `src/App.css`.
2. **Fuentes:** IBM Plex Sans / Mono desde Google Fonts en `index.html`; cambiar `lang="en"` → `lang="es"` y el `<title>` a "ServFacGmail".
3. **Cliente HTTP (`src/api/axios.js`):**
   - `Process.env.VITE_API_URL` no existe en el navegador → usar `import.meta.env.VITE_API_URL`.
   - Mover `src/.env` y `src/.env.example` a la raíz de `apps/web/` (Vite solo lee `.env` desde la raíz del proyecto).
   - Interceptor de request que añade `x-api-key` desde `sessionStorage`; interceptor de response que normaliza errores (§6.1).
4. **CORS:** la API rechaza orígenes de navegador por defecto. Añadir el origen del frontend a `CORS_ORIGINS` (p. ej. `http://localhost:5173` en desarrollo).
5. **Estructura de carpetas:** `api/routes/`, `components/`, `hooks/`, `layouts/`, `pages/`, `stores/`, `assets/css/`; el detalle y las reglas están en [`PLAN.md`](./PLAN.md#estructura-de-carpetas).
6. **Seguridad:** la clave maestra en un navegador es un riesgo. Para uso cotidiano, crear una clave por cliente con `allowedAccounts` acotado y reservar la maestra para tareas de administración puntuales.
