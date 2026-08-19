# PLANO DE OBRA
## Eje B — Trazabilidad por Registro y Revertir — SIDIU OFFLINE

| Hoja de control | |
|---|---|
| Proyecto | SIDIU OFFLINE (Dirección de Inspección Urbana — Clorinda) |
| Redactado por (Ingeniero) | opencode — sesión 2026-08-07 |
| Ejecuta (Maestro Mayor de Obra) | opencode + operador del sistema |
| Versión | 1.0 |
| Estado | Borrador para revisión del operador (NO aprobado todavía) |
| Stack | Node.js + Express + SQLite (sqlite3), frontend vanilla JS |
| Cambios de DB | Ninguno (la tabla `auditoria` ya existe con `datos_anteriores` / `datos_nuevos`) |

---

## 1. Objetivo de la obra

Complementar el **Eje A** (prevención visual) con **reparación**: si un operador comete el error de editar una intimación en vez de generar la siguiente instancia (o carga un dato mal), el administrador debe poder **ver exactamente qué cambió y quién lo hizo**, y **revertir esa edición** para restaurar el estado anterior correcto.

Esto resuelve el problema original que motivó todo el trabajo: *"no hay forma de revisar qué se cargó mal ni de corregirlo"*.

## 2. Alcance

**Incluye:**
- Conectar la **auditoría existente** (`middleware/auditoria.js` → `registrarAuditoria`) a las operaciones de **intimaciones** y **expedientes** (hoy solo está conectada a usuarios/auth): registrar `crear`, `editar`, `cambio_estado` y `eliminar` con snapshot de datos.
- **Historial por registro**: en la tabla de intimaciones/expedientes, botón "historial" (admin) que abre un modal con la línea de tiempo del registro (quién, qué, cuándo, qué cambió).
- **Revertir**: desde el historial, restaurar el estado anterior de una edición puntual, con salvaguardas.
- El registro de "quién modifica cada registro" (firma técnica) queda **satisfecho por esta misma obra** a nivel de datos; la firma técnica visible por registro se construye luego sobre esta base (o con `PLAN_HISTORIAL_POR_REGISTRO.md`).

**Fuera de alcance (v1):**
- Revertir `crear` (dar de baja un registro) y `eliminar` (restaurar un registro borrado): solo se auditan, no se revierten.
- Reconstruir la **cadena de escalamiento** (si se borró/duplicó una instancia, el revert no recrea la secuencia).
- Auditar los demás módulos (infracciones, comercios, vendedores, reclamos, etc.): fase posterior, misma técnica.
- Firma técnica visible en el formulario (`PLAN_HISTORIAL_POR_REGISTRO.md`): queda como obra siguiente, no se hace acá.

## 3. Regla de negocio (ley de la obra)

1. **Toda acción de escritura** sobre intimaciones/expedientes queda en `auditoria`: `crear` (sin `datos_anteriores`), `editar`/`cambio_estado` (con snapshot completo anterior y nuevo), `eliminar` (con snapshot anterior).
2. **Revertible**: solo `editar` y `cambio_estado`. **No** `crear` ni `eliminar`.
3. **Salvaguarda de coincidencia**: una entrada es revertible solo si el estado actual del registro **coincide** con su `datos_nuevos` (es decir, nadie tocó el registro después de esa edición). Si difiere, el botón se deshabilita con aviso.
4. **Revertir restaura el snapshot tal cual** (todos los campos editables de `datos_anteriores`), incluido el `estado`. **No se recalcula el estado** en el revert: el snapshot es la verdad verificada por el operador; si hace falta re-vencer una intimación, se edita después. Esto mantiene el revert predecible y auditable.
5. **El revert se audita** como nueva entrada (`accion='editar'`, `descripcion` = `REVERSIÓN de auditoría #<id> — se restauró el estado anterior`). Queda registro de quién revirtió y cuándo.
6. El botón **historial** y **revertir** son **solo `admin_total`** (igual que la vista de auditoría).

## 4. Frentes de trabajo (planos)

### PLANO A — Conectar auditoría a Intimaciones (`controllers/intimacionesController.js`)

Agregar `const { registrarAuditoria } = require('../middleware/auditoria');` al inicio. El usuario ya viene en `req.usuario` (lo setea `verifyToken`); `ip = req.ip || null`.

| Función | Líneas actuales | Cambio |
|---|---|---|
| `crearIntimacion` | 186 | Tras el INSERT, registrar `crear` con `modulo:'intimaciones'`, `registro_id` (el `insertId`), `datos_nuevos`: el objeto de datos insertado. |
| `actualizarIntimacion` | 310 | **Antes** de ejecutar el UPDATE: `SELECT * FROM intimaciones WHERE id = ?` → `datos_anteriores` (fila completa). Después del UPDATE: re-leer la fila o armar el snapshot con `{...anterior, ...updates}` aplicando las reglas de auto-estado (las mismas del bloque 386-438) → `datos_nuevos`. `accion='editar'`. |
| `eliminarIntimacion` | 460 | Antes del DELETE: `SELECT *` → `datos_anteriores`. Registrar `eliminar`. |

**Nota de snapshot**: `datos_anteriores`/`datos_nuevos` son columnas TEXT con JSON. `registrarAuditoria` ya hace `JSON.stringify` internamente (no incluir foto BLOB: `foto_inicial`/`foto_actual` son rutas de archivo, seguras de serializar).

### PLANO B — Conectar auditoría a Expedientes (`controllers/expedientesController.js`)

Mismo patrón que Plano A:

| Función | Líneas actuales | Cambio |
|---|---|---|
| `crearExpediente` | 135 | Registrar `crear` (eliminar el `console.log('Usuario:', req.usuario)` de la línea 138 si queda). |
| `actualizarExpediente` | 230 | Snapshot anterior + nuevo, `accion='editar'`. |
| `cambiarEstado` | 356 | `accion='cambio_estado'`, `datos_anteriores` = `{estado: anterior}`, `datos_nuevos` = `{estado: nuevo}`. |
| `eliminarExpediente` | 401 | Snapshot anterior, `accion='eliminar'`. |

**Regla**: reutilizar la lista de campos permitidos de cada `actualizar` para limitar qué campos se restauran en el revert (evita restaurar `id`/timestamps).

### PLANO C — Endpoints de historial y revert (`controllers/auditoriaController.js` + `routes/auditoriaRoutes.js`)

1. **`obtenerHistorialRegistro`** (nuevo en `auditoriaController`): `GET /api/auditoria/registro/:modulo/:id` → todas las entradas de ese registro (`WHERE modulo = ? AND registro_id = ? ORDER BY fecha DESC`), **incluyendo** `datos_anteriores`/`datos_nuevos` parseados. Devuelve además un flag `revertible` por entrada:
   - `false` si `accion` es `crear`/`eliminar`, o si `datos_anteriores` es null, o si el registro actual **no coincide** con `datos_nuevos`.
   - La coincidencia se evalúa en el controller leyendo la fila actual de la tabla del módulo.
2. **`revertir`** (nuevo): `POST /api/auditoria/:id/revertir`, **solo admin** (la ruta ya usa `requireAdmin` en `auditoriaRoutes.js`).
   - Carga la entrada de auditoría. Valida `accion ∈ {editar, cambio_estado}` y `datos_anteriores` no null.
   - **Re-valida la salvaguarda en el servidor** (nunca confiar solo en el flag del frontend): el registro actual debe coincidir con `datos_nuevos`; si no, `400` con mensaje "El registro fue modificado después de esa edición; no se puede revertir."
   - Restaura los campos de `datos_anteriores` sobre la tabla del módulo (whitelist de campos editables). **No toca `id`**.
   - Registra la reversión en auditoría (ver §3.5).
   - Responde con el registro restaurado.
3. **Orden de rutas** (importante en `auditoriaRoutes.js`): declarar `GET /registro/:modulo/:id` y `POST /:id/revertir` **antes** de `GET /:id`, o `registro` matcheará `:id`. Estructura final:

```js
router.get('/resumen', auditoriaController.obtenerResumen);          // ya existe
router.get('/registro/:modulo/:id', auditoriaController.obtenerHistorialRegistro); // nuevo
router.post('/:id/revertir', auditoriaController.revertir);          // nuevo
router.get('/:id', auditoriaController.obtenerDetalle);              // ya existe (queda al final)
```

**Dispatch por módulo en el revert**: mapa `{ intimaciones: { tabla, camposEditables }, expedientes: { tabla, camposEditables } }`. Si el `modulo` no está en el mapa → `400 "Módulo no soportado para revertir"`.

### PLANO D — Frontend historial + revert (`public/js/intimaciones.js`, `public/js/expedientes.js`, `public/css/sistema-v2.css`)

1. **Botón "historial"** (icono reloj) por fila, posición **5º** después de eliminar, **solo admin**, visible en todas las filas (incluso reiteradas). Color neutro (gris azulado) para no confundir con los semánticos del Eje A.
2. **Modal de historial** (estructura reutilizable, puede vivir en un `public/js/historial.js` compartido):
   - Llama a `GET /api/auditoria/registro/:modulo/:id`.
   - Lista cronológica descendente: fecha, usuario, acción (con etiqueta legible: Crear/Editar/Cambio de estado/Eliminar), descripción.
   - Para entradas `editar`/`cambio_estado`: resumen de campos que cambiaron (diff simple de `datos_anteriores` vs `datos_nuevos`) y botón **"Revertir"**.
   - Botón **"Revertir" deshabilitado + tooltip** cuando `revertible === false` (explica el motivo: no aplica, o el registro cambió después).
3. **Confirmación previa al revert**: mostrar qué se va a restaurar (campos + estado) y pedir confirmación explícita antes de `POST /api/auditoria/:id/revertir`.
4. **Tras revertir**: refrescar la tabla (y el modal) para reflejar el registro restaurado.
5. CSS en `sistema-v2.css`, consistente con el estilo de botones del Eje A.

## 5. Orden de ejecución

A → B → C → D → verificación (§6) → commits (§7) → prueba en rama por el operador → decisión de merge.

**Dependencia con Eje A**: el Eje A toca los botones de `intimaciones.js`. Ejecutar y **commitar A antes de empezar B** (o trabajar B sobre A mergeado a `main`) para no pisar los cambios de botones del Plano D.

## 6. Verificación

**Automática:**
- `node --check controllers/intimacionesController.js controllers/expedientesController.js controllers/auditoriaController.js routes/auditoriaRoutes.js public/js/intimaciones.js public/js/expedientes.js`

**Escenarios manuales (admin):**
1. Crear una intimación → en el historial aparece "Crear" con el operador y fecha.
2. Editar un campo → el historial muestra "Editar" con el diff del campo cambiado y botón Revertir activo.
3. Revertir esa edición → el registro vuelve a los valores anteriores; el historial muestra la entrada de REVERSIÓN y quién la hizo.
4. Editar de nuevo el registro (simular un cambio posterior) → la entrada anterior ahora tiene Revertir **deshabilitado** con aviso.
5. `cambio_estado` en expedientes → etiqueta correcta y revertible.
6. Usuario de carga: **no ve** el botón historial ni el endpoint de revertir (`requireAdmin`).
7. Reintentar un revert por API sobre un registro ya modificado → `400` con mensaje claro.
8. Vistas móviles (`mobile-cards.js`): no se tocan; si la card renderiza botones, el de historial queda solo en escritorio (admin).

## 7. Commits

1. `feat(auditoria): registrar crear/editar/eliminar/cambio_estado en intimaciones y expedientes`
2. `feat(auditoria): endpoint de historial por registro y revertir con salvaguarda`
3. `feat(ui): modal de historial y boton revertir en intimaciones y expedientes`

## 8. Despliegue

`git pull` + reiniciar servidor. **No hay migraciones de base de datos** (la tabla `auditoria` ya existe con las columnas necesarias; el `CHECK` de `accion` no se toca porque el revert se registra como `editar` con descripción explícita). Despliegue a la segunda máquina: igual que siempre.

## 9. Riesgos

- **`accion` con CHECK constraint**: si en el futuro se quisiera una acción distinta (`revertir`), habría que migrar el esquema. Por eso v1 registra el revert como `editar` con `descripcion` explícita — cero migración.
- **Pérdida de coincidencia en entornos multiusuario**: dos admins editando el mismo registro — la salvaguarda de coincidencia bloquea el revert obsoleto (comportamiento deseado).
- **Snapshots pesados**: guardar la fila completa es aceptable para estos volúmenes; si creciera, se limita el snapshot a campos editables.
- **Fallos de auditoría**: `registrarAuditoria` ya captura errores sin romper la operación principal (no lanza). Nota: si falla el registro del revert, el revert igual ocurrió pero sin traza; riesgo aceptado, se loguea en consola.
- **Conflicto con Eje A** en `intimaciones.js`: mitigado por el orden de ejecución (§5).

## 10. Estado y precedencia

- Complementa a **Eje A** (`PLAN_EJE_A_FLUJO_ESCALAMIENTO.md`, prevención) con reparación.
- **Cumple de forma subyacente** el objetivo de `PLAN_HISTORIAL_POR_REGISTRO.md` (firma técnica "quién modifica cada registro") a nivel de datos; la UI de firma en el formulario queda como obra separada sobre esta misma base.
- El `endpoint` `GET /api/auditoria/:id` (`obtenerDetalle`) ya existe pero el frontend de auditoría no lo usa; el historial por registro usa un endpoint nuevo dedicado (`/registro/:modulo/:id`) en vez de forzar N llamadas de detalle.
