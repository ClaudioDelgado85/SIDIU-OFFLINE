# Plan de Implementacion: Rubro Comercial en Intimaciones

## 1. Objetivo

Agregar el campo `Rubro` en el modulo Intimaciones cuando el tipo de intimacion sea `Comercio`.

La necesidad nace del uso real de los inspectores: al ver una intimacion comercial, les resulta mas facil ubicarse si saben rapidamente si se trata de una panaderia, carniceria, boutique, kiosco, farmacia u otro rubro.

Actualmente esa informacion se escribe en `observaciones`, pero eso depende de que el usuario se acuerde y no permite ordenar, filtrar ni normalizar el dato.

## 2. Decision de Diseno

El rubro comercial debe venir desde el modulo Catalogos.

No conviene cargar los rubros fijos en el codigo porque:

- El administrador no podria agregar rubros sin ayuda tecnica.
- Se mezclaria texto escrito de distintas formas.
- Seria mas dificil mantener el sistema.
- Se perderia la ventaja del modulo Catalogos, que ya existe para este tipo de listas.

La solucion propuesta:

```text
Catalogos
  -> Rubros comerciales
      - Panaderia
      - Carniceria
      - Boutique
      - Kiosco
      - Farmacia
      - Otro
```

Y en Intimaciones:

```text
Tipo: Comercio
Rubro: [lista desplegable desde Catalogos]
```

## 3. Criterio Principal

El campo `Rubro` debe:

- Aparecer solo cuando `Tipo = Comercio`.
- Ser obligatorio para nuevas intimaciones de comercio.
- Permitirse vacio en registros antiguos para no romper datos ya cargados.
- Guardarse como valor interno de catalogo, no como texto libre.
- Ser visible en la ficha de edicion y recomendable en la tabla/listado.
- No afectar intimaciones de tipo General, Baldio o Vehiculo.
- No aumentar de forma perceptible los tiempos de carga.

## 4. Alcance Inicial

Primera etapa:

- Crear categoria de catalogo para rubros comerciales.
- Agregar columna en tabla `intimaciones`.
- Mostrar campo `Rubro` solo para tipo `Comercio`.
- Validar obligatoriedad en nuevas cargas de comercio.
- Mostrar "No registrado" para comercios antiguos sin rubro.

Segunda etapa opcional:

- Filtro por rubro en el modulo Intimaciones.
- Columna visible o colapsable en la tabla.
- Reportes por rubro.
- Estadistica de rubros con mas intimaciones.

## 5. Nombre Tecnico Recomendado

Categoria en Catalogos:

```text
rubro_comercial
```

Columna en `intimaciones`:

```text
rubro_comercial
```

Ejemplo de datos en Catalogos:

```text
categoria: rubro_comercial
valor: panaderia
label: Panaderia
orden: 1
activo: 1
```

Se guarda `valor` en la intimacion. Se muestra `label` en pantalla.

## 6. Cambios Necesarios en Base de Datos

Agregar una columna nullable en `intimaciones`:

```sql
ALTER TABLE intimaciones ADD COLUMN rubro_comercial TEXT;
```

Importante:

- La columna debe permitir `NULL`.
- No debe tener valor obligatorio a nivel base de datos.
- No se deben modificar registros antiguos.

Motivo: si se pone `NOT NULL`, los registros ya existentes pueden generar problemas o requerir datos inventados.

## 7. Indice Recomendado

Si en el futuro se filtra por rubro, conviene crear indice:

```sql
CREATE INDEX IF NOT EXISTS idx_intimaciones_rubro_comercial
ON intimaciones(rubro_comercial);
```

Es un indice liviano y ayuda si se agregan filtros o reportes.

## 8. Cambios en Catalogos

Agregar la nueva categoria `rubro_comercial`.

En `public/js/catalogos.js`, sumar etiqueta legible:

```js
'rubro_comercial': 'Rubros comerciales'
```

La pagina de Catalogos ya carga categorias desde base de datos. Por eso, una vez que exista al menos un rubro cargado, la categoria deberia aparecer automaticamente.

## 9. Rubros Iniciales Sugeridos

Se puede sembrar una lista inicial moderada:

```text
Panaderia
Carniceria
Kiosco
Despensa
Verduleria
Farmacia
Boutique
Peluqueria
Ferreteria
Gastronomia
Bar
Autoservicio
Otro
```

Recomendacion: no cargar una lista enorme al principio. Es mejor arrancar con rubros frecuentes y permitir que el administrador agregue nuevos desde Catalogos.

## 10. Tratamiento de Registros Antiguos

Los registros ya cargados no deben romperse.

Regla:

```text
Si tipo = Comercio y rubro_comercial esta vacio:
mostrar "Rubro: No registrado"
```

No se debe completar automaticamente desde observaciones porque el texto puede ser ambiguo.

Si un usuario edita una intimacion antigua de comercio y la guarda, ahi si se le puede exigir que complete el rubro.

## 11. Comportamiento en Nueva Intimacion

Cuando el usuario crea una intimacion:

```text
Si Tipo = Comercio:
  mostrar campo Rubro
  Rubro obligatorio

Si Tipo != Comercio:
  ocultar campo Rubro
  guardar rubro_comercial = NULL
```

Validacion en frontend:

```text
No permitir guardar una intimacion de Comercio sin rubro.
```

Validacion en backend:

```text
Rechazar una nueva intimacion de Comercio sin rubro_comercial.
```

La validacion backend es importante porque evita que se saltee la regla desde una llamada directa a la API.

## 12. Comportamiento en Edicion

Al editar una intimacion:

```text
Si Tipo = Comercio:
  mostrar Rubro
  si no tiene rubro, mostrar "-- Seleccionar --"
  exigir rubro al guardar

Si Tipo cambia de Comercio a otro tipo:
  limpiar rubro_comercial o guardarlo como NULL

Si Tipo cambia de otro tipo a Comercio:
  exigir rubro antes de guardar
```

Recomendacion: si el registro antiguo de comercio se abre para mirar pero no se guarda, no pasa nada. La exigencia ocurre al guardar.

## 13. Cambios en Backend

Archivo principal:

```text
controllers/intimacionesController.js
```

En `crearIntimacion`:

- Leer `rubro_comercial` desde `req.body`.
- Validar que exista cuando `tipo === 'comercio'`.
- Agregar la columna al `INSERT`.
- Agregar el valor en el array de parametros.

En `actualizarIntimacion`:

- Leer `rubro_comercial`.
- Si el tipo final es `comercio`, exigir rubro.
- Si el tipo final no es `comercio`, guardar `NULL`.
- Incluir `rubro_comercial` en el `UPDATE`.

En `obtenerIntimaciones`:

- Devolver `rubro_comercial`.
- Opcional: devolver tambien `rubro_comercial_label` mediante `LEFT JOIN` con `catalogos`.

Consulta conceptual:

```sql
SELECT
  i.*,
  c.label AS rubro_comercial_label
FROM intimaciones i
LEFT JOIN catalogos c
  ON c.categoria = 'rubro_comercial'
 AND c.valor = i.rubro_comercial
```

Si no se hace el `JOIN`, el frontend puede traducir el valor usando la lista de catalogos que ya carga para el select.

## 14. Cambios en Frontend

Archivo:

```text
public/js/intimaciones.js
```

Agregar un grupo de formulario:

```html
<div class="form-group-modal" id="grupoRubroComercial" style="display:none">
  <label>Rubro *</label>
  <select id="rubro_comercial" name="rubro_comercial"></select>
</div>
```

Cargar opciones desde Catalogos:

```js
cargarSelectCatalogo('rubro_comercial', 'rubro_comercial', intimacionEditando?.rubro_comercial || null, {
  incluirVacio: true,
  textoVacio: '-- Seleccionar rubro --'
});
```

Mostrar u ocultar segun tipo:

```js
function actualizarVisibilidadRubro() {
  const tipo = document.getElementById('tipo').value;
  const grupo = document.getElementById('grupoRubroComercial');
  const select = document.getElementById('rubro_comercial');

  const esComercio = tipo === 'comercio';
  grupo.style.display = esComercio ? '' : 'none';
  if (!esComercio) select.value = '';
}
```

Al guardar:

```text
Si tipo = comercio y rubro_comercial vacio:
  mostrar alerta
  no guardar
```

## 15. Tabla/Listado de Intimaciones

Hay dos opciones visuales:

Opcion A, recomendada:

- Mostrar el rubro debajo del tipo o del nombre cuando sea comercio.

Ejemplo:

```text
COMERCIO
Panaderia
```

Opcion B:

- Agregar una columna `Rubro`.

No se recomienda de entrada si la tabla ya esta ajustada, porque puede cargar visualmente la pantalla.

Mejor primera etapa:

```text
Mostrar rubro como texto secundario solo en registros de comercio.
```

Para registros antiguos:

```text
No registrado
```

## 16. Filtro por Rubro

No es obligatorio para la primera version.

Si se agrega:

- Debe aparecer solo si el filtro `Tipo` esta en Comercio, o quedar como filtro avanzado.
- Debe cargarse desde Catalogos.
- Debe enviar `rubro_comercial` como query param.
- Backend debe agregar `AND rubro_comercial = ?`.

Recomendacion: dejar filtro por rubro para segunda etapa, salvo que los inspectores lo pidan desde el inicio.

## 17. Cambios en Scripts de Inicializacion

Archivo:

```text
scripts/setup_sqlite.js
```

Agregar rubros iniciales al arreglo de catalogos:

```js
['rubro_comercial', 'panaderia', 'Panaderia', 1],
['rubro_comercial', 'carniceria', 'Carniceria', 2],
['rubro_comercial', 'kiosco', 'Kiosco', 3],
['rubro_comercial', 'otro', 'Otro', 99],
```

Tambien actualizar:

```text
database/schema_sqlite.sql
database/schema.sql
database/schema_unificado.sql
```

## 18. Migracion Recomendada

Crear archivo:

```text
database/migracion_rubro_comercial_intimaciones.sql
```

Contenido conceptual:

```sql
ALTER TABLE intimaciones ADD COLUMN rubro_comercial TEXT;

CREATE INDEX IF NOT EXISTS idx_intimaciones_rubro_comercial
ON intimaciones(rubro_comercial);

INSERT OR IGNORE INTO catalogos (categoria, valor, label, orden, activo)
VALUES
('rubro_comercial', 'panaderia', 'Panaderia', 1, 1),
('rubro_comercial', 'carniceria', 'Carniceria', 2, 1),
('rubro_comercial', 'kiosco', 'Kiosco', 3, 1),
('rubro_comercial', 'despensa', 'Despensa', 4, 1),
('rubro_comercial', 'verduleria', 'Verduleria', 5, 1),
('rubro_comercial', 'farmacia', 'Farmacia', 6, 1),
('rubro_comercial', 'boutique', 'Boutique', 7, 1),
('rubro_comercial', 'otro', 'Otro', 99, 1);
```

Nota: si el motor es SQLite, `ALTER TABLE ADD COLUMN` funciona bien cuando la columna permite `NULL`.

## 19. Sobrecarga Esperada

Impacto esperado:

```text
Base de datos: muy bajo
Tiempo de carga: muy bajo
Interfaz: bajo
Riesgo operativo: bajo
```

Por que es liviano:

- Se agrega una sola columna de texto corta.
- La lista de rubros se carga desde Catalogos, como ya ocurre con Tipo e Intimacion por.
- No se hacen consultas pesadas.
- No se cargan historiales ni datos externos.
- El campo solo aparece cuando corresponde.

## 20. Riesgos y Mitigaciones

Riesgo 1: romper registros antiguos.

Mitigacion:

- Columna nullable.
- Mostrar "No registrado".
- No exigir rubro hasta que se guarde una edicion.

Riesgo 2: que los rubros se dupliquen con nombres parecidos.

Mitigacion:

- Administrarlos desde Catalogos.
- Usar `valor` normalizado y `label` visible.
- Evitar texto libre salvo opcion `Otro`.

Riesgo 3: que el formulario se vea mas cargado.

Mitigacion:

- Mostrar el campo solo cuando `Tipo = Comercio`.
- Ubicarlo cerca del campo Tipo o antes de Intimacion por.
- Mantener el mismo estilo de select que el resto del formulario.

Riesgo 4: que se guarden comercios sin rubro.

Mitigacion:

- Validacion frontend.
- Validacion backend.
- Mensaje claro: "Seleccione el rubro comercial".

## 21. Pruebas Manuales

Probar como administrador:

- Crear rubro nuevo desde Catalogos.
- Ver que aparece en el select de Intimaciones.
- Desactivar un rubro y verificar que no aparece en nuevas cargas.

Probar nueva intimacion:

- Tipo General: no aparece Rubro.
- Tipo Baldio: no aparece Rubro.
- Tipo Vehiculo: no aparece Rubro.
- Tipo Comercio: aparece Rubro y es obligatorio.
- Intentar guardar Comercio sin rubro: debe bloquear.
- Guardar Comercio con rubro: debe crear correctamente.

Probar edicion:

- Abrir comercio con rubro: debe mostrarlo seleccionado.
- Abrir comercio antiguo sin rubro: debe mostrar "-- Seleccionar rubro --".
- Guardar comercio antiguo sin rubro: debe bloquear.
- Completar rubro y guardar: debe quedar registrado.
- Cambiar Comercio a otro Tipo: debe limpiar rubro.

Probar listado:

- Comercio con rubro muestra el rubro.
- Comercio antiguo sin rubro muestra "No registrado" o queda discreto.
- Otros tipos no muestran rubro innecesario.

## 22. Criterios de Aceptacion

La implementacion se considera correcta si:

- El administrador puede gestionar rubros desde Catalogos.
- El campo Rubro aparece solo para intimaciones de tipo Comercio.
- El campo Rubro es obligatorio para nuevas intimaciones de Comercio.
- Los registros antiguos no se rompen.
- Los comercios antiguos sin rubro muestran "No registrado".
- El sistema no exige rubro para General, Baldio o Vehiculo.
- El rubro guardado se ve al volver a editar.
- La carga de la pantalla no se vuelve perceptiblemente mas lenta.
- La tabla no queda visualmente sobrecargada.

## 23. Recomendacion Final

Implementar en primera version:

```text
Catalogos -> rubro_comercial
Intimaciones -> campo rubro_comercial
Visible solo si Tipo = Comercio
Obligatorio al crear o guardar Comercio
Nullable para registros antiguos
Sin filtro por rubro en la primera entrega
```

Esta version resuelve el problema operativo de los inspectores sin agregar complejidad innecesaria y deja el camino preparado para filtros o reportes por rubro mas adelante.

