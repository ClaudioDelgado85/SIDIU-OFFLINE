-- ==========================================================
-- SISTEMA DE GESTIÓN MUNICIPAL - CLORINDA
-- ESQUEMA SQLITE UNIFICADO
-- ==========================================================

PRAGMA foreign_keys = OFF;

-- ==========================================================
-- ELIMINACIÓN DE TABLAS Y VISTAS EXISTENTES (Orden dependencias)
-- ==========================================================
DROP VIEW IF EXISTS vista_historial_contribuyente;
DROP VIEW IF EXISTS vista_dashboard_resumen;
DROP VIEW IF EXISTS vista_alertas_intimaciones;

DROP TABLE IF EXISTS tareas_diarias;
DROP TABLE IF EXISTS vendedores_ambulantes;
DROP TABLE IF EXISTS comercios;
DROP TABLE IF EXISTS relevamientos;
DROP TABLE IF EXISTS reclamos;
DROP TABLE IF EXISTS intimaciones;
DROP TABLE IF EXISTS infracciones;
DROP TABLE IF EXISTS expedientes;
DROP TABLE IF EXISTS auditoria;
DROP TABLE IF EXISTS permisos_modulos;
DROP TABLE IF EXISTS contador_reclamos;
DROP TABLE IF EXISTS configuracion_sistema;
DROP TABLE IF EXISTS catalogos;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS barrios;

PRAGMA foreign_keys = ON;

-- ==========================================================
-- CREACIÓN DE TABLAS
-- ==========================================================

-- Tabla: barrios
CREATE TABLE IF NOT EXISTS barrios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre TEXT UNIQUE NOT NULL,
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: usuarios
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nombre_completo TEXT NOT NULL,
  usuario TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK(rol IN ('admin_total','carga','consulta')),
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Tabla: catalogos
CREATE TABLE IF NOT EXISTS catalogos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  categoria TEXT NOT NULL,
  valor TEXT NOT NULL,
  label TEXT NOT NULL,
  orden INTEGER DEFAULT 0,
  activo INTEGER DEFAULT 1,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(categoria, valor)
);

-- Tabla: configuracion_sistema
CREATE TABLE IF NOT EXISTS configuracion_sistema (
  clave TEXT PRIMARY KEY,
  valor TEXT NOT NULL,
  descripcion TEXT
);

-- Tabla: contador_reclamos
CREATE TABLE IF NOT EXISTS contador_reclamos (
  anio INTEGER PRIMARY KEY,
  ultimo_numero INTEGER DEFAULT 0
);

-- Tabla: permisos_modulos
CREATE TABLE IF NOT EXISTS permisos_modulos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  modulo TEXT NOT NULL,
  habilitado INTEGER NOT NULL DEFAULT 1,
  UNIQUE(usuario_id, modulo),
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

-- Tabla: auditoria
CREATE TABLE IF NOT EXISTS auditoria (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  usuario_id INTEGER NOT NULL,
  usuario_nombre TEXT,
  accion TEXT NOT NULL CHECK(accion IN ('crear','editar','eliminar','login','logout','cambio_estado')),
  modulo TEXT NOT NULL,
  registro_id INTEGER,
  descripcion TEXT,
  datos_anteriores TEXT,
  datos_nuevos TEXT,
  ip_address TEXT,
  fecha DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(usuario_id) REFERENCES usuarios(id)
);

-- Tabla: expedientes
CREATE TABLE IF NOT EXISTS expedientes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  numero_expediente TEXT UNIQUE NOT NULL,
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  motivo TEXT NOT NULL,
  direccion TEXT,
  numero_partida TEXT,
  estado TEXT NOT NULL DEFAULT 'ingreso' CHECK(estado IN ('ingreso','en_inspeccion','plazo_otorgado','salida')),
  fecha_inspeccion TEXT,
  plazo_dias INTEGER,
  fecha_salida TEXT,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id)
);

-- Tabla: infracciones
CREATE TABLE IF NOT EXISTS infracciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  numero_acta TEXT UNIQUE NOT NULL,
  direccion TEXT NOT NULL,
  motivo_infraccion TEXT NOT NULL,
  observaciones TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id)
);

-- Tabla: intimaciones
CREATE TABLE IF NOT EXISTS intimaciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  tipo TEXT NOT NULL DEFAULT 'general',
  nombre_apellido TEXT NOT NULL,
  dni TEXT NOT NULL,
  direccion TEXT NOT NULL,
  tipo_obstruccion TEXT,
  plazo_dias INTEGER DEFAULT 0,
  numero_intimacion INTEGER DEFAULT 1,
  dio_cumplimiento INTEGER DEFAULT 0,
  fecha_subsanacion TEXT,
  observaciones TEXT,
  estado TEXT DEFAULT 'vigente' CHECK(estado IN ('vigente','proxima_vencer','vencida','cumplida','reiterada','infraccionado')),
  infraccion_realizada INTEGER DEFAULT 0,
  numero_infraccion TEXT,
  fecha_infraccion TEXT,
  propietario_no_ubicado INTEGER DEFAULT 0,
  marca TEXT,
  modelo TEXT,
  color TEXT,
  dominio TEXT,
  fecha_retiro TEXT,
  lugar_deposito TEXT,
  foto_inicial TEXT,
  foto_actual TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id)
);

-- Tabla: reclamos (Soporta 'baldio' y 'baldío' por insensibilidad a acentos de MySQL en tests)
CREATE TABLE IF NOT EXISTS reclamos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_reclamo TEXT UNIQUE NOT NULL,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  tipo_reclamo TEXT NOT NULL CHECK(tipo_reclamo IN ('alumbrado','baldio','baldío','ruidos','animales','cloacas','obras','varios')),
  descripcion TEXT NOT NULL,
  direccion_incidente TEXT NOT NULL,
  denunciado_nombre TEXT,
  denunciado_dni TEXT,
  denunciado_direccion TEXT,
  foto_url TEXT,
  vecino_nombre TEXT,
  vecino_telefono TEXT,
  estado TEXT DEFAULT 'pendiente' CHECK(estado IN ('pendiente','en_proceso','resuelto','anulado')),
  prioridad TEXT DEFAULT 'media' CHECK(prioridad IN ('baja','media','alta','urgente')),
  fecha_resolucion TEXT,
  observaciones_resolucion TEXT,
  usuario_creador_id INTEGER,
  barrio_id INTEGER,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  foto_inicial TEXT,
  foto_actual TEXT,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id),
  FOREIGN KEY(usuario_creador_id) REFERENCES usuarios(id)
);

-- Tabla: relevamientos (Soporta 'baldio' y 'baldío' por insensibilidad a acentos de MySQL en tests)
CREATE TABLE IF NOT EXISTS relevamientos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  numero_relevamiento TEXT UNIQUE NOT NULL,
  fecha_relevamiento TEXT NOT NULL,
  tipo_relevamiento TEXT NOT NULL CHECK(tipo_relevamiento IN ('baldio','baldío','obra','ocupacion','comercio','varios')),
  ubicacion TEXT NOT NULL,
  zona TEXT,
  responsable_nombre TEXT,
  responsable_dni TEXT,
  observaciones TEXT,
  foto_url TEXT,
  tiene_autorizacion INTEGER DEFAULT 0,
  paga_canon INTEGER DEFAULT 0,
  fecha_vencimiento_canon TEXT,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  barrio_id INTEGER,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id)
);

-- Tabla: comercios
CREATE TABLE IF NOT EXISTS comercios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_relevamiento TEXT NOT NULL,
  nombre_propietario TEXT,
  dni_propietario TEXT,
  direccion_comercial TEXT NOT NULL,
  rubro TEXT,
  esta_habilitado INTEGER DEFAULT 0,
  numero_resolucion TEXT,
  necesita_reempadronamiento INTEGER DEFAULT 0,
  observaciones TEXT,
  barrio_id INTEGER,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id)
);

-- Tabla: vendedores_ambulantes
CREATE TABLE IF NOT EXISTS vendedores_ambulantes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha_relevamiento TEXT NOT NULL,
  nombre_vendedor TEXT,
  dni_vendedor TEXT,
  ubicacion TEXT NOT NULL,
  rubro TEXT,
  tiene_autorizacion INTEGER DEFAULT 0,
  pago_canon INTEGER DEFAULT 0,
  numero_recibo TEXT,
  fecha_vencimiento_canon TEXT,
  dias_vigencia INTEGER,
  observaciones TEXT,
  barrio_id INTEGER,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id)
);

-- Tabla: tareas_diarias
CREATE TABLE IF NOT EXISTS tareas_diarias (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fecha TEXT NOT NULL,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  direccion TEXT,
  categoria_id INTEGER NOT NULL,
  barrio_id INTEGER,
  fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(barrio_id) REFERENCES barrios(id),
  FOREIGN KEY(categoria_id) REFERENCES catalogos(id)
);

-- ==========================================================
-- CREACIÓN DE VISTAS (Adaptadas a SQLite)
-- ==========================================================

-- Vista: vista_alertas_intimaciones
CREATE VIEW IF NOT EXISTS vista_alertas_intimaciones AS
SELECT
    i.id, i.tipo, i.nombre_apellido, i.dni, i.direccion,
    i.fecha AS fecha_intimacion,
    date(i.fecha, '+' || i.plazo_dias || ' days') AS fecha_vencimiento,
    i.plazo_dias, i.numero_intimacion, i.barrio_id,
    CASE
        WHEN i.dio_cumplimiento = 1 THEN 'cumplida'
        WHEN date('now', 'localtime') > date(i.fecha, '+' || i.plazo_dias || ' days') THEN 'vencida'
        WHEN (julianday(date(i.fecha, '+' || i.plazo_dias || ' days')) - julianday(date('now', 'localtime'))) <= 3 THEN 'proxima_vencer'
        ELSE 'vigente'
    END AS estado_calculado,
    CAST(julianday(date(i.fecha, '+' || i.plazo_dias || ' days')) - julianday(date('now', 'localtime')) AS INTEGER) AS dias_restantes
FROM intimaciones i
WHERE i.dio_cumplimiento = 0 AND i.estado != 'reiterada'
ORDER BY fecha_vencimiento ASC;

-- Vista: vista_dashboard_resumen
CREATE VIEW IF NOT EXISTS vista_dashboard_resumen AS
SELECT
    (SELECT COUNT(*) FROM expedientes WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', 'localtime'))) AS expedientes_mes,
    (SELECT COUNT(*) FROM intimaciones WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', 'localtime'))) AS intimaciones_mes,
    (SELECT COUNT(*) FROM infracciones WHERE strftime('%Y-%m', fecha) = strftime('%Y-%m', date('now', 'localtime'))) AS infracciones_mes,
    (SELECT COUNT(*) FROM reclamos WHERE strftime('%Y-%m', fecha_creacion) = strftime('%Y-%m', date('now', 'localtime'))) AS reclamos_mes,
    (SELECT COUNT(*) FROM relevamientos WHERE strftime('%Y-%m', fecha_relevamiento) = strftime('%Y-%m', date('now', 'localtime'))) AS relevamientos_mes,
    (SELECT COUNT(*) FROM intimaciones WHERE date('now', 'localtime') <= date(fecha, '+' || plazo_dias || ' days') AND (julianday(date(fecha, '+' || plazo_dias || ' days')) - julianday(date('now', 'localtime'))) <= 3 AND dio_cumplimiento = 0) AS alertas_proximas_vencer,
    (SELECT COUNT(*) FROM intimaciones WHERE date('now', 'localtime') > date(fecha, '+' || plazo_dias || ' days') AND dio_cumplimiento = 0) AS alertas_vencidas,
    (SELECT COUNT(*) FROM intimaciones WHERE dio_cumplimiento = 1 AND strftime('%Y-%m', fecha_subsanacion) = strftime('%Y-%m', date('now', 'localtime'))) AS alertas_cumplidas_mes;

-- Vista: vista_historial_contribuyente
CREATE VIEW IF NOT EXISTS vista_historial_contribuyente AS
SELECT 'expediente' AS tipo, e.id, e.nombre_apellido, e.dni, e.fecha AS fecha_registro, e.numero_expediente AS numero, e.motivo AS descripcion, e.estado, NULL AS direccion, e.barrio_id FROM expedientes e
UNION ALL
SELECT 'intimacion', i.id, i.nombre_apellido, i.dni, i.fecha, i.numero_intimacion || ' - ' || i.tipo, i.tipo_obstruccion, i.estado, i.direccion, i.barrio_id FROM intimaciones i
UNION ALL
SELECT 'infraccion', inf.id, inf.nombre_apellido, inf.dni, inf.fecha, inf.numero_acta, inf.motivo_infraccion, 'registrada', inf.direccion, inf.barrio_id FROM infracciones inf
UNION ALL
SELECT 'reclamo_denunciado', r.id, r.denunciado_nombre, r.denunciado_dni, r.fecha_creacion, r.numero_reclamo, r.tipo_reclamo, r.estado, r.denunciado_direccion, r.barrio_id FROM reclamos r
UNION ALL
SELECT 'relevamiento', rel.id, rel.responsable_nombre, rel.responsable_dni, rel.fecha_relevamiento, rel.numero_relevamiento, rel.ubicacion, CASE WHEN rel.tiene_autorizacion = 1 THEN 'autorizado' ELSE 'no_autorizado' END, rel.ubicacion, rel.barrio_id FROM relevamientos rel
UNION ALL
SELECT 'comercio', c.id, c.nombre_propietario, c.dni_propietario, c.fecha_relevamiento, NULL, c.rubro, CASE WHEN c.esta_habilitado = 1 THEN 'habilitado' ELSE 'no_habilitado' END, c.direccion_comercial, c.barrio_id FROM comercios c
UNION ALL
SELECT 'vendedor_ambulante', v.id, v.nombre_vendedor, v.dni_vendedor, v.fecha_relevamiento, NULL, v.rubro, CASE WHEN v.tiene_autorizacion = 1 THEN 'autorizado' ELSE 'no_autorizado' END, v.ubicacion, v.barrio_id FROM vendedores_ambulantes v
ORDER BY fecha_registro DESC;
