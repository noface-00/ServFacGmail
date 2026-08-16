# Gmail Invoice Scanner Service

Este es un microservicio diseñado para buscar correos de proveedores en Gmail, descargar sus archivos adjuntos (PDF/XML/ZIP), procesar los contenidos y extraer la información estructurada de las facturas (RUC/RUT del emisor, nombre del proveedor, total e ítems). El servicio gestiona internamente el ciclo de vida completo de las cuentas de Gmail conectadas (autorización OAuth, almacenamiento cifrado y renovación de tokens en PostgreSQL), por lo que los llamadores solo necesitan identificar la cuenta a usar por su email.

---

## Características Principales

*   **Búsqueda Inteligente en Gmail**: Filtra correos utilizando la API de Gmail por rango de fechas (`sinceDate`) y lista de correos autorizados (escaneando tanto correos recibidos en `from` como enviados en `to` a esas direcciones).
*   **Descompresión Automática**: Descarga adjuntos comprimidos (`.zip`) y extrae los archivos `.xml` y `.pdf` dentro de ellos.
*   **Parser XML Multi-Formato**: Lector nativo optimizado para los principales formatos de facturación electrónica de Latinoamérica:
    *   **Chile (DTE)**: Identificación de `<RUTEmisor>`, `<RznSoc>`, `<MntTotal>` y líneas de detalle.
    *   **Perú / Colombia (UBL)**: Extracción del proveedor (`cac:Party`), RUC (`PartyIdentification`), Razón Social (`RegistrationName`), Total Neto (`PayableAmount`) e ítems de compra (`cac:InvoiceLine`).
    *   **México (CFDI)**: Configurado para extraer atributos (`ignoreAttrs: false`) de `<cfdi:Emisor>` (Rfc/Nombre), Total e ítems (`cfdi:Concepto`).
    *   **Ecuador (SRI)**: Detección del nodo raíz `<factura>` y extracción de RUC/Razón Social desde `<infoTributaria>`, total desde `<importeTotal>` y productos desde `<detalles>`.
*   **Extractor PDF Inteligente (Google Gemini 1.5 Flash)**:
    *   Si se proporciona una API Key de Gemini, el microservicio envía los PDFs de forma segura usando un esquema estructurado estricto (`responseSchema`).
    *   Extrae con precisión milimétrica la información de los ítems, totales e identificadores tributarios, incluso si el PDF es solo una imagen escaneada.
*   **Gestión de Cuentas Gmail vía OAuth**: El propio servicio implementa el flujo completo de autorización de Google (`/auth/google/login` y `/auth/google/callback`), persiste los tokens de cada cuenta conectada en PostgreSQL (cifrados con AES-256-GCM) y los renueva automáticamente cuando expiran, sin intervención del llamador.
*   **Multi-Cuenta**: Soporta múltiples cuentas de Gmail conectadas simultáneamente, identificadas por su email (`accountEmail`) al momento de escanear o descargar adjuntos.

---

## Estructura de Archivos

*   `package.json`: Configuración del proyecto y dependencias (`express`, `cors`, `@google/genai`, `googleapis`, `adm-zip`, `xml2js`, `prisma`).
*   `tsconfig.json`: Configuración del compilador TypeScript.
*   `prisma/schema.prisma`: Modelo `GmailAccount` (cuentas de Gmail conectadas) y sus migraciones.
*   `prisma.config.ts`: Configuración de Prisma (ruta del schema, migraciones y `DATABASE_URL`).
*   `src/index.ts`: Punto de entrada del servidor Express y definición de rutas.
*   `src/scanner.controller.ts`: Controlador de `/scan` y `/download-pdf`, validación de parámetros.
*   `src/scanner.service.ts`: Lógica principal del scanner, integración con Gmail API, extractor ZIP y parseadores XML/PDF.
*   `src/accounts.controller.ts`: Controlador del flujo OAuth y de administración de cuentas conectadas.
*   `src/accounts.service.ts`: Lógica de conexión, persistencia y renovación de tokens de cuentas de Gmail.
*   `src/crypto.util.ts`: Cifrado/descifrado AES-256-GCM de los tokens almacenados.
*   `src/oauth-state.ts`: Firma y verificación del parámetro `state` (protección CSRF del callback OAuth).
*   `src/prisma.ts`: Cliente de Prisma (singleton) usado por `accounts.service.ts`.

---

## Instalación y Configuración

### 1. Clonar e Instalar Dependencias
```bash
npm install
```

### 2. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto basándote en el archivo `.env.example`:
```env
PORT=3005
GOOGLE_CLIENT_ID=tu-google-client-id
GOOGLE_CLIENT_SECRET=tu-google-client-secret
GOOGLE_REDIRECT_URI=http://localhost:3005/auth/google/callback
GEMINI_API_KEY=tu-gemini-api-key
SERVICE_API_KEY=tu-clave-de-servicio

# Postgres donde se persisten las cuentas de Gmail conectadas
DATABASE_URL=postgresql://usuario:password@localhost:5432/gmail_scanner

# Clave de 32 bytes (64 caracteres hex) usada para cifrar los tokens en la base de datos
TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
```
`GOOGLE_REDIRECT_URI` debe coincidir exactamente con el URI de redirección registrado en Google Cloud Console para las credenciales OAuth del proyecto.

### 3. Aplicar las Migraciones de la Base de Datos
Con `DATABASE_URL` apuntando a una instancia de Postgres accesible, aplica el schema de Prisma:
```bash
npx prisma migrate dev
```

### 4. Ejecutar en Modo Desarrollo
Inicia el servidor con recarga automática ante cambios:
```bash
npm run dev
```
El servidor estará listo en `http://localhost:3005`.

### 5. Compilar para Producción
```bash
npm run build
npm start
```
Al iniciar en producción (ver `Dockerfile`), las migraciones pendientes se aplican automáticamente con `prisma migrate deploy` antes de arrancar el servidor.

---

## Utilidad de Pruebas Locales (PDF/Gemini)

Para probar la extracción de datos de PDFs usando Gemini sin tener que levantar el servidor Express ni conectar tu cuenta de Gmail, puedes ejecutar el script de utilidades local:
```bash
node scratch/test_gemini.js <ruta/al/archivo/factura.pdf>
```
*Nota: Este script leerá la API Key directamente de tu archivo `.env`.*

---

## Pruebas con la API Real (Gmail + Gemini)

Para realizar pruebas completas de escaneo de bandeja de entrada de Gmail y parseo (XML/PDF) utilizando las APIs reales y credenciales cargadas desde tu archivo `.env`, puedes seguir estos pasos:

1. Conecta una cuenta de Gmail siguiendo el flujo descrito en [Conexión de cuentas de Gmail (OAuth)](#conexión-de-cuentas-de-gmail-oauth) y anota el email conectado.
2. Modifica tu archivo `.env` agregando las siguientes variables:
   ```env
   # Email de la cuenta de Gmail ya conectada mediante /auth/google/login
   TEST_ACCOUNT_EMAIL=compras@empresa.com

   # API Key de Google Gemini
   GEMINI_API_KEY=tu-gemini-api-key

   # Configuración de búsqueda de pruebas
   SUPPLIER_EMAILS=proveedor1@mail.com,proveedor2@mail.com
   SINCE_DATE=2026-06-01T00:00:00.000Z (Opcional)
   ```
3. Asegúrate de compilar el proyecto TypeScript:
   ```bash
   npm run build
   ```
4. Ejecuta el script de prueba real:
   ```bash
   node scratch/test_real_scanner.js
   ```

---

## Especificación del API

### Seguridad y Autenticación
Todos los endpoints, salvo `GET /health` y `GET /auth/google/callback`, requieren autenticación. Debe enviarse la clave de API configurada en la variable de entorno `SERVICE_API_KEY` mediante:
* El encabezado HTTP `x-api-key: <clave_api>` (Recomendado).
* El parámetro en query string `apiKey=<clave_api>`.

`GET /auth/google/callback` es la excepción: lo invoca el navegador del usuario final tras redirigir desde Google, por lo que se protege mediante el parámetro `state` firmado por el propio servicio en vez de la API key.

---

El servicio expone los siguientes endpoints:

### 1. `GET /health`
Verifica el estado de salud y disponibilidad del servicio (no requiere API Key).

* **Respuesta (`200 OK`):**
  ```json
  {
    "status": "ok",
    "service": "gmail-scanner-service"
  }
  ```

---

### 2. `POST /scan`
Busca correos de proveedores y clientes autorizados en Gmail (tanto recibidos como enviados a las direcciones especificadas), descarga los archivos adjuntos (XML/ZIP/PDF) y extrae la información estructurada de las facturas. La cuenta de Gmail a usar debe estar previamente conectada (ver [Conexión de cuentas de Gmail (OAuth)](#conexión-de-cuentas-de-gmail-oauth)); el servicio resuelve y renueva internamente sus tokens.

* **Request Body (JSON):**
  ```json
  {
    "accountEmail": "compras@empresa.com", // Requerido: email de una cuenta de Gmail ya conectada
    "geminiApiKey": "gemini-api-key... (Opcional si está en .env)",
    "supplierEmails": ["proveedor1@mail.com", "proveedor2@mail.com"], // Opcional (direcciones de correo a escanear en los campos 'from' o 'to'; por defecto toma de SUPPLIER_EMAILS en .env)
    "sinceDate": "2026-06-01T00:00:00.000Z" // Requerido (ISO string o fecha para búsqueda)
  }
  ```
  *Si `accountEmail` no corresponde a una cuenta conectada, responde `404` indicando que debe conectarse primero mediante `/auth/google/login`.*

* **Response Body (`200 OK`):**
  Retorna un objeto JSON con el listado de facturas procesadas y la cantidad de las mismas:
  ```json
  {
    "facturas": [
      {
        "messageId": "18f5043bf7e997a3",
        "attachmentId": "ANGjdJ84...",
        "claveAcceso": "0926202601...", // Identificador único de la factura (o messageId si no tiene XML)
        "supplierRuc": "76123456-7",
        "supplierName": "Distribuidora de Repuestos SpA",
        "numeroFactura": "001-002-000123456",
        "fechaEmision": "2026-06-20",
        "subtotal": 100000,
        "iva": 19000,
        "total": 119000,
        "moneda": "USD",
        "items": [
          {
            "nombre": "Filtro de Aceite Heavy Duty",
            "cantidad": 5,
            "precioUnitario": 20000,
            "total": 100000
          }
        ]
      }
    ],
    "count": 1,
    "fallidas": [],
    "truncated": false
  }
  ```

---

### 3. `POST /scan-sent`
Busca en los correos **enviados** (carpeta Enviados) desde la cuenta de Gmail conectada, para detectar **facturas emitidas** a clientes. Descarga los archivos adjuntos (XML/ZIP/PDF) y extrae la información estructurada, igual que `/scan`, pero filtrando por destinatario (`to:`) en vez de remitente. La cuenta de Gmail a usar debe estar previamente conectada (ver [Conexión de cuentas de Gmail (OAuth)](#conexión-de-cuentas-de-gmail-oauth)).

* **Request Body (JSON):**
  ```json
  {
    "accountEmail": "ventas@empresa.com", // Requerido: email de una cuenta de Gmail ya conectada
    "geminiApiKey": "gemini-api-key... (Opcional si está en .env)",
    "clientEmails": ["cliente1@mail.com", "cliente2@mail.com"], // Opcional (direcciones de correo destinatarias a filtrar con 'to:'; por defecto toma de CLIENT_EMAILS en .env)
    "sinceDate": "2026-06-01T00:00:00.000Z" // Requerido (ISO string o fecha para búsqueda)
  }
  ```
  *Si `accountEmail` no corresponde a una cuenta conectada, responde `404` indicando que debe conectarse primero mediante `/auth/google/login`.*

* **Response Body (`200 OK`):**
  Mismo shape que `/scan`, pero cada factura incluye `recipientEmail` (el cliente al que se envió) en vez de un `senderEmail` de proveedor:
  ```json
  {
    "facturas": [
      {
        "messageId": "18f5043bf7e997a3",
        "attachmentId": "ANGjdJ84...",
        "claveAcceso": "0926202601...",
        "supplierName": "Mi Empresa SpA",
        "numeroFactura": "001-002-000123456",
        "fechaEmision": "2026-06-20",
        "total": 119000,
        "moneda": "USD",
        "recipientEmail": "cliente1@mail.com",
        "items": []
      }
    ],
    "count": 1,
    "fallidas": [],
    "truncated": false
  }
  ```

---

### 4. `GET /download-pdf` y `POST /download-pdf`
Descarga el archivo PDF binario correspondiente a un adjunto de factura en Gmail. Si el adjunto está comprimido dentro de un archivo `.zip`, el endpoint lo descomprimirá automáticamente en memoria y extraerá el PDF.

* **Parámetros (enviados como Query Params en `GET` o en el cuerpo JSON en `POST`):**
  * `messageId` (string, requerido): ID del mensaje de Gmail.
  * `attachmentId` (string, requerido): ID del archivo adjunto en Gmail.
  * `accountEmail` (string, requerido): Email de una cuenta de Gmail ya conectada.
  * `filename` (string, opcional): Nombre específico del archivo PDF dentro del archivo ZIP (si hay varios). Si se omite, se tomará el primer PDF que se encuentre.

* **Ejemplo de uso con cURL (`GET`):**
  ```bash
  curl -G "http://localhost:3005/download-pdf" \
    --data-urlencode "messageId=18f5043bf7e997a3" \
    --data-urlencode "attachmentId=ANGjdJ84..." \
    --data-urlencode "accountEmail=compras@empresa.com" \
    -H "x-api-key: TU_SERVICE_API_KEY" \
    -o factura.pdf
  ```

* **Ejemplo de uso con cURL (`POST`):**
  ```bash
  curl -X POST "http://localhost:3005/download-pdf" \
    -H "Content-Type: application/json" \
    -H "x-api-key: TU_SERVICE_API_KEY" \
    -d '{
      "messageId": "18f5043bf7e997a3",
      "attachmentId": "ANGjdJ84...",
      "accountEmail": "compras@empresa.com"
    }' \
    -o factura.pdf
  ```

* **Respuesta (`200 OK`):**
  Retorna el archivo binario del PDF listo para su descarga, configurando automáticamente las cabeceras correspondientes:
  * `Content-Type: application/pdf`
  * `Content-Disposition: attachment; filename="nombre_de_archivo.pdf"`

---

## Conexión de cuentas de Gmail (OAuth)

Antes de poder usar `/scan`, `/scan-sent` o `/download-pdf` con un `accountEmail`, esa cuenta de Gmail debe conectarse una vez mediante el flujo OAuth expuesto por el propio servicio.

### Flujo completo

1. **Manager/CarMora inicia la conexión**: llama a `GET /auth/google/login` con `x-api-key`, y recibe la URL de consentimiento de Google.
2. **El usuario final autoriza el acceso**: Manager abre esa URL en el navegador del usuario dueño de la cuenta de Gmail a conectar; el usuario acepta los permisos solicitados (solo lectura del correo, `gmail.readonly`).
3. **Google redirige al callback**: `GET /auth/google/callback` recibe el `code` y el `state`, intercambia el código por tokens, obtiene el email de la cuenta y persiste sus tokens cifrados en la base de datos.
4. **La cuenta queda disponible**: a partir de ese momento, `POST /scan`, `/scan-sent` y `/download-pdf` pueden usar esa cuenta indicando su email en `accountEmail`.

### 5. `GET /auth/google/login`
Genera la URL de autorización de Google. Requiere `x-api-key`.

* **Respuesta (`200 OK`):**
  ```json
  { "authUrl": "https://accounts.google.com/o/oauth2/v2/auth?..." }
  ```

### 6. `GET /auth/google/callback`
Endpoint al que Google redirige tras el consentimiento del usuario. No requiere `x-api-key`; se protege mediante el parámetro `state`. Responde una página HTML simple indicando el resultado (éxito, cancelación, enlace expirado o error).

### 7. `GET /accounts`
Lista las cuentas de Gmail conectadas (nunca expone tokens). Requiere `x-api-key`.

* **Respuesta (`200 OK`):**
  ```json
  {
    "accounts": [
      { "email": "compras@empresa.com", "connectedAt": "2026-07-01T10:00:00.000Z", "updatedAt": "2026-08-10T09:00:00.000Z" }
    ],
    "count": 1
  }
  ```

### 8. `DELETE /accounts/:email`
Desconecta una cuenta de Gmail (elimina sus tokens de la base de datos). Requiere `x-api-key`.

* **Respuesta (`200 OK`):**
  ```json
  { "userMessage": "Cuenta desconectada correctamente.", "email": "compras@empresa.com" }
  ```
  Responde `404` si la cuenta indicada no está conectada.

---

## Despliegue en Dokploy

Este servicio está totalmente preparado para ser desplegado en **Dokploy** (una plataforma autohospedada basada en Docker) mediante el uso del `Dockerfile` multi-stage incluido.

### Pasos para el Despliegue:

1. **Crear la aplicación en Dokploy**:
   - En tu panel de Dokploy, ve a **Projects**, selecciona tu proyecto (o crea uno nuevo) y crea una nueva **Application**.
   - Conecta tu cuenta de GitHub/GitLab y selecciona el repositorio `ServFacGmail` y la rama de despliegue (por ejemplo, `main`).

2. **Configurar el tipo de Build**:
   - En la sección **Build Configuration** de la aplicación, selecciona **Dockerfile** como el método de compilación.
   - Asegúrate de dejar la ruta del Dockerfile como `./Dockerfile` (la raíz del proyecto).

3. **Configurar Variables de Entorno**:
   - Ve a la pestaña **Environment** en la configuración de la aplicación de Dokploy.
   - Registra las siguientes variables de entorno requeridas:
     * `PORT`: `3005` (o el puerto en el que prefieras que escuche el contenedor).
     * `SERVICE_API_KEY`: Tu clave secreta generada para proteger el acceso a los endpoints del servicio.
     * `GOOGLE_CLIENT_ID`: Tu ID de cliente OAuth de Google.
     * `GOOGLE_CLIENT_SECRET`: Tu secreto de cliente OAuth de Google.
     * `GOOGLE_REDIRECT_URI`: URL pública y exacta de `/auth/google/callback` (ej. `https://tu-dominio.com/auth/google/callback`), registrada también en Google Cloud Console.
     * `DATABASE_URL`: Cadena de conexión a la instancia de PostgreSQL donde se persisten las cuentas conectadas.
     * `TOKEN_ENCRYPTION_KEY`: Clave de 32 bytes en hex (`openssl rand -hex 32`) para cifrar los tokens en la base de datos.
     * `GEMINI_API_KEY`: Tu API Key de Google Gemini (para extracción inteligente de PDFs).
     * `SUPPLIER_EMAILS`: (Opcional) Emails de proveedores autorizados por defecto (usado por `/scan`).
     * `CLIENT_EMAILS`: (Opcional) Emails de clientes autorizados por defecto (usado por `/scan-sent`).

   Al arrancar, el contenedor aplica automáticamente las migraciones pendientes de Prisma (`prisma migrate deploy`) antes de iniciar el servidor.

4. **Configurar Puertos y Redirección**:
   - En la sección de **Ports**, asegúrate de exponer el puerto configurado (ej. `3005`). Dokploy redirigirá automáticamente el tráfico HTTPS de tu dominio asignado al puerto `3005` del contenedor.

5. **Desplegar**:
   - Haz clic en **Deploy**. Dokploy clonará el repositorio, ejecutará el build multi-stage definido en el `Dockerfile` (compilando el TypeScript y descartando las dependencias de desarrollo para mantener la imagen ligera), y arrancará el servicio.
