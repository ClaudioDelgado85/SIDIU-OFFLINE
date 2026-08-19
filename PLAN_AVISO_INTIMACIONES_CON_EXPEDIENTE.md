# PLANO DE OBRA
## Aviso de Expediente en Intimaciones Vencidas — SIDIU OFFLINE

| Hoja de control | |
|---|---|
| Proyecto | SIDIU OFFLINE (Dirección de Inspección Urbana — Clorinda) |
| Redactado por (Ingeniero) | opencode — sesión 2026-08-05 |
| Ejecuta (Maestro Mayor de Obra) | opencode + operador del sistema |
| Versión | 1.0 |
| Estado | Aprobado para ejecución |
| Stack | Node.js + Express + SQLite (sqlite3), frontend vanilla JS |
| Cambios de DB | 2 índices (micro-migración) |

---

## 1. Objetivo de la obra

Que el sistema **avise** cuando una intimación vencida (o por vencer) tiene un **expediente registrado para el mismo DNI** con fecha posterior o igual a la intimación. Hoy ambos módulos están desconectados: el expediente se carga "en silencio" y la intimación sigue figurando vencida. **Solo se avisa — nunca se modifica el estado de la intimación automáticamente.**

## 2. Alcance

**Incluye:**
- Badge 📁 en la lista de intimaciones (filas vencidas/próximas con expediente).
- Panel nuevo en el dashboard "Intimaciones vencidas con expediente".
- Alerta al crear un expediente: "Este contribuyente tiene N intimación(es) vencida(s)".
- 2 índices por DNI (reparan el `migracion_indices.sql` que nunca se aplicó en SQLite).

**Fuera de alcance:**
- Auto-marcado de cumplimiento (explícitamente descartado).
- Refactor del patrón "cargar todas las intimaciones" (se documenta como riesgo futuro, no se toca).

## 3. Regla de negocio (ley de la obra)

Un expediente se vincula a una intimación si:
1. `expedientes.dni = intimaciones.dni`
2. `DATE(expedientes.fecha) >= DATE(intimaciones.fecha)` (se presentó después de intimar)
3. La intimación NO está `cumplida`, `reiterada` ni `infraccionado`
4. Si hay varios expedientes, gana el más reciente por `fecha DESC, id DESC`

## 4. Frentes de trabajo (planos)

### PLANO A — Base de datos: índices por DNI
**Archivo nuevo `database/migracion_indices_dni.sql`:**
```sql
-- Cruce intimaciones <-> expedientes por DNI
CREATE INDEX IF NOT EXISTS idx_intimaciones_dni ON intimaciones(dni);
CREATE INDEX IF NOT EXISTS idx_expedientes_dni ON expedientes(dni);
```
**Script de ejecución nuevo `scripts/migrar_indices_dni.js`** (mismo patrón que `seed_rubro_comercial.js`): abre `database/gestion_municipal.db`, ejecuta las 2 sentencias, imprime OK.
**También** agregar ambas sentencias `CREATE INDEX IF NOT EXISTS` al final de `database/schema_sqlite.sql` (instalaciones nuevas).

### PLANO B — Backend: `controllers/intimacionesController.js` (función `obtenerIntimaciones`)
Agregar 1 query batch + Map (patrón existente del `latestPerGroup`):
```sql
SELECT e.id, e.dni, e.numero_expediente, e.fecha, e.motivo,
       c.label AS motivo_label
FROM expedientes e
LEFT JOIN catalogos c ON c.categoria = 'motivo_expediente' AND c.valor = e.motivo
```
En el `map` sobre `allIntimaciones`, calcular `expediente_info` (filtrar `fecha >= fecha_intimacion` por string `YYYY-MM-DD`, ordenar `fecha DESC, id DESC`, tomar el primero) y devolver `{ id, numero, fecha, motivo, motivo_label }` o `null`. Incluirlo en el objeto retornado: `expediente_info`.

### PLANO C — Backend: `controllers/dashboardController.js` (función `obtenerResumenDashboard`)
**Panel** (dedup a último expediente por intimación):
```sql
SELECT i.id, i.nombre_apellido, i.dni, i.tipo, i.numero_intimacion,
       i.fecha AS fecha_intimacion, i.plazo_dias,
       e.numero_expediente, e.fecha AS fecha_expediente, e.motivo,
       c.label AS motivo_label
FROM intimaciones i
JOIN expedientes e ON e.dni = i.dni AND DATE(e.fecha) >= DATE(i.fecha)
LEFT JOIN catalogos c ON c.categoria = 'motivo_expediente' AND c.valor = e.motivo
WHERE i.dio_cumplimiento = 0
  AND i.estado NOT IN ('reiterada','infraccionado')
  AND DATE_ADD(i.fecha, INTERVAL i.plazo_dias DAY) < CURDATE()
  AND e.id = (SELECT e2.id FROM expedientes e2
              WHERE e2.dni = i.dni AND DATE(e2.fecha) >= DATE(i.fecha)
              ORDER BY e2.fecha DESC, e2.id DESC LIMIT 1)
ORDER BY e.fecha DESC
LIMIT 10
```
> `DATE_ADD`/`CURDATE` son convertidos a SQLite por `translateQuery` (config/database.js). `DATE()` es válida en ambos motores.
> Agregar al JSON de respuesta: `tablas.intimaciones_expediente`.

### PLANO D — Backend: `controllers/expedientesController.js` (función `crearExpediente`)
Después del INSERT exitoso, verificar:
```sql
SELECT COUNT(*) as total FROM intimaciones
WHERE dni = ?
  AND dio_cumplimiento = 0
  AND estado NOT IN ('reiterada','infraccionado')
  AND DATE_ADD(fecha, INTERVAL plazo_dias DAY) <= CURDATE()
```
Si `total > 0`, incluir en la respuesta: `warning: { intimaciones_abiertas: total }`.

### PLANO E — Frontend: badge en intimaciones
**`public/js/intimaciones.js`** en `mostrarIntimaciones()`, bajo el bloque `celda-sub` (DNI), insertar:
```js
${item.expediente_info && (item.estado === 'vencida' || item.estado === 'proxima_vencer')
  ? `<div class="celda-expte" title="Expediente Nº ${item.expediente_info.numero} · ${formatearFecha(item.expediente_info.fecha)}">📁 Expte. ${item.expediente_info.numero} · ${item.expediente_info.motivo_label || item.expediente_info.motivo} (${formatearFecha(item.expediente_info.fecha)})</div>`
  : ''}
```
**`css/sistema-v2.css`** (hoja compartida, ya cargada por intimaciones.html): agregar
```css
.celda-expte { font-size:11px; color:var(--si-amber); font-weight:600; margin-top:4px; }
```
> `var(--si-amber)` ya se usa en el módulo.

### PLANO F — Frontend: panel dashboard
**`public/dashboard.html`**: tras la sección de Reclamos (línea ~107), nueva sección:
```html
<section class="dash-panel" style="max-width:100%;">
  <div class="panel-top">
    <h2 class="panel-title"><span class="dot dot-primary"></span> Intimaciones vencidas con expediente</h2>
    <a href="intimaciones.html" class="panel-link">Ver intimaciones →</a>
  </div>
  <div class="panel-content" id="panelIntExpediente">
    <div class="dash-loading"><div class="loader"></div></div>
  </div>
</section>
```
**`public/js/dashboard.js`**: en `cargarDashboard`, llamar `renderIntExpediente(data.data.tablas.intimaciones_expediente)`; nueva función `renderIntExpediente(items)` replicando el patrón de `renderReclamos` (tabla escritorio + cards móvil). Columnas: Nombre/DNI, Intimación (nº + fecha), Expte Nº + fecha + motivo. Click → `intimaciones.html`.

### PLANO G — Frontend: aviso al crear expediente
**`public/js/expedientes.js`** en `guardarExpediente`, justo después de `mostrarMensajeExito(...)`:
```js
if (data.warning && data.warning.intimaciones_abiertas > 0) {
  mostrarError(`⚠️ Este contribuyente tiene ${data.warning.intimaciones_abiertas} intimación(es) vencida(s) sin cumplir. Verificá el cumplimiento en el módulo Intimaciones.`);
}
```
(No bloquea el guardado — `mostrarError` es `alert()`).

## 5. Orden de ejecución (maestro mayor)

1. Plano A → 2. Plano B → 3. Plano C → 4. Plano D → 5. Plano E → 6. Plano F → 7. Plano G → 8. Verificación → 9. Commits → 10. Deploy.

## 6. Verificación (control de calidad)

- `node --check` sobre los 3 controllers y 3 JS de frontend tocados.
- Escenarios manuales:
  1. Persona con intimación vencida → crear expediente con su DNI → **alerta** aparece.
  2. Módulo Intimaciones → **badge 📁** en la fila vencida.
  3. Dashboard → **panel** lista a la persona.
  4. Persona sin expediente → sin badge ni panel.
  5. Expediente con fecha **anterior** a la intimación → **NO** debe avisar.
  6. Expediente con DNI distinto → no debe avisar.

## 7. Criterios de aceptación

- El aviso se muestra en los 3 puntos (badge, panel, alerta) sin tocar el estado real de la intimación.
- `git pull` + 1 script de índices + restart = deploy completo en la segunda máquina.

## 8. Commits propuestos

- `chore(db): indices por dni para cruce intimaciones-expedientes`
- `feat(intimaciones): badge de expediente relacionado en vencidas`
- `feat(dashboard): panel intimaciones vencidas con expediente`
- `feat(expedientes): avisar intimaciones vencidas del contribuyente al crear`

## 9. Bitácora de despliegue (obra en sitio — segunda máquina)

```
git pull
node scripts/migrar_indices_dni.js      # 1 sola vez
# reiniciar servidor
```

## 10. Riesgos

- **Falsos positivos por DNI** (persona con varios locales): aceptable porque es solo aviso, sin auto-cambio de estado.
- **Zonas horarias en fechas**: se compara string `YYYY-MM-DD`, inmune a UTC.
- **SQLite vs MySQL**: solo sintaxis compatible con `translateQuery`.
- **Carga**: agregada por petición = 1 query batch (O(I+E), ~<5 ms a volumen actual). El cuello de botella real futuro sigue siendo el patrón "cargar todas las intimaciones" (fuera de alcance, documentado).
