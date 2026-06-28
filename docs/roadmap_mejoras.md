# Plan Consolidado de Mejoras: Gmail Invoice Scanner Service

Este documento detalla el plan de mejoras estructurado en 3 fases de acuerdo a su prioridad, urgencia e impacto en producción. También registra el estado actual de implementación de cada punto.

---

## Fase 1 — Crítico (Estabilidad y Seguridad)
*Objetivo: Garantizar la integridad de los datos y evitar fugas de información o consumo ilimitado de recursos antes de exponer el servicio a volumen real.*

| ID | Mejora | Descripción / Por qué es urgente | Estado |
| :--- | :--- | :--- | :---: |
| **1** | **Paginación en `messages.list`** | Evita la pérdida silenciosa de facturas cuando hay más de 100 correos (límite por defecto de la API) coincidentes con la consulta en el rango de búsqueda. | **Listo (Completado)** |
| **2** | **Tope de Seguridad + Flag `truncated`** | Protege el servicio de timeouts ante búsquedas demasiado amplias introduciendo un límite de `MAX_MESSAGES_PER_SCAN = 500` y retornando `truncated: true` para indicar que existen más resultados. | **Listo (Completado)** |
| **3** | **Surfacing de Errores (`fallidas`)** | Evita tragar errores de descarga o parseo silenciosamente. Devuelve una lista de objetos `fallidas` detallando `messageId`, `filename` y `error` para que el caller conozca la integridad del lote. | **Listo (Completado)** |
| **4** | **`requireApiKey` Fallo Cerrado (Fail-Closed)** | Si la variable de entorno `SERVICE_API_KEY` no está configurada, el servicio responde inmediatamente con un error HTTP `503 Service Unavailable` en lugar de omitir la validación. | **Listo (Completado)** |

---

## Fase 2 — Importante (Robustez y Escalabilidad)
*Objetivo: Optimizar la operación del servicio bajo cargas reales, facilitar el diagnóstico de errores y flexibilizar la configuración.*

| ID | Mejora | Detalle Técnico | Estado |
| :--- | :--- | :--- | :---: |
| **5** | **Validación Cruzada en Gemini** | Validar matemáticamente que la suma de `items` e `iva` coincida aproximadamente con el `total` extraído por la IA. De no coincidir, marcar el resultado con `needsReview: true` para alertar al Manager. | *Pendiente* |
| **6** | **Retry con Backoff Exponencial** | Implementar lógica de reintento ante fallos temporales (como errores `429 Too Many Requests` o `500 Internal Server Error` de Gmail o Gemini) para recuperar llamadas fallidas automáticamente. | *Pendiente* |
| **7** | **Correlation ID por Scan** | Propagar un identificador único de petición (`correlationId`) desde CarMora / Manager hacia este servicio para unificar y rastrear los logs a través de todo el flujo distribuido. | *Pendiente* |
| **8** | **Test de Paginación Multi-Página** | Agregar pruebas unitarias robustas que verifiquen el funcionamiento del bucle de paginación recursiva para evitar regresiones silenciosas en futuras actualizaciones de código. | **Listo (Completado)** |
| **9** | **Modelo de Gemini Configurable** | Mover el identificador del modelo (actualmente fijo como `gemini-3.5-flash`) a una variable de entorno (`GEMINI_MODEL`) para permitir actualizarlo dinámicamente sin requerir redespliegues. | *Pendiente* |

---

## Fase 3 — Eficiencia y Monitoreo (Optimización)
*Objetivo: Incrementar la eficiencia operativa de red/cuota y preparar el servicio para grandes escalas de tráfico.*

| ID | Mejora | Detalle Técnico | Estado |
| :--- | :--- | :--- | :---: |
| **10** | **Filtro de Extensión en Query de Gmail** | Modificar la búsqueda en Gmail para usar `has:attachment {filename:pdf filename:xml filename:zip}`. Esto evita traer y evaluar mensajes con adjuntos no soportados (firmas, logos). | **Listo (Completado)** |
| **11** | **Métrica de Fallback XML vs Gemini** | Registrar e informar el porcentaje de facturas resueltas de forma gratuita con el parseador XML vs. las resueltas a través de la IA de Gemini, facilitando el análisis de costos operativos. | *Pendiente* |
| **12** | **Concurrencia Controlada (Tope por Buzón)** | Si bien el flujo secuencial actual previene el error 429 de concurrencia de Gmail (límite no documentado de 50 peticiones simultáneas), a mayor volumen se puede paralelizar usando límites de concurrencia fija (~30-40). | *Pendiente* |

---

## Resumen de Progreso

Actualmente, el servicio ha resuelto por completo la **Fase 1** (Crítica), asegurando una base firme para producción. Adicionalmente, se han adelantado elementos estratégicos de las Fases 2 y 3 (tests de regresión de paginación y optimización de query nativa de Gmail).

> [!NOTE]
> Todos los cambios completados cuentan con sus correspondientes pruebas unitarias y de integración pasando con éxito en Jest (`npm test`).
