# PLANO DE OBRA
## Reordenamiento de Botones de Intimaciones — SIDIU OFFLINE

| Hoja de control | |
|---|---|
| Proyecto | SIDIU OFFLINE (Dirección de Inspección Urbana — Clorinda) |
| Redactado por (Ingeniero) | opencode — sesión 2026-08-06 |
| Ejecuta (Maestro Mayor de Obra) | opencode + operador del sistema |
| Versión | 1.0 |
| Estado | Aprobado para ejecución (rama de prueba `reordenamiento-botones-intimaciones`) |
| Stack | Node.js + Express + SQLite (sqlite3), frontend vanilla JS |
| Cambios de DB | Ninguno |

---

## 1. Objetivo de la obra

Evitar el **error humano de operador novato**: al escalar una intimación, presionar **"editar"** en vez de **"generar siguiente instancia"**, lo que modifica la instancia en lugar de crear la siguiente, sin que luego haya forma de revisar qué se cargó mal.

La causa no es el código sino **lo que el operador ve**: los botones de fila son grises, todos iguales, y el orden (editar antes que nueva instancia) invita al clic equivocado. La solución es **prevención visual**: colores semánticos permanentes, nuevo orden de botones y restricción admin-only en instancias reiteradas.

## 2. Alcance

**Incluye:**
- Reordenar botones de acción en la tabla de intimaciones: **nueva instancia (1º) → generación de infracción (2º) → editar (3º) → eliminar (4º)**.
- Colores permanentes con icono blanco (los SVG usan `fill="currentColor"`): nueva instancia verde, infracción rojo oscuro, editar naranja, eliminar rojo.
- En filas **reiteradas**: los usuarios de carga **no ven ningún botón**; `admin_total` ve **solo editar y eliminar** (nunca nueva instancia ni infracción sobre una instancia superada).

**Fuera de alcance:**
- Backend, API y base de datos: **cero cambios**.
- Eje B (trazabilidad/revertir con auditoría): en pausa, el operador lo decidirá aparte.
- Vista móvil (`mobile-cards.js`): las cards son solo lectura, no renderizan estos botones; no se tocan.
- Botón nuevo "Ver detalle": explícitamente descartado por el operador.

## 3. Regla de negocio (ley de la obra)

1. Orden visual de botones por fila: **flecha (nueva instancia) → rayo (infracción) → lápiz (editar) → papelera (eliminar)**.
2. Colores semánticos permanentes: nueva instancia verde, infracción rojo oscuro, editar naranja, eliminar rojo. Icono siempre blanco.
3. Una fila con `estado === 'reiterada'` es una **instancia superada**: no se puede escalar ni generar infracción desde ahí.
   - Rol `admin_total`: solo editar + eliminar.
   - Cualquier otro rol: sin botones.

## 4. Frentes de trabajo (planos)

### PLANO A — Frontend JS: `public/js/intimaciones.js` (función `mostrarIntimaciones()`)
1. Al inicio de la función (antes del `forEach` de filas), detectar rol:
   ```js
   const esAdmin = (JSON.parse(localStorage.getItem('usuario') || '{}').rol === 'admin_total');
   ```
2. Reemplazar el bloque `action-buttons` (actual líneas 147-172) por el nuevo orden y condiciones:

| Botón | Posición | Color | Condición de muestra |
|---|---|---|---|
| Nueva instancia (flecha) | 1º | verde | `!reiterada && !dio_cumplimiento && numero < 3` |
| Generar Infracción | 2º | rojo oscuro | `!reiterada && estado === 'vencida' && !dio_cumplimiento` |
| Editar | 3º | naranja | siempre, **excepto reiterada sin admin** |
| Eliminar | 4º | rojo | siempre, **excepto reiterada sin admin** |

Regla exacta para filas reiteradas:
```js
const esReiterada = item.estado === 'reiterada';
const verBotones = !esReiterada || esAdmin;      // carga no ve nada en reiteradas
const verEdicion = !esReiterada || esAdmin;      // admin: editar + eliminar, nunca nueva instancia
```
- `btn-next` y `btn-infraccion`: solo si `!esReiterada` (para todos, incluso admin).
- `btn-edit` y `btn-delete`: solo si `verEdicion`.

### PLANO B — Frontend CSS: `public/css/sistema-v2.css` (reemplazar bloque líneas 419-452)
Botones pasan de gris-con-hover a **fondo de color permanente con icono blanco**:
```css
.page-modulo .btn-icon {
    width: 30px; height: 30px; padding: 0;
    display: inline-flex; align-items: center; justify-content: center;
    border-radius: 6px; color: #fff;
}
.page-modulo .btn-icon.btn-next         { background: #16a34a; }  /* verde */
.page-modulo .btn-icon.btn-next:hover   { background: #15803d; }
.page-modulo .btn-icon.btn-infraccion   { background: #b91c1c; }  /* rojo oscuro */
.page-modulo .btn-icon.btn-infraccion:hover { background: #991b1b; }
.page-modulo .btn-icon.btn-edit         { background: #ea580c; }  /* naranja */
.page-modulo .btn-icon.btn-edit:hover   { background: #c2410c; }
.page-modulo .btn-icon.btn-delete       { background: #dc2626; }  /* rojo */
.page-modulo .btn-icon.btn-delete:hover { background: #b91c1c; }
```
**Efecto colateral deseable (ya confirmado)**: el bloque `.page-modulo .btn-icon` es compartido por todos los módulos (`<body class="dashboard page-modulo">` en todas las páginas), así que editar naranja y eliminar rojo se aplican consistentemente en todo el sistema. `btn-next` e `btn-infraccion` son exclusivos de intimaciones.

## 5. Orden de ejecución

A → B → verificación (§6) → commits (§7) → prueba en rama por el operador → decisión de merge.

## 6. Verificación

**Automática:**
- `node --check public/js/intimaciones.js`

**Escenarios manuales (tabla escritorio):**
1. Fila vigente/vencida: orden flecha → rayo → lápiz → papelera; colores verde, rojo oscuro, naranja, rojo; iconos blancos.
2. Fila reiterada con usuario de carga: **ningún botón**.
3. Fila reiterada con `admin_total`: **solo lápiz + papelera**.
4. Fila reiterada con admin: no aparece nueva instancia ni infracción.
5. Vista móvil: cards intactas (sin cambios).

**Regresión visual:**
6. Módulos expedientes/vendedores/comercios: lápiz naranja, papelera roja (consistencia global).

## 7. Commits

1. `style(intimaciones): botones de accion con orden y colores semanticos`
2. `feat(intimaciones): restringir edicion y eliminacion en reiteradas a admin`

## 8. Despliegue

`git pull` + reiniciar servidor. **No hay migraciones de base de datos.** El despliegue a la segunda máquina es igual que siempre: la rama se mergea a `main` tras la prueba y la segunda máquina hace `git pull` + restart.

## 9. Riesgos

- **Riesgo bajo**: cambio 100% frontend (JS + CSS), sin tocar backend ni datos.
- **Riesgo de confusión visual** con la infracción rojo oscuro vs eliminar rojo: mitigado con tonos diferenciados (`#b91c1c` vs `#dc2626`) y el texto de confirmación de cada botón.
- **Compatibilidad con Eje B**: nula fricción; A toca render/CSS (`intimaciones.js`, `sistema-v2.css`), B tocará backend/auditoría. Se ejecuta primero A y se commitea antes de empezar B para evitar conflictos en `intimaciones.js`.

## 10. Estado y precedencia

Este plano es **independiente** de `PLAN_AVISO_INTIMACIONES_CON_EXPEDIENTE.md` (que sigue pendiente de ejecución en su Plano A). Al cerrar el Eje A se retoma ese plano.
