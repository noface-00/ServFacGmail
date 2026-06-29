# Gmail Invoice Scanner Service

Este es un microservicio autónomo y sin estado (stateless) diseñado para buscar correos de proveedores en Gmail, descargar sus archivos adjuntos (PDF/XML/ZIP), procesar los contenidos y extraer la información estructurada de las facturas (RUC/RUT del emisor, nombre del proveedor, total e ítems).

---

## Características Principales

*   **Búsqueda Inteligente en Gmail**: Filtra correos utilizando la API de Gmail por rango de fechas (`sinceDate`) y lista de correos de proveedores autorizados.
*   **Descompresión Automática**: Descarga adjuntos comprimidos (`.zip`) y extrae los archivos `.xml` y `.pdf` dentro de ellos.
*   **Parser XML Multi-Formato**: Lector nativo optimizado para los principales formatos de facturación electrónica de Latinoamérica:
    *   **Chile (DTE)**: Identificación de `<RUTEmisor>`, `<RznSoc>`, `<MntTotal>` y líneas de detalle.
    *   **Perú / Colombia (UBL)**: Extracción del proveedor (`cac:Party`), RUC (`PartyIdentification`), Razón Social (`RegistrationName`), Total Neto (`PayableAmount`) e ítems de compra (`cac:InvoiceLine`).
    *   **México (CFDI)**: Configurado para extraer atributos (`ignoreAttrs: false`) de `<cfdi:Emisor>` (Rfc/Nombre), Total e ítems (`cfdi:Concepto`).
    *   **Ecuador (SRI)**: Detección del nodo raíz `<factura>` y extracción de RUC/Razón Social desde `<infoTributaria>`, total desde `<importeTotal>` y productos desde `<detalles>`.
*   **Extractor PDF Inteligente (Google Gemini 1.5 Flash)**:
    *   Si se proporciona una API Key de Gemini, el microservicio envía los PDFs de forma segura usando un esquema estructurado estricto (`responseSchema`).
    *   Extrae con precisión milimétrica la información de los ítems, totales e identificadores tributarios, incluso si el PDF es solo una imagen escaneada.
*   **Arquitectura Centralizada y Flexible**: Permite que las credenciales de Google OAuth (`clientId`, `clientSecret`) y la API Key de Gemini se definan en las variables de entorno del servidor o se envíen dinámicamente en el cuerpo del request.

---

## Estructura de Archivos

*   `package.json`: Configuración del proyecto y dependencias (`express`, `cors`, `@google/generative-ai`, `googleapis`, `adm-zip`, `xml2js`).
*   `tsconfig.json`: Configuración del compilador TypeScript.
*   `src/index.ts`: Punto de entrada del servidor Express.
*   `src/scanner.controller.ts`: Controlador del endpoint principal y validación de parámetros.
*   `src/scanner.service.ts`: Lógica principal del scanner, integración con Gmail API, extractor ZIP y parseadores XML/PDF.

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
GEMINI_API_KEY=tu-gemini-api-key
```

### 3. Ejecutar en Modo Desarrollo
Inicia el servidor con recarga automática ante cambios:
```bash
npm run dev
```
El servidor estará listo en `http://localhost:3005`.

### 4. Compilar para Producción
```bash
npm run build
npm start
```

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

1. Modifica tu archivo `.env` agregando las siguientes variables:
   ```env
   # Credenciales OAuth de Google Cloud Console
   GOOGLE_CLIENT_ID=tu-google-client-id
   GOOGLE_CLIENT_SECRET=tu-google-client-secret

   # Token de Acceso OAuth2 temporal (puedes obtener uno desde Google OAuth2 Playground)
   GMAIL_ACCESS_TOKEN=ya29.a0ar...
   GMAIL_REFRESH_TOKEN=1//0g... (Opcional)

   # API Key de Google Gemini
   GEMINI_API_KEY=tu-gemini-api-key

   # Configuración de búsqueda de pruebas
   SUPPLIER_EMAILS=proveedor1@mail.com,proveedor2@mail.com
   SINCE_DATE=2026-06-01T00:00:00.000Z (Opcional)
   ```
2. Asegúrate de compilar el proyecto TypeScript:
   ```bash
   npm run build
   ```
3. Ejecuta el script de prueba real:
   ```bash
   node scratch/test_real_scanner.js
   ```

---

## Especificación del API

### Seguridad y Autenticación
Los endpoints `/scan` y `/download-pdf` requieren autenticación. Debe enviarse la clave de API configurada en la variable de entorno `SERVICE_API_KEY` mediante:
* El encabezado HTTP `x-api-key: <clave_api>` (Recomendado).
* El parámetro en query string `apiKey=<clave_api>`.

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
Busca correos de proveedores autorizados en Gmail, descarga los archivos adjuntos (XML/ZIP/PDF) y extrae la información estructurada de las facturas. Es un servicio completamente **stateless**.

* **Request Body (JSON):**
  ```json
  {
    "accessToken": "YA29.A0AR...",
    "refreshToken": "1//0g... (Opcional)",
    "clientId": "google-client-id... (Opcional si está en .env)",
    "clientSecret": "google-client-secret... (Opcional si está en .env)",
    "geminiApiKey": "gemini-api-key... (Opcional si está en .env)",
    "supplierEmails": ["proveedor1@mail.com", "proveedor2@mail.com"], // Opcional (por defecto toma de SUPPLIER_EMAILS en .env)
    "sinceDate": "2026-06-01T00:00:00.000Z" // Requerido (ISO string o fecha para búsqueda)
  }
  ```
  *Nota: El token de acceso (`accessToken`) también se puede enviar mediante el encabezado `Authorization: Bearer <token>`.*

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

### 3. `GET /download-pdf` y `POST /download-pdf`
Descarga el archivo PDF binario correspondiente a un adjunto de factura en Gmail. Si el adjunto está comprimido dentro de un archivo `.zip`, el endpoint lo descomprimirá automáticamente en memoria y extraerá el PDF.

* **Parámetros (enviados como Query Params en `GET` o en el cuerpo JSON en `POST`):**
  * `messageId` (string, requerido): ID del mensaje de Gmail.
  * `attachmentId` (string, requerido): ID del archivo adjunto en Gmail.
  * `accessToken` (string, opcional): Token de acceso OAuth2. También se puede enviar en el header `Authorization: Bearer <token>`.
  * `clientId` (string, opcional): ID del cliente OAuth. Opcional si ya está en el `.env`.
  * `clientSecret` (string, opcional): Secreto del cliente OAuth. Opcional si ya está en el `.env`.
  * `filename` (string, opcional): Nombre específico del archivo PDF dentro del archivo ZIP (si hay varios). Si se omite, se tomará el primer PDF que se encuentre.

* **Ejemplo de uso con cURL (`GET`):**
  ```bash
  curl -G "http://localhost:3005/download-pdf" \
    --data-urlencode "messageId=18f5043bf7e997a3" \
    --data-urlencode "attachmentId=ANGjdJ84..." \
    -H "x-api-key: TU_SERVICE_API_KEY" \
    -H "Authorization: Bearer YA29.A0AR..." \
    -o factura.pdf
  ```

* **Ejemplo de uso con cURL (`POST`):**
  ```bash
  curl -X POST "http://localhost:3005/download-pdf" \
    -H "Content-Type: application/json" \
    -H "x-api-key: TU_SERVICE_API_KEY" \
    -H "Authorization: Bearer YA29.A0AR..." \
    -d '{
      "messageId": "18f5043bf7e997a3",
      "attachmentId": "ANGjdJ84..."
    }' \
    -o factura.pdf
  ```

* **Respuesta (`200 OK`):**
  Retorna el archivo binario del PDF listo para su descarga, configurando automáticamente las cabeceras correspondientes:
  * `Content-Type: application/pdf`
  * `Content-Disposition: attachment; filename="nombre_de_archivo.pdf"`

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
     * `GEMINI_API_KEY`: Tu API Key de Google Gemini (para extracción inteligente de PDFs).
     * `SUPPLIER_EMAILS`: (Opcional) Emails de proveedores autorizados por defecto.

4. **Configurar Puertos y Redirección**:
   - En la sección de **Ports**, asegúrate de exponer el puerto configurado (ej. `3005`). Dokploy redirigirá automáticamente el tráfico HTTPS de tu dominio asignado al puerto `3005` del contenedor.

5. **Desplegar**:
   - Haz clic en **Deploy**. Dokploy clonará el repositorio, ejecutará el build multi-stage definido en el `Dockerfile` (compilando el TypeScript y descartando las dependencias de desarrollo para mantener la imagen ligera), y arrancará el servicio.
