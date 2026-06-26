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

### `POST /scan`
Busca correos de proveedores y extrae sus adjuntos de factura.

#### **Request Body**
```json
{
  "accessToken": "YA29.A0AR...",
  "refreshToken": "1//0g...",
  "clientId": "google-client-id... (Opcional si está en .env)",
  "clientSecret": "google-client-secret... (Opcional si está en .env)",
  "geminiApiKey": "gemini-api-key... (Opcional si está en .env)",
  "supplierEmails": ["proveedor1@mail.com", "proveedor2@mail.com"],
  "sinceDate": "2026-06-01T00:00:00.000Z"
}
```

#### **Response Body**
Retorna un arreglo JSON con los metadatos de los correos, los archivos codificados en `Base64` y el JSON estructurado en `parsedData`:
```json
[
  {
    "gmailMessageId": "18f5043bf7e997a3",
    "gmailAttachmentId": "ANGjdJ84...",
    "filename": "factura_123.pdf",
    "mimeType": "application/pdf",
    "fileBase64": "JVBERi0xLjQK...",
    "emailSubject": "Factura de Compra Repuestos",
    "emailDate": "2026-06-25T12:00:00.000Z",
    "senderEmail": "proveedor1@mail.com",
    "parsedData": {
      "supplierRuc": "76123456-7",
      "supplierName": "Distribuidora de Repuestos SpA",
      "total": 119000,
      "items": [
        {
          "nombre": "Filtro de Aceite Heavy Duty",
          "cantidad": 5,
          "precioUnitario": 20000
        }
      ]
    }
  }
]
```
