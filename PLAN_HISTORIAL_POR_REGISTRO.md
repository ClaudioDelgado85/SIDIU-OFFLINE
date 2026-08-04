# Plan de Implementacion: Historial Visible por Registro

## 1. Objetivo

Agregar en cada ficha de registro una referencia clara de trazabilidad:

```text
Cargado por Gloria - 12/06/2026 09:42
Ultima edicion Julio - 12/06/2026 15:18
```

La informacion debe servir al administrador para saber quien cargo o modifico un expediente, intimacion u otro registro importante, sin sobrecargar la pantalla ni afectar la velocidad del sistema.

La idea no es convertir cada formulario en un panel de auditoria completo. La idea es dejar una "firma tecnica" del registro: quien lo creo, cuando lo creo, quien lo modifico por ultima vez y cuando.

## 2. Criterio Principal

El dato debe ser:

- Visible solo para usuarios administradores.
- Discreto, legible y ubicado en la parte superior derecha de la ficha/formulario.
- Cercano al boton de cierre `X`, pero sin competir con el titulo ni con los controles principales.
- No editable por el usuario.
- No obligatorio para registros antiguos.
- Liviano para la base de datos y para la interfaz.

## 3. Alcance Inicial Recomendado

Primera etapa:

- Expedientes.
- Intimaciones.

Segunda etapa, si el resultado convence:

- Infracciones.
- Reclamos.
- Relevamientos.
- Comercios.
- Vendedores.
- Tareas.

Motivo: Expedientes e Intimaciones son los modulos donde mas valor administrativo aporta saber quien cargo cada registro.

## 4. Visibilidad

La informacion debe mostrarse solo si el usuario logueado tiene rol:

```text
admin_total
```

Para usuarios de carga o consulta, la ficha debe verse igual que ahora.

Regla:

```js
const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
const puedeVerTrazabilidad = usuario.rol === 'admin_total';
```

Si `puedeVerTrazabilidad` es falso, no se renderiza el bloque.

## 5. Ubicacion Visual

En los paneles laterales actuales, el encabezado tiene este esquema conceptual:

```text
[Titulo del formulario]                                      [X]
```

El nuevo bloque debe quedar asi:

```text
[Titulo del formulario]              [Cargado/Editado por...] [X]
```

En pantallas angostas, debe bajar debajo del titulo sin romper el formulario:

```text
[Titulo del formulario]                                      [X]
[Cargado por Gloria - 12/06/2026 09:42]
[Ultima edicion Julio - 12/06/2026 15:18]
```

## 6. Diseno Visual Propuesto

Nombre sugerido de clase CSS:

```css
.registro-trazabilidad
```

Caracteristicas:

- Fuente chica pero legible: 12px o 13px.
- Color secundario: gris azulado, no negro fuerte.
- Ancho maximo para no empujar la `X`.
- Dos lineas maximo.
- Texto alineado a la derecha en escritorio.
- Texto alineado a la izquierda en mobile si baja debajo del titulo.
- Sin fondos fuertes.
- Sin borde pesado.
- No usar tarjetas grandes.

Ejemplo visual:

```text
Cargado por Gloria - 12/06/2026 09:42
Ultima edicion Julio - 12/06/2026 15:18
```

Para registros antiguos:

```text
Cargado por No registrado
Sin ediciones registradas
```

## 7. Cambios Necesarios en Base de Datos

Las tablas ya tienen fechas de creacion y actualizacion:

```text
fecha_creacion
fecha_actualizacion
```

Hace falta agregar usuarios responsables:

```text
usuario_creador_id
usuario_actualizacion_id
```

En `expedientes`:

```sql
ALTER TABLE expedientes ADD COLUMN usuario_creador_id INTEGER;
ALTER TABLE expedientes ADD COLUMN usuario_actualizacion_id INTEGER;
```

En `intimaciones`:

```sql
ALTER TABLE intimaciones ADD COLUMN usuario_creador_id INTEGER;
ALTER TABLE intimaciones ADD COLUMN usuario_actualizacion_id INTEGER;
```

Importante: no cargar valores falsos para registros antiguos.

Los registros ya existentes deben quedar con `NULL` en esas columnas. El sistema debe mostrar "No registrado" cuando no exista usuario asociado.

## 8. Indices Recomendados

Para mantener buena respuesta si mas adelante se filtra o se consulta por usuario:

```sql
CREATE INDEX IF NOT EXISTS idx_expedientes_usuario_creador
ON expedientes(usuario_creador_id);

CREATE INDEX IF NOT EXISTS idx_expedientes_usuario_actualizacion
ON expedientes(usuario_actualizacion_id);

CREATE INDEX IF NOT EXISTS idx_intimaciones_usuario_creador
ON intimaciones(usuario_creador_id);

CREATE INDEX IF NOT EXISTS idx_intimaciones_usuario_actualizacion
ON intimaciones(usuario_actualizacion_id);
```

Estos indices son livianos porque apuntan a columnas numericas.

## 9. Comportamiento al Crear Registros

Cuando un usuario crea un expediente o intimacion:

```text
usuario_creador_id = req.usuario.id
usuario_actualizacion_id = NULL
fecha_creacion = fecha automatica actual
fecha_actualizacion = fecha automatica actual
```

No hace falta pedir nada extra en el formulario. El sistema ya conoce el usuario por el token.

## 10. Comportamiento al Editar Registros

Cuando un usuario edita un expediente o intimacion:

```text
usuario_actualizacion_id = req.usuario.id
fecha_actualizacion = fecha actual
```

El `usuario_creador_id` nunca debe cambiarse durante una edicion.

Esto es importante: quien cargo originalmente el registro debe quedar fijo.

## 11. Consultas Backend

Al devolver registros al frontend, el backend debe traer tambien los nombres de usuario.

Ejemplo conceptual para Expedientes:

```sql
SELECT
  e.*,
  uc.nombre_completo AS usuario_creador_nombre,
  ua.nombre_completo AS usuario_actualizacion_nombre
FROM expedientes e
LEFT JOIN usuarios uc ON uc.id = e.usuario_creador_id
LEFT JOIN usuarios ua ON ua.id = e.usuario_actualizacion_id
```

Ejemplo conceptual para Intimaciones:

```sql
SELECT
  i.*,
  uc.nombre_completo AS usuario_creador_nombre,
  ua.nombre_completo AS usuario_actualizacion_nombre
FROM intimaciones i
LEFT JOIN usuarios uc ON uc.id = i.usuario_creador_id
LEFT JOIN usuarios ua ON ua.id = i.usuario_actualizacion_id
```

Los `LEFT JOIN` son importantes porque los registros antiguos pueden no tener usuario creador.

## 12. Sobrecarga Esperada

Impacto esperado:

```text
Base de datos: muy bajo
Tiempo de carga: muy bajo
Peso visual: bajo
Riesgo operativo: bajo/medio
```

Por que no deberia afectar la eficiencia:

- Solo se agregan dos columnas numericas por tabla.
- Al crear o editar se guarda un ID de usuario, no un historial completo.
- La consulta suma dos `LEFT JOIN` contra la tabla `usuarios`, que normalmente es chica.
- No se registra cada lectura, busqueda o apertura de pantalla.
- No se carga historial completo salvo que en el futuro se agregue un boton especifico.

## 13. Auditoria vs Trazabilidad Directa

Este plan no reemplaza el modulo Auditoria.

Son dos cosas distintas:

- Trazabilidad directa: dato visible en la ficha del registro.
- Auditoria: listado administrativo de eventos importantes.

Para esta etapa conviene priorizar trazabilidad directa porque responde rapido a la pregunta:

```text
Quien cargo este expediente o esta intimacion?
```

## 14. Tratamiento de Registros Antiguos

No se deben inventar responsables historicos.

Para registros existentes:

```text
usuario_creador_id = NULL
usuario_actualizacion_id = NULL
```

Visualizacion:

```text
Cargado por No registrado
Sin ediciones registradas
```

Si el registro antiguo se edita despues de implementar esto:

```text
Cargado por No registrado
Ultima edicion Julio - 12/06/2026 15:18
```

Eso es correcto y honesto.

## 15. Archivos a Tocar

Base de datos:

- `database/schema_sqlite.sql`
- `database/schema.sql`
- `database/schema_unificado.sql`
- Crear una migracion nueva, por ejemplo:
  - `database/migracion_trazabilidad_registros.sql`

Backend:

- `controllers/expedientesController.js`
- `controllers/intimacionesController.js`

Frontend:

- `public/js/expedientes.js`
- `public/js/intimaciones.js`
- `public/css/sistema-v2.css`

Tests recomendados:

- `tests/controllers/expedientes.test.js`
- `tests/controllers/intimaciones.test.js`

## 16. Orden de Implementacion

### Paso 1: Migracion de Base de Datos

Crear migracion con columnas nuevas e indices.

Condicion: debe poder ejecutarse sobre una base existente sin borrar registros.

Resultado esperado:

```text
Las tablas conservan todos los datos existentes.
Los registros viejos quedan con usuario_creador_id NULL.
```

### Paso 2: Actualizar Esquemas

Actualizar los archivos de schema para que nuevas instalaciones ya nazcan con las columnas.

Resultado esperado:

```text
Una base nueva y una base migrada tienen la misma estructura.
```

### Paso 3: Backend Crear

En `crearExpediente` y `crearIntimacion`, agregar `usuario_creador_id` al `INSERT`.

Fuente del dato:

```js
req.usuario.id
```

Resultado esperado:

```text
Todo registro nuevo guarda quien lo cargo.
```

### Paso 4: Backend Editar

En `actualizarExpediente` y `actualizarIntimacion`, agregar:

```text
usuario_actualizacion_id = req.usuario.id
fecha_actualizacion = CURRENT_TIMESTAMP
```

Resultado esperado:

```text
Cada edicion deja registrado quien fue el ultimo usuario que modifico el registro.
```

### Paso 5: Backend Consultar

Modificar las consultas de listado y detalle para devolver:

```text
usuario_creador_nombre
usuario_actualizacion_nombre
fecha_creacion
fecha_actualizacion
```

Resultado esperado:

```text
El frontend recibe todos los datos necesarios sin hacer llamadas extra.
```

### Paso 6: Frontend Render Condicional

En los formularios laterales de Expedientes e Intimaciones:

- Detectar si el usuario actual es `admin_total`.
- Si es admin y se esta editando un registro, mostrar el bloque.
- Si se esta creando un registro nuevo, no mostrarlo o mostrar "Nuevo registro" segun preferencia.

Recomendacion:

```text
En modo nuevo: no mostrar bloque.
En modo editar: mostrar bloque solo admin.
```

### Paso 7: CSS

Agregar estilos compartidos para el bloque de trazabilidad.

El estilo debe respetar el panel actual y no agrandar demasiado el encabezado.

### Paso 8: Pruebas Manuales

Probar con administrador:

- Crear expediente.
- Editar expediente.
- Abrir expediente y verificar trazabilidad.
- Crear intimacion.
- Editar intimacion.
- Abrir intimacion y verificar trazabilidad.

Probar con usuario de carga:

- Abrir los mismos formularios.
- Confirmar que no ve el bloque.

Probar registros antiguos:

- Abrir un registro previo a la migracion.
- Confirmar que muestra "No registrado" solo para admin.
- Editarlo.
- Confirmar que queda cargada la ultima edicion.

## 17. Criterios de Aceptacion

La implementacion se considera correcta si:

- El administrador ve "Cargado por" y "Ultima edicion" en la parte superior derecha del formulario.
- Los usuarios no administradores no ven ese bloque.
- Los registros nuevos guardan usuario creador.
- Las ediciones guardan usuario de ultima modificacion.
- Los registros antiguos no se rompen y muestran "No registrado".
- La tabla principal no se sobrecarga con columnas nuevas innecesarias.
- El formulario mantiene su estructura visual.
- No aumenta perceptiblemente el tiempo de carga.
- Las consultas siguen paginadas.

## 18. Riesgos y Cuidados

Riesgo 1: romper registros antiguos.

Mitigacion:

- Usar columnas nullable.
- Usar `LEFT JOIN`.
- No exigir usuario creador en registros previos.

Riesgo 2: mostrar informacion a usuarios no autorizados.

Mitigacion:

- Validar visibilidad en frontend.
- No agregar columnas visibles en tablas generales.
- Si luego se crea un endpoint de historial, protegerlo con rol admin.

Riesgo 3: afectar rendimiento.

Mitigacion:

- No consultar historial completo en la carga normal.
- Usar indices en columnas de usuario.
- Mantener paginacion existente.
- No auditar lecturas ni busquedas.

Riesgo 4: que el bloque desordene el encabezado.

Mitigacion:

- Limitar ancho maximo.
- Usar texto chico.
- Permitir salto a segunda linea en mobile.
- Probar en escritorio y notebook.

## 19. Version Sugerida del Bloque

HTML conceptual:

```html
<div class="registro-trazabilidad" id="registroTrazabilidad">
  <div>Cargado por Gloria - 12/06/2026 09:42</div>
  <div>Ultima edicion Julio - 12/06/2026 15:18</div>
</div>
```

CSS conceptual:

```css
.panel-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.registro-trazabilidad {
  margin-left: auto;
  max-width: 280px;
  font-size: 12px;
  line-height: 1.35;
  color: #64748b;
  text-align: right;
}

.panel-header .btn-close-panel {
  flex: 0 0 auto;
}

@media (max-width: 640px) {
  .panel-header {
    flex-wrap: wrap;
  }

  .registro-trazabilidad {
    order: 3;
    width: 100%;
    max-width: none;
    text-align: left;
  }
}
```

## 20. Recomendacion Final

Implementar primero esta version liviana:

```text
Cargado por + fecha/hora
Ultima edicion + fecha/hora
Visible solo admin
Sin historial campo por campo
Sin auditar lecturas
```

Es la opcion mas equilibrada: le da al administrador control real, respeta los registros existentes y mantiene el sistema rapido.

