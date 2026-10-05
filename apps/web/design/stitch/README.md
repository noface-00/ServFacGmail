# Referencia de Stitch

HTML y capturas exportados del proyecto de Google Stitch `11193141380827308496`. Son **solo referencia visual**: no se importan desde `src/`. Al pasar una pantalla a React se copian los bloques de marcado (clases Tailwind) a componentes y se reemplazan los datos de ejemplo por props.

| Archivo | Pantalla en Stitch | ID |
|---|---|---|
| `acceso.html` / `.jpg` | Acceso - Clave de API | `7bd47151e2cd45f1a5d6c58d9e49fca1` |
| `escanear-recibidas.html` / `.png` | Escanear - Facturas Recibidas | `9cdf1f8fb11d4e288b68ebc21dc914bd` |
| `detalle-factura.html` / `.png` | Detalle de Factura (Drawer) | `b2dcabfa99da46829f9bbca31ba859aa` |
| `cuentas-oauth.html` / `.png` | Cuentas de Gmail y Conexión OAuth | `d519020c25df43ce860d889af0e34945` |
| `admin-claves-api.html` / `.png` | Administración - Claves de API | `6b9acbdf9ab0417b9947351579664cc1` |

## Elementos inventados por Stitch que NO se implementan

La API no los respalda; se omiten al integrar (o se registran como mejora futura en `PLAN.md`):

- **Escanear:** botones "Subir XML manual", "Reintentar SRI" y "Descartar" en fallidas; tarjeta "Validación SRI Automática"; texto "Indexación incremental vía OAuth2 IMAP"; paginación del servidor (la API devuelve todo en una respuesta, se pagina en cliente); campanita de notificaciones; avatar de usuario (la sesión es una clave de API, no una persona); pie "Versión 2.4.1 · Sincronizado"; migas "Sesión Activa SRI v2.4".
- **Login:** la pantalla "Registro - Crear Cuenta" (`279b50da97e74b888807a5879da53033`) no tiene endpoint; las claves las crea un administrador.

Revisar el resto de pantallas con el mismo criterio al integrarlas: si un control no corresponde a un endpoint de `DESIGN.md` §2, no se implementa.
