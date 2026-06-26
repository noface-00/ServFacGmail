# Gmail Invoice Scanner Service

Este es un microservicio autónomo y sin estado (stateless) diseñado para buscar correos de proveedores autorizados en Gmail, descargar sus archivos adjuntos (PDF/XML/ZIP), descomprimir archivos ZIP y extraer datos de facturas en XML.

---

## Estructura de Archivos

El código preparado en esta carpeta contiene:
- `package.json`: Definición de dependencias (`express`, `cors`, `googleapis`, `adm-zip`, `xml2js`).
- `tsconfig.json`: Configuración del compilador TypeScript.
- `src/index.ts`: Punto de entrada del servidor Express.
- `src/scanner.controller.ts`: Validador de endpoints.
- `src/scanner.service.ts`: Lógica principal del buscador en Gmail y del lector XML.

---

## Instrucciones de Instalación y Ejecución

Para iniciar este proyecto en un repositorio Git independiente, sigue estos pasos:

### 1. Inicializar el Proyecto
Copia el contenido de esta carpeta (`scratch/gmail-scanner-service/*`) a tu nuevo directorio de repositorio.

### 2. Instalar Dependencias
Abre una terminal en la carpeta del proyecto y ejecuta:
```bash
npm install
```

### 3. Configuración de Variables de Entorno
Crea un archivo `.env` en la raíz del proyecto para definir el puerto de escucha (por defecto 3005):
```env
PORT=3005
```

### 4. Ejecutar en Modo Desarrollo
Inicia el microservicio en modo de recarga automática ante cambios (dev mode):
```bash
npm run dev
```

El servidor estará listo y escuchando en:
`http://localhost:3005`

### 5. Compilar para Producción
Para compilar y correr el código optimizado en JavaScript:
```bash
npm run build
npm start
```

---

## Endpoint Principal

### `POST /scan`
Realiza la búsqueda de correos y la extracción de adjuntos.

**Request Body:**
```json
{
  "accessToken": "YA29.A0AR...",
  "refreshToken": "1//0g...",
  "clientId": "google-client-id...",
  "clientSecret": "google-client-secret...",
  "supplierEmails": ["proveedor1@mail.com", "proveedor2@mail.com"],
  "sinceDate": "2026-06-01T00:00:00.000Z"
}
```

**Response Body:**
Una lista de facturas encontradas con sus archivos codificados en `Base64` y datos parseados de ítems (si era XML).
