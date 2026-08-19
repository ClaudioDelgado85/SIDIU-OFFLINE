# PLANO DE OBRA
## Sistema de Casos y Agrupamiento Explícito de Intimaciones (`grupo_id`) — SIDIU OFFLINE

| Hoja de control | |
|---|---|
| Proyecto | SIDIU OFFLINE (Dirección de Inspección Urbana — Clorinda) |
| Redactado por (Ingeniero) | opencode — Senior Architect / Ingeniero de Software |
| Ejecuta (Maestro Mayor de Obra) | Agente ejecutor / Desarrollador + operador del sistema |
| Versión | 1.0 |
| Estado | Aprobado para ejecución técnica |
| Stack | Node.js + Express + SQLite (sqlite3), frontend vanilla JS |
| Cambios de DB | `ALTER TABLE intimaciones ADD COLUMN grupo_id TEXT;` + Script de migración de datos existentes |

---

## 1. Objetivo de la obra

Reemplazar la **cadena implícita y frágil** de intimaciones (que hoy se deduce comparando cadenas de texto exactas `WHERE dni = ? AND direccion = ?`) por una **cadena explícita y robusta** gobernada por un identificador de caso único: `grupo_id`.

### Lo que soluciona:
1. **Evita que la cadena se rompa** si un operador comete un error tipográfico en la dirección, agrega un piso/departamento, o edita la dirección en una instancia posterior.
2. **Elimina la doble fuente de verdad** de intimaciones reiteradas (hoy la BD guarda `estado='reiterada'` al crear, pero el controlador lo recalcula en runtime con `MAX(id)` sobre texto de dirección).
3. **Automatiza la numeración de instancia** (`1, 2, 3...`) dentro del caso, eliminando la dependencia del número ingresado a mano.
4. **Otorga mayor jerarquía al botón "Crear Intimación"**: cuando el operador crea una intimación, el sistema detecta inteligentemente si ya existe un caso abierto para ese infractor y lo asocia automáticamente, o bien abre un nuevo caso raíz.
5. **Visibilidad del hilo conductor**: el operador y el administrador pueden ver de un vistazo qué intimaciones forman parte del mismo caso histórico (ej: badge `Instancia 2 de 3`).

---

## 2. Diagnóstico técnico del estado actual (por qué falla)

El análisis del código actual (`controllers/intimacionesController.js`, líneas 108-129 y 263-276) reveló 4 fallas estructurales:

1. **Clave de cadena volátil**: La agrupación se hace por `(dni, direccion)`. Si en la 1ª se cargó *"Av. San Martín 100"* y en la 2ª *"Av. San Martin 100"* (sin tilde), el sistema las trata como dos personas distintas.
2. **Ediciones desconectan la cadena**: Si se edita la dirección de una intimación antigua, esa fila se "escapa" a otro grupo `(dni, direccion)` y queda huérfana.
3. **Conflicto entre BD y visualización**: El dashboard lee la columna `estado` de la BD, pero la tabla de intimaciones recalcula en tiempo real con `MAX(id)`. Si hay discrepancias, los contadores no coinciden con la lista.
4. **Numeración manual**: El campo `numero_intimacion` se escribe a mano; un operador puede poner "1" en una tercera instancia y el sistema lo acepta.

---

## 3. Alcance de la obra

### Incluye:
- **Columna `grupo_id TEXT`** e índice `idx_intimaciones_grupo_id` en la tabla `intimaciones`.
- **Script de migración y backfill** (`scripts/migrar_grupos_intimaciones.js`): analiza todos los registros históricos existentes, normaliza DNI y direcciones, genera sus `grupo_id` y asigna `numero_intimacion` secuencial histórico.
- **Función de normalización de direcciones para matching** (`utils/normalizarTexto.js` → `normalizarDireccionParaGrupo`): quita puntos, comas, acentos, múltiples espacios y pasa a minúsculas solo a efectos de agrupamiento.
- **Backend `controllers/intimacionesController.js`**:
  - `crearIntimacion`: si recibe `grupo_id` explícito (flujo "Nueva Instancia") lo usa; si no, busca si existe grupo activo por DNI + dirección normalizada. Si existe, lo reutiliza y autocalcula `numero_intimacion = MAX + 1`; si no, genera un nuevo `grupo_id` (formato `GRP-YYYYMM-XXXXX`) con número `1`. Marca las instancias previas del grupo como `reiterada` (si no están cumplidas ni infraccionadas).
  - `actualizarIntimacion`: protege `grupo_id` y `numero_intimacion` de ediciones accidentales.
  - `obtenerIntimaciones`: unifica la lógica de `reiterada` apoyándose en el `grupo_id`, calcula `total_instancias_grupo` para alimentar la vista `[X/Y]`.
  - `eliminarIntimacion`: eliminación segura sin renumerar (numeración estática histórica).
- **Frontend `public/js/intimaciones.js` y CSS**:
  - Visualización del hilo: celda de número muestra `#1/3`, `#2/3`, `#3/3` con tooltip del caso.
  - Botón "Nueva Instancia" (`btn-next`) transmite el `grupo_id` de forma transparente.
  - Modal de carga/edición: muestra el identificador del caso cuando es una continuación.

### Fuera de alcance:
- No se crea tabla separada `grupos` (enfoque liviano sobre la tabla `intimaciones` sin sobrecarga de joins).
- No altera el funcionamiento de `expedientes` ni `infracciones`.

---

## 4. Reglas de negocio (Ley de la obra)

1. **Invariante del Grupo**: Todo registro nuevo o migrado en `intimaciones` debe tener un `grupo_id` asignado.
2. **Identificador del Caso**: Formato `GRP-YYYYMM-XXXX` (ej: `GRP-202608-0001` o timestamp seguro).
3. **Numeración Estática**: El `numero_intimacion` representa la secuencia histórica (`1, 2, 3...`). Borrar la instancia 2 **no renumera** la 3 a 2; la 3 sigue siendo la 3 (para preservar auditoría, actas impresas y expedientes derivados).
4. **Inmunidad ante ediciones de texto**: Si el operador edita la dirección, nombre o DNI de una instancia puntual, el `grupo_id` **permanece inmutable**. El caso no se fragmenta.
5. **Tope de instancias**: Se mantiene la regla de negocio de hasta 3 intimaciones antes de infracción obligatoria (`numero_intimacion <= 3`).
6. **Cumplimiento**: Si una instancia tiene `dio_cumplimiento = 1`, su estado es `cumplida`. Si meses después se crea una nueva intimación para ese infractor, se evalúa si el caso previo ya estaba cerrado para iniciar un nuevo `grupo_id`.

---

## 5. Frentes de trabajo (Planos de ejecución)

```
┌─────────────────────────────────────────────────────────────┐
│                       ARQUITECTURA                          │
│                                                             │
│  [Plano A] Migración DB & Backfill                          │
│      │                                                      │
│      ▼                                                      │
│  [Plano B] utils/normalizarTexto.js (Función match grupo)   │
│      │                                                      │
│      ▼                                                      │
│  [Plano C] controllers/intimacionesController.js            │
│      │     (crear, actualizar, listar con grupo_id)         │
│      ▼                                                      │
│  [Plano D] public/js/intimaciones.js (UI, [X/Y], btn-next)  │
│      │                                                      │
│      ▼                                                      │
│  [Plano E] public/css/sistema-v2.css (Badges y estilos)     │
└─────────────────────────────────────────────────────────────┘
```

---

### PLANO A — Base de Datos: Columna e Índice + Script de Backfill

#### 1. Modificación de Esquema (`database/schema_sqlite.sql` y migración SQL)

Crear archivo `database/migracion_grupo_id_intimaciones.sql`:
```sql
-- Migración: Soporte de Casos y Grupos Explícitos en Intimaciones
-- Fecha: 2026-08-07

ALTER TABLE intimaciones ADD COLUMN grupo_id TEXT;

CREATE INDEX IF NOT EXISTS idx_intimaciones_grupo_id 
ON intimaciones(grupo_id);
```

Actualizar también la definición de `CREATE TABLE IF NOT EXISTS intimaciones` en `database/schema_sqlite.sql` agregando `grupo_id TEXT` antes de `fecha_creacion`.

#### 2. Script de Backfill (`scripts/migrar_grupos_intimaciones.js`)

Crear script ejecutable con `node scripts/migrar_grupos_intimaciones.js` que:
1. Aplique el `ALTER TABLE` si la columna no existe.
2. Lea todas las intimaciones existentes ordenadas por `fecha ASC, id ASC`.
3. Normalice DNI (`normalizarDni`) y dirección (`normalizarDireccionParaGrupo`).
4. Agrupe las filas que comparten mismo DNI + dirección normalizada:
   - Para cada grupo, genera un `grupo_id` único (ej: `GRP-HIST-0001`, `GRP-HIST-0002`...).
   - Asigna a cada fila su `grupo_id` y su `numero_intimacion` correlativo (`1, 2, 3...`).
   - Setea `estado = 'reiterada'` a todas las instancias previas a la última del grupo (siempre que no estén `cumplida` ni `infraccionado`).
5. Imprima reporte por consola: total intimaciones, grupos generados, cadenas de 2 o más instancias reconstruidas.

---

### PLANO B — Normalización de Texto (`utils/normalizarTexto.js`)

Agregar función especializada para comparar direcciones sin que diferencias de puntuación o tildes rompan el agrupamiento:

```javascript
/**
 * Normaliza una dirección exclusivamente para propósitos de comparación y agrupamiento.
 * Remueve tildes, comas, puntos, abreviaturas comunes y espacios redundantes.
 * @param {string} val 
 * @returns {string}
 */
function normalizarDireccionParaGrupo(val) {
  if (typeof val !== 'string') return '';
  return val
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[.,\-\/\\#]/g, ' ')                      // Signos de puntuación por espacios
    .replace(/\b(av|avda|avenida)\b/g, 'av')          // Unificar abreviaturas comunes
    .replace(/\b(pso|piso|depto|dpto)\b/g, '')        // Opcional: ignorar piso/depto secundario
    .replace(/\s+/g, ' ')
    .trim();
}
```

Exportar `normalizarDireccionParaGrupo` en `module.exports`.

---

### PLANO C — Backend: `controllers/intimacionesController.js`

#### 1. Generador de `grupo_id` único
```javascript
function generarGrupoId() {
  const ahora = new Date();
  const yyyy = ahora.getFullYear();
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const random = Math.floor(1000 + Math.random() * 9000);
  return `GRP-${yyyy}${mm}-${random}`;
}
```

#### 2. Modificar `crearIntimacion`
Al recibir el payload:
```javascript
let { grupo_id, ... } = req.body;

// 1. Determinar el grupo_id y el numero_instancia
let numeroCalculado = 1;

if (grupo_id) {
  // Caso A: Viene explícito (ej: desde botón "Nueva Instancia")
  const [previas] = await db.pool.execute(
    'SELECT MAX(numero_intimacion) as max_num FROM intimaciones WHERE grupo_id = ?',
    [grupo_id]
  );
  numeroCalculado = ((previas[0] && previas[0].max_num) || 0) + 1;
} else {
  // Caso B: Creación desde cero. Buscar si ya existe un grupo activo para este DNI + Dirección
  const dniNorm = normalizarDni(dni);
  const dirNorm = normalizarDireccionParaGrupo(direccion);

  // Buscar intimaciones existentes del mismo DNI
  const [candidatas] = await db.pool.execute(
    'SELECT id, grupo_id, direccion, numero_intimacion, estado, dio_cumplimiento FROM intimaciones WHERE dni = ? ORDER BY id DESC',
    [dniNorm]
  );

  // Encontrar si alguna coincide en dirección normalizada y no está cumplida
  const coincidencia = candidatas.find(c => 
    c.grupo_id && 
    normalizarDireccionParaGrupo(c.direccion) === dirNorm &&
    !c.dio_cumplimiento &&
    c.estado !== 'cumplida'
  );

  if (coincidencia) {
    grupo_id = coincidencia.grupo_id;
    const [previas] = await db.pool.execute(
      'SELECT MAX(numero_intimacion) as max_num FROM intimaciones WHERE grupo_id = ?',
      [grupo_id]
    );
    numeroCalculado = ((previas[0] && previas[0].max_num) || 0) + 1;
  } else {
    grupo_id = generarGrupoId();
    numeroCalculado = 1;
  }
}

// Limitar tope a 3 si la regla de negocio lo exige
if (numeroCalculado > 3) numeroCalculado = 3;
```

Insertar con `grupo_id` y `numero_intimacion = numeroCalculado`.

Inmediatamente después del INSERT, actualizar instancias anteriores del grupo:
```javascript
// Marcar instancias previas del mismo grupo como 'reiterada'
await db.pool.execute(
  `UPDATE intimaciones
   SET estado = 'reiterada'
   WHERE grupo_id = ?
     AND id != ?
     AND estado NOT IN ('cumplida', 'reiterada', 'infraccionado')
     AND dio_cumplimiento = 0`,
  [grupo_id, result.insertId]
);
```

#### 3. Modificar `obtenerIntimaciones` (Listado unificado)
Reemplazar la subconsulta `MAX(id) GROUP BY dni, direccion` por el conteo real por `grupo_id`:

```javascript
// 1. Obtener la última intimación por grupo_id
const [latestPerGroup] = await db.pool.execute(
  `SELECT grupo_id, MAX(id) as ultimo_id, COUNT(*) as total_grupo 
   FROM intimaciones 
   WHERE grupo_id IS NOT NULL 
   GROUP BY grupo_id`
);

const latestMap = new Map(); // grupo_id -> { ultimo_id, total_grupo }
latestPerGroup.forEach(r => latestMap.set(r.grupo_id, { ultimo_id: r.ultimo_id, total_grupo: r.total_grupo }));

const intimacionesConEstado = allIntimaciones.map(item => {
  let estadoCalculado = calcularEstadoAutomatico(item);
  const infoGrupo = item.grupo_id ? latestMap.get(item.grupo_id) : null;
  const esUltima = infoGrupo ? infoGrupo.ultimo_id === item.id : true;
  const totalInstancias = infoGrupo ? infoGrupo.total_grupo : 1;

  if (!esUltima && estadoCalculado !== 'cumplida' && estadoCalculado !== 'infraccionado') {
    estadoCalculado = 'reiterada';
  }

  return {
    ...item,
    estado: estadoCalculado,
    total_instancias_grupo: totalInstancias,
    fecha_vencimiento: new Date(new Date(item.fecha).getTime() + (item.plazo_dias || 0) * 24 * 60 * 60 * 1000)
  };
});
```

#### 4. Modificar `actualizarIntimacion`
En la lista `allowedFields`, NO incluir `grupo_id` (o permitirlo únicamente a `admin_total` si existiera una función explícita de "Reasignar Caso").

---

### PLANO D — Frontend: `public/js/intimaciones.js`

#### 1. Renderizado de Celda de Número e Hilo conductor (`mostrarIntimaciones`)
En la columna de número de intimación (línea 126 aprox):

```javascript
const totalGrupo = item.total_instancias_grupo || item.numero_intimacion || 1;
const numActual = item.numero_intimacion || 1;
const badgeClase = totalGrupo > 1 ? 'celda-numero-grupo' : 'celda-numero';

// Render:
`<td style="text-align:center">
  <span class="${badgeClase}" title="Instancia ${numActual} de ${totalGrupo} (Caso ${item.grupo_id || 'S/N'})">
    #${numActual}${totalGrupo > 1 ? `<small style="opacity:0.75">/${totalGrupo}</small>` : ''}
  </span>
</td>`
```

#### 2. Enlace en Botón "Nueva Instancia" (`btn-next`)
En el listener del `btn-next`:
```javascript
// Al preparar la plantilla de la nueva instancia:
const plantilla = { 
  ...original, 
  id: undefined,
  grupo_id: original.grupo_id // ¡TRANSMISIÓN EXPLÍCITA DEL GRUPO!
};
```
Al guardar el formulario (`guardarIntimacion`), incluir `grupo_id: form.dataset.grupoId || null` en el JSON enviado a `POST /api/intimaciones`.

#### 3. Modal de Carga / Edición
Si `plantilla.grupo_id` existe, mostrar un aviso discreto en la cabecera del modal:
`🔗 Continuando Caso ${plantilla.grupo_id} — Instancia ${nextNum}`

---

### PLANO E — Frontend CSS: `public/css/sistema-v2.css`

Estilos para destacar los casos con múltiples instancias:

```css
/* Badges de instancia con grupo */
.celda-numero-grupo {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    background: rgba(37, 99, 235, 0.12);
    color: #1d4ed8;
    border: 1px solid rgba(37, 99, 235, 0.3);
    border-radius: 6px;
    padding: 2px 6px;
    font-weight: 600;
    font-size: 12px;
}

[data-theme="dark"] .celda-numero-grupo {
    background: rgba(59, 130, 246, 0.2);
    color: #93c5fd;
    border-color: rgba(59, 130, 246, 0.4);
}

/* Indicador de Caso en Modal */
.modal-caso-tag {
    font-size: 11px;
    background: var(--si-surface-subtle, #f1f5f9);
    border: 1px solid var(--si-border);
    padding: 3px 8px;
    border-radius: 4px;
    color: var(--si-text-muted);
    margin-left: 8px;
}
```

---

## 6. Orden de ejecución (Instrucciones para el Maestro Mayor de Obra)

El agente ejecutor DEBE seguir estrictamente esta secuencia sin saltear pasos:

1. **Paso 1: Migración de BD**
   - Ejecutar la migración SQL (`ALTER TABLE intimaciones ADD COLUMN grupo_id TEXT; CREATE INDEX...`).
   - Actualizar `database/schema_sqlite.sql`.
2. **Paso 2: Script de Backfill**
   - Crear y ejecutar `scripts/migrar_grupos_intimaciones.js`.
   - Verificar en consola que el 100% de las filas tengan `grupo_id` asignado.
3. **Paso 3: Helper de Normalización**
   - Modificar `utils/normalizarTexto.js` agregando `normalizarDireccionParaGrupo`.
4. **Paso 4: Controlador Backend**
   - Modificar `controllers/intimacionesController.js` (`generarGrupoId`, `crearIntimacion`, `obtenerIntimaciones`, `actualizarIntimacion`).
5. **Paso 5: Frontend JS & CSS**
   - Modificar `public/js/intimaciones.js` (envío de `grupo_id`, render `#X/Y`).
   - Agregar estilos en `public/css/sistema-v2.css`.
6. **Paso 6: Verificación y Pruebas (§7)**.
7. **Paso 7: Commits (§8)**.

---

## 7. Protocolo de verificación y pruebas

### 1. Verificación Estática
```powershell
node --check utils/normalizarTexto.js
node --check controllers/intimacionesController.js
node --check public/js/intimaciones.js
```

### 2. Verificación de Migración
Ejecutar consulta en SQLite para validar:
```sql
SELECT COUNT(*) as sin_grupo FROM intimaciones WHERE grupo_id IS NULL;
-- Debe retornar 0.
```

### 3. Escenarios de Prueba Funcional (Manual)
1. **Crear primera intimación (Infractor Nuevo)**:
   - Cargar intimación para DNI `99999999`, Dirección `Calle Falsa 123`.
   - Verificar que se le asigna un `grupo_id` nuevo y `numero_intimacion = 1`.
2. **Crear siguiente instancia con `btn-next`**:
   - Presionar botón verde "Siguiente Instancia" sobre la creada en paso 1.
   - Guardar.
   - Verificar que hereda el MISMO `grupo_id`, se numera como `#2/2`, y la primera pasa a estado `reiterada`.
3. **Crear intimación manual con dirección ligeramente distinta**:
   - Ir a "Nueva Intimación" (botón principal arriba).
   - Ingresar DNI `99999999`, Dirección `Calle Falsa 123.` (con punto al final) o `calle falsa 123`.
   - Guardar.
   - Verificar que el backend detecta el caso existente, asocia el mismo `grupo_id` y numera como `#3/3`.
4. **Editar dirección en instancia 2**:
   - Modificar la dirección de la 2ª instancia a `Calle Falsa 123, Depto B`.
   - Guardar.
   - Verificar que **NO se rompe la cadena**: todas las instancias siguen agrupadas bajo el mismo `grupo_id`.
5. **Eliminar instancia intermedia**:
   - Como admin, eliminar la instancia 2.
   - Verificar que la instancia 1 y 3 conservan sus números `#1` y `#3` sin corromperse.

---

## 8. Plan de commits

1. `feat(db): agregar columna grupo_id e indice en intimaciones`
2. `feat(intimaciones): script de backfill y normalizador de direcciones para grupos`
3. `feat(intimaciones): agrupamiento explicito y autonumeracion por grupo_id en backend`
4. `feat(ui): badges de instancia de caso y transmision de grupo_id en frontend`

---

## 9. Despliegue y contingencia (Rollback)

- **Despliegue**: `git pull` → ejecutar `node scripts/migrar_grupos_intimaciones.js` → reiniciar servicio (`npm start` o pm2).
- **Compatibilidad**: La columna `grupo_id` es nullable; si el script se interrumpe, el sistema sigue funcionando sin caídas.
- **Rollback**: En caso de emergencia, revertir commits en git. La columna `grupo_id` en SQLite no genera incompatibilidad con el código anterior.

---

## 10. Relación con otros planos

- **Eje A (`PLAN_EJE_A_FLUJO_ESCALAMIENTO.md`)**: Totalmente compatible. Los botones con colores semánticos (`btn-next`, `btn-infraccion`, etc.) se mantienen idénticos; ahora `btn-next` transmite el `grupo_id`.
- **Eje B (`PLAN_EJE_B_TRAZABILIDAD_REVERTIR.md`)**: Totalmente compatible. Cuando se auditen ediciones o reversiones, el `grupo_id` quedará registrado en el snapshot.
