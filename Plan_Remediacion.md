# Plan de Remediacion Tecnica

## Objetivo
Reducir riesgo operativo y de seguridad del sistema, corrigiendo primero los defectos que pueden generar acceso indebido, fuga de informacion o fallas funcionales visibles.

## Alcance
Incluye backend (`server.js`, `routes/`, `controllers/`, `middleware/`) y frontend (`public/js/`) segun los hallazgos detectados.

## Prioridad P0 (critico, ejecutar primero)

### 1. Corregir autorizacion en Barrios
- Problema: las rutas de alta, edicion y baja de barrios no exigen rol admin.
- Archivos:
  - `routes/barriosRoutes.js`
- Remediacion:
  - Agregar `requireAdmin` en `POST /`, `PUT /:id`, `DELETE /:id`.
  - Mantener `GET /` con `verifyToken` para consulta general.
- Criterio de aceptacion:
  - Usuario con rol `consulta` o `carga` recibe `403` al intentar modificar barrios.
  - Usuario `admin_total` puede operar normalmente.

### 2. Eliminar logging de datos sensibles
- Problema: se registra `req.body` completo para todas las rutas (incluye password/token).
- Archivos:
  - `server.js`
- Remediacion:
  - Quitar log crudo de body.
  - Reemplazar por logging minimo: metodo, ruta, status, duracion, requestId.
  - En caso de debug, aplicar redaccion de campos sensibles (`password`, `token`, `authorization`).
- Criterio de aceptacion:
  - Ningun log contiene contrasenas o datos personales completos.

### 3. Unificar identidad autenticada (`req.usuario`)
- Problema: inconsistencia `req.user` vs `req.usuario` provoca `usuario_creador_id` nulo.
- Archivos:
  - `controllers/reclamosController.js`
  - `middleware/auth.js` (referencia de contrato)
- Remediacion:
  - Usar de forma consistente `req.usuario` en todos los controladores.
- Criterio de aceptacion:
  - Al crear reclamo autenticado se persiste `usuario_creador_id` correctamente.

## Prioridad P1 (alta)

### 4. Corregir orden de rutas en Relevamientos
- Problema: `/:id` se declara antes de `/estadisticas` y captura esa ruta.
- Archivos:
  - `routes/relevamientosRoutes.js`
- Remediacion:
  - Mover `/estadisticas` antes de `/:id`.
- Criterio de aceptacion:
  - `GET /api/relevamientos/estadisticas` responde estadisticas.
  - `GET /api/relevamientos/:id` sigue funcionando con IDs validos.

### 5. Normalizar base URL de API en frontend
- Problema: algunos modulos usan `http://localhost:3000/api` hardcodeado.
- Archivos:
  - `public/js/login.js`
  - `public/js/expedientes.js`
- Remediacion:
  - Cambiar a `const API_URL = '/api';`.
  - Opcional: centralizar configuracion en modulo unico.
- Criterio de aceptacion:
  - Login y expedientes funcionan detras de proxy, dominio propio y HTTPS sin cambios de codigo.

### 6. Evitar exposicion de mensajes internos de error
- Problema: se devuelve `error.message` al cliente en busqueda global.
- Archivos:
  - `controllers/busquedaController.js`
- Remediacion:
  - Responder mensaje generico al cliente.
  - Registrar detalle tecnico solo en servidor.
- Criterio de aceptacion:
  - La respuesta HTTP no expone errores internos de SQL o stack.

## Prioridad P2 (media)

### 7. Corregir manejo de 404 para API
- Problema: `app.get('*')` puede devolver HTML para rutas API GET inexistentes.
- Archivos:
  - `server.js`
- Remediacion:
  - Definir primero un 404 explicito para `/api/*`.
  - Dejar `app.get('*')` solo para frontend.
- Criterio de aceptacion:
  - Toda ruta `/api/...` inexistente devuelve JSON 404 consistente.

### 8. Aplicar control de usuario activo por request
- Problema: `requireActive` existe pero no se aplica; token puede quedar desactualizado.
- Archivos:
  - `middleware/auth.js`
  - `routes/*.js`
- Remediacion:
  - Aplicar `requireActive` tras `verifyToken` en rutas protegidas, o validar estado activo consultando DB en middleware.
- Criterio de aceptacion:
  - Usuario desactivado pierde acceso inmediatamente (sin esperar expiracion de token).

### 9. Ajustar CORS para entornos reales
- Problema: configuracion `origin: '*'` con `credentials: true` es inconsistente.
- Archivos:
  - `server.js`
- Remediacion:
  - Configurar lista blanca por `CORS_ORIGIN` (uno o varios dominios).
  - Si se usan credenciales, no usar `*`.
- Criterio de aceptacion:
  - Requests cross-origin permitidos solo desde origenes autorizados.

## Calidad y pruebas (transversal)

### 10. Agregar pruebas minimas de regresion
- Archivos sugeridos:
  - `tests/` (nuevo)
  - `package.json` (scripts)
- Cobertura minima recomendada:
  - Autorizacion por rol en barrios.
  - `/api/relevamientos/estadisticas` no colisiona con `/:id`.
  - Creacion de reclamo persiste `usuario_creador_id`.
  - 404 de API devuelve JSON.
- Herramientas sugeridas:
  - `jest` + `supertest` (o alternativa equivalente).

## Plan de ejecucion (1 semana)

### Dia 1
- P0.1, P0.2, P0.3 (seguridad y consistencia base).

### Dia 2
- P1.4, P1.5, P1.6 (rutas y hardcode de API).

### Dia 3
- P2.7, P2.8, P2.9 (endurecimiento de plataforma).

### Dia 4-5
- Punto 10 (tests), ajustes finales y smoke test manual.

## Checklist de cierre
- [ ] Endpoints criticos con autorizacion por rol validada.
- [ ] Sin logs de datos sensibles.
- [ ] Sin hardcode de `localhost` en frontend.
- [ ] Respuestas de error sin leak de detalles internos.
- [ ] 404 de API consistente en JSON.
- [ ] Pruebas de regresion ejecutando en CI/local.

## Riesgos residuales
- Dependencia de calidad de datos en DB (migraciones no verificadas en este paso).
- Falta de estrategia de rotacion/revocacion de JWT (recomendado para fase posterior).

## Siguiente fase recomendada
- Estandarizar validaciones de entrada con `express-validator`.
- Incorporar auditoria de acciones administrativas (quien, cuando, que cambio).
- Definir politica de observabilidad (logs estructurados, correlacion y retencion).
