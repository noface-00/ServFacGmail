# STITCH.md — Guía de estilo y prompts para Google Stitch

Traducción de `DESIGN.md` a prompts listos para pegar en [Google Stitch](https://stitch.withgoogle.com). Los prompts están en inglés, porque Stitch los interpreta con más precisión; los textos visibles de la interfaz van en español, entre comillas, para que Stitch los copie tal cual.

## Cómo usarlo

1. Crea un proyecto en Stitch en modo **Web**.
2. Pega el **Prompt 0 (estilo base)** como primer mensaje. Genera la pantalla de referencia (el "kit de componentes") y ajústala hasta que te guste.
3. Para cada pantalla, pega el **bloque de estilo compacto** (§2) seguido del prompt de la pantalla. Stitch no siempre conserva el estilo entre pantallas, así que repetirlo evita que cambie de colores o de tipografía.
4. Genera **una pantalla por prompt**. Si algo falla, corrígelo con instrucciones cortas ("make the table denser", "use the teal primary color for the main button") en vez de reescribir todo el prompt.
5. Al final, exporta a Figma o a código y aplica los tokens de `DESIGN.md` §3 como variables CSS.

---

## 1. Prompt 0 — Estilo base y kit de componentes

```text
Design a web app UI kit page for "ServFacGmail", an internal accounting tool that scans Gmail inboxes for supplier invoices (XML and PDF) and shows the parsed data: supplier name, tax ID (RUC), invoice number, subtotal, VAT, total, line items. Users are accountants and admins. All UI text in Spanish.

Visual style:
- Calm, precise, data-dense, trustworthy. Think modern fintech back-office, not marketing. No gradients, no illustrations, no glassmorphism.
- Background #F7F8FA, surfaces (cards, tables, dialogs) #FFFFFF, muted surface #F1F3F6, borders #E2E5EA, input borders #C9CED6.
- Text #1B2230, secondary text #5B6474, subtle text #8A92A0.
- Primary color deep teal #0E6E64 (hover #0A5A52, soft background #E3F3F0). Use it only for the main action, links, focus rings and selected states.
- Semantic colors: success #1F7A3A (soft #E6F4EA), warning amber #9A5B00 (soft #FDF3E1), danger #B42318 (soft #FDECEA), info #1D5FA8 (soft #E7F0FB). Admin-only areas use violet #5B3CC4 (soft #EFEBFB).
- Typography: IBM Plex Sans for UI, IBM Plex Mono with tabular numbers for money amounts, tax IDs, invoice numbers and API keys. Base size 14px; table cells 13px; card titles 16px medium; page titles 20px semibold; KPI numbers 28px semibold mono.
- 4px spacing grid. Radius 4px for inputs and chips, 8px for buttons and cards, 12px for dialogs. Very subtle shadows (0 1px 2px rgba(16,24,40,.06)) on cards only.
- Line icons, 1.5px stroke, 16–20px (Lucide style).

Show these components on one page, labeled in small gray captions:
- Buttons: primary (teal fill), secondary (white with border), ghost, danger (red fill), admin (violet outline). Sizes 28/36/44px. Include a loading state with a spinner.
- Text input with label above, helper text below, and an error state with red message.
- Email chips input: chips "proveedor@empresa.com" with x buttons, one invalid chip in red, counter "3 / 200".
- Badges: "XML" (green), "PDF · IA" (amber), "ZIP" (gray), "Activa" (green), "Revocada" (red), "Todas las cuentas" (gray), "Admin" (violet).
- Alerts: info, success, warning, danger. Each has an icon, a bold title and a collapsible "Detalle técnico" row with monospace text and a "Copiar" button.
- A toast in the bottom right: "Cuenta desconectada correctamente."
- A compact data table with a sticky light-gray header, 44px rows, right-aligned monospace amounts.
- KPI stat cards: "Facturas encontradas 128", "Total USD 45.320,18", "Leídas por IA 12", "Fallidas 3" (the last one in red).
- An indeterminate progress bar with the text "Leyendo facturas… 01:42" and a "Cancelar" ghost button.
```

---

## 2. Bloque de estilo compacto (pegar antes de cada pantalla)

```text
Use the ServFacGmail style: data-dense fintech back-office, Spanish UI text. Background #F7F8FA, white cards with #E2E5EA borders, text #1B2230 / #5B6474. Primary deep teal #0E6E64 for the single main action and focus. Success #1F7A3A, warning #9A5B00, danger #B42318, info #1D5FA8, admin violet #5B3CC4. IBM Plex Sans 14px for UI; IBM Plex Mono with tabular numbers for amounts, tax IDs and keys. 8px radius on buttons and cards, 4px on inputs, 4px spacing grid, subtle shadows, line icons. No gradients or illustrations.

App shell: 56px top bar with the "ServFacGmail" wordmark on the left, a Gmail account selector in the center ("contabilidad@empresa.com" with a dropdown), and on the right a small green dot with "API en línea" and a user menu. Left sidebar 232px with sections: "Escanear" (sub-items "Recibidas", "Emitidas"), "Cuentas", and a separated "Administración" group marked with a violet "Admin" badge (sub-items "Cuentas de Gmail", "Claves de API"). Content max width 1280px with 24px padding.
```

---

## 3. Prompts por pantalla

### 3.1 Acceso

```text
Screen: login with API key. No app shell; centered card 400px wide on the #F7F8FA background.
Card content: "ServFacGmail" wordmark, title "Acceder al panel", helper text "Ingrese la clave de API que le entregó el administrador.", a password field labeled "Clave de API" with a show/hide eye icon and placeholder "sfg_…", and a full-width primary button "Entrar".
Below the card, small gray text: "La clave se guarda solo durante esta sesión del navegador."
Also show the error state variant: red alert inside the card "La clave no es válida o fue revocada."
```

### 3.2 Escanear — Recibidas (formulario + resultados)

```text
Screen: "Escanear facturas recibidas", inside the app shell, with "Escanear > Recibidas" active in the sidebar. Page title plus tabs "Recibidas" (active) and "Emitidas".

Two-column layout: left column 360px with the form card, right column with results.

Form card "Criterios de búsqueda":
- Select "Cuenta de Gmail" with value "contabilidad@empresa.com".
- Segmented control "Simple" (active) | "Consulta avanzada".
- Date input "Desde" with value "01/09/2026".
- Email chips input "Correos de proveedores" with chips "facturacion@proveedor1.com", "ventas@distribuidora.ec", "noreply@sri.gob.ec", counter "3 / 200", and a checkbox "Usar lista por defecto del servidor".
- Collapsible "Opciones avanzadas" (collapsed).
- Full-width primary button "Escanear".

Results column:
- Row of 4 KPI cards: "Facturas encontradas 128", "Total USD 45.320,18", "Leídas por IA 12" (amber accent), "Fallidas 3" (red accent).
- Warning alert: "Se alcanzó el límite de 500 correos por escaneo. Acote la fecha o la consulta para ver el resto."
- Toolbar: search input "Buscar proveedor, RUC o número…", a "Origen" filter, and a secondary button "Exportar CSV".
- Data table with columns: "Fecha emisión", "Proveedor" (name in bold with the RUC "1791234567001" below in small monospace gray), "N.º factura" (mono, e.g. "001-002-000012345"), "Subtotal", "IVA", "Total" (right-aligned mono, total bold), "Origen" (badge XML green or "PDF · IA" amber), and an actions column with icon buttons "Ver detalle" and "Descargar PDF". 8 realistic Ecuadorian supplier rows.
- Below the table, a collapsible red-bordered section "Fallidas (3)" listing filename, message ID in mono and the error text, e.g. "factura_0923.pdf — No se pudo extraer el total".
```

### 3.3 Escanear — estado de carga y vacío

```text
Same "Escanear facturas recibidas" screen, two variants side by side:
1. Loading: the form is disabled (grayed) and the "Escanear" button shows a spinner with "Escaneando…". The results area shows a card with an indeterminate teal progress bar, the text "Descargando adjuntos…", elapsed time "02:15", helper text "Los escaneos con muchos PDF pueden tardar varios minutos.", and a ghost button "Cancelar". Below it, 6 skeleton table rows.
2. Empty result: centered empty state with a line icon of an inbox, title "No se encontraron facturas", text "Pruebe con una fecha anterior o revise la lista de correos.", and a secondary button "Modificar criterios".
```

### 3.4 Escanear — Emitidas

```text
Screen: "Escanear facturas emitidas", identical layout to the received invoices screen, but the tab "Emitidas" is active, the chips field is labeled "Correos de clientes", and the table column "Proveedor" becomes "Cliente" with a "Enviado a" column showing the recipient email. Show the "Consulta avanzada" mode active: instead of date and chips, a monospace textarea labeled "Consulta de Gmail" with value "in:sent has:attachment after:2026/09/01", a counter "42 / 1000" and helper text "Al usar una consulta avanzada se ignoran la fecha y la lista de correos."
```

### 3.5 Detalle de factura (drawer)

```text
Screen: the received invoices results table dimmed in the background, with a right-side drawer 480px wide open.
Drawer header: supplier "Distribuidora Andina S.A.", invoice number "001-002-000012345" in mono, a large total "USD 1.284,50" in mono, an amber badge "PDF · IA" with the tooltip text "Datos extraídos automáticamente del PDF. Revise los montos antes de usarlos.", and a close X.
Sections with small uppercase gray labels:
- "Emisor": name, RUC "1791234567001" (mono).
- "Documento": issue date "12 sep 2026", access key (long 49-digit mono string, truncated with a copy icon).
- "Correo": subject "Factura electrónica 001-002-000012345", sender "facturacion@andina.ec", received "12 sep 2026, 10:42", file "factura_12345.pdf".
- "Ítems": compact table with "Descripción", "Cant.", "P. unitario", "Total" (4 rows), footer row "Suma de ítems USD 1.120,00", and a small amber warning "Los ítems no cuadran con el subtotal (USD 1.146,88)."
- An embedded PDF preview thumbnail.
Sticky footer: primary button "Descargar PDF", secondary "Cerrar".
```

### 3.6 Cuentas

```text
Screen: "Cuentas de Gmail" inside the app shell, with "Cuentas" active. Title, subtitle "Bandejas que el servicio puede leer.", and on the right a violet-outlined admin button "Conectar cuenta de Gmail" with a Google "G" icon.
Table with columns "Correo", "Conectada el", "Último token" (relative time like "hace 3 h"), and actions: secondary small button "Escanear" and a red ghost button "Desconectar" (with a small violet admin lock icon). 4 rows.
Below, a variant of the empty state: inbox-plug icon, "No hay cuentas conectadas", "Conecte una cuenta de Gmail para empezar a escanear facturas.", primary button "Conectar cuenta".
```

### 3.7 Conectar cuenta (flujo OAuth)

```text
Screen: the "Cuentas de Gmail" page with a centered modal dialog (12px radius) titled "Conectar cuenta de Gmail".
Content: a waiting state with a small teal spinner, text "Esperando autorización en Google…", helper "Se abrió una ventana de Google. Elija la cuenta y acepte los permisos de solo lectura.", a countdown "El enlace caduca en 09:12", and a link button "¿No se abrió la ventana? Abrir enlace".
Footer: ghost button "Cancelar".
Also show the success variant: green check icon, "Cuenta conectada", "ventas@empresa.com ya está disponible para escanear.", primary button "Listo"; and in the background table, the new row highlighted in soft teal #E3F3F0.
```

### 3.8 Confirmación destructiva (desconectar cuenta)

```text
Modal dialog over the accounts table: title "¿Desconectar contabilidad@empresa.com?", body "El servicio dejará de poder leer esta bandeja hasta que se vuelva a conectar. Las claves de API que dependan de ella recibirán un error.", a text input labeled "Escriba el correo para confirmar" with placeholder "contabilidad@empresa.com", and footer buttons: ghost "Cancelar" and red danger "Desconectar cuenta" (disabled until the email matches).
```

### 3.9 Administración — Claves de API

```text
Screen: "Claves de API" inside the app shell, with "Administración > Claves de API" active and the section marked with a 3px violet left stripe and a violet "Admin" badge next to the title. Subtitle "Cree una clave por cada sistema que consulte el servicio." Primary button "Crear clave" on the right, a toggle "Mostrar revocadas".
Table columns: "Nombre" (e.g. "ERP Contable", "Integración Odoo", "Script de cierre"), "Prefijo" (mono "sfg_a1b2…"), "Alcance" (badge "Todas las cuentas" or "2 cuentas" with a tooltip listing emails), "Creada", "Último uso" ("hace 5 min" or "Nunca"), "Estado" (badge "Activa" green or "Revocada" red), and a red ghost action "Revocar". One revoked row is shown at 60% opacity with no action.
```

### 3.10 Crear clave y revelado del secreto

```text
Two modal dialogs side by side:
1. "Crear clave de API": input "Nombre" (placeholder "Ej. ERP Contable", counter "0 / 100"), email chips input "Cuentas permitidas" with suggestions dropdown listing connected accounts, helper text "Déjelo vacío para dar acceso a todas las cuentas.", footer ghost "Cancelar" and primary "Crear clave".
2. "Clave creada": amber warning alert "Guárdela ahora: no se volverá a mostrar.", the full key "sfg_9f2c4e7a1b3d5f8e0a2c4e6b8d0f1a3c" in a large monospace box with a "Copiar" button, a checkbox "Ya guardé la clave en un lugar seguro", and a primary button "Listo" that is disabled until the checkbox is checked. No close X on this dialog.
```

### 3.11 Estados de error globales

```text
A single screen showing four stacked error examples within the app shell content area, each labeled with a small gray caption:
- "403": danger alert "Esta clave no tiene acceso a esta cuenta."
- "404": info alert "La cuenta de Gmail solicitada no está conectada." with an admin violet button "Conectar esta cuenta".
- "429": warning alert "Demasiadas solicitudes. Intente de nuevo más tarde." and a disabled "Escanear" button with "Disponible en 0:45".
- "500": danger alert "Ocurrió un error al escanear la bandeja de entrada." with the expanded "Detalle técnico" showing monospace text "Error: invalid_grant" and a "Copiar" button.
And a separate full-page state "Servicio no disponible" with a plug icon, text "No se pudo contactar con el servicio.", and a primary button "Reintentar".
```

### 3.12 Versión móvil

```text
Mobile version (390px wide) of the received invoices results screen in the ServFacGmail style. Top bar with hamburger menu, wordmark and the account selector as a compact chip. The form collapses into a "Criterios" button that opens a bottom sheet. KPI cards in a 2x2 grid. The table becomes a list of cards: each card shows the supplier name, the RUC in mono, the invoice number, the date, the total right-aligned in bold mono, the origin badge, and a "Descargar" button. Touch targets of at least 44px. 16px side padding, no horizontal scrolling.
```

---

## 4. Lista de verificación después de generar

- [ ] Hay un solo botón primario teal por pantalla.
- [ ] Montos, RUC, números de factura y claves están en monoespaciada y los montos alineados a la derecha.
- [ ] La zona de Administración se distingue con el violeta y el badge "Admin".
- [ ] Las etiquetas `XML` / `PDF · IA` aparecen en cada factura.
- [ ] Los textos están en español y tratan de "usted".
- [ ] Ningún color es el único indicador de estado: siempre hay texto o icono.
- [ ] Si Stitch cambió colores o fuentes, corrígelos al exportar usando los tokens de `DESIGN.md` §3.
