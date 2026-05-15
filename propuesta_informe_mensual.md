# Propuesta: Informe Mensual Estadístico

Sistema de Gestión Municipal — Clorinda

---

## 1. KPIs Globales

| Métrica | Fuente | Gráfico |
|---------|--------|---------|
| Total registros del mes (suma todos los módulos) | 7 módulos | Indicador grande |
| Variación vs mes anterior (%) | Cálculo mensual | Indicador con flecha |
| Promedio registros/día | Total / días del mes | Indicador |
| Días con mayor actividad | `auditoria.fecha` agrupado | Heatmap |
| Módulo más activo del mes | `auditoria` count por módulo | Barra horizontal |

---

## 2. 📁 Expedientes

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Ingresados por día en el mes | `fecha` agrupado | Línea (evolución) |
| Distribución por estado | `estado` | Donut |
| Tiempo promedio de resolución | AVG(`fecha_salida` - `fecha`) | Indicador + comparación mes anterior |
| Top 5 motivos más frecuentes | `motivo` agrupado | Barra horizontal |
| Expedientes por barrio | JOIN `barrios` | Barra vertical |
| Comparativo: este mes vs anterior | conteo agrupado por mes | Barra doble |
| Tabla: 5 expedientes más recientes | `ORDER BY fecha_creacion DESC` | Tabla |

---

## 3. ⚠️ Intimaciones

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Distribución por tipo | `tipo` (general, baldío, vehículo) | Donut |
| Estado actual (vigentes, vencidas, cumplidas) | `estado` calculado | Donut |
| Tasa de cumplimiento del mes | `dio_cumplimiento = 1` / total | Indicador % |
| Evolución de vencimientos en el mes | `fecha` según estado vencida | Línea |
| Plazo promedio otorgado | AVG(`plazo_dias`) | Indicador |
| Reincidentes (2+ intimaciones) | count por `dni` | Barra |
| Intimaciones → Infracciones (escaladas) | `infraccion_realizada = 1` | Indicador |
| Tabla: Próximas a vencer (3 días) | `vista_alertas_intimaciones` | Tabla destacada |

---

## 4. 🚨 Infracciones

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Infracciones por día | `fecha` | Línea |
| Top 5 motivos de infracción | `motivo_infraccion` agrupado | Barra horizontal |
| Distribución por barrio | JOIN `barrios` | Barra |
| Comparativo mensual (últimos 6 meses) | agrupado por mes | Línea (tendencia) |
| Tabla: Últimas 10 infracciones | `ORDER BY fecha DESC` | Tabla |

---

## 5. 📢 Reclamos

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Por tipo de reclamo | `tipo_reclamo` | Donut |
| Por prioridad | `prioridad` | Barra (urgente → baja) |
| Estado actual | `estado` | Donut |
| Tasa de resolución | resueltos / total del mes | Indicador % |
| Tiempo promedio de resolución | AVG(`fecha_resolucion` - `fecha_creacion`) | Indicador (días) |
| Ingresados vs Resueltos por día | `fecha_creacion` vs `fecha_resolucion` | Línea doble |
| Top barrios con más reclamos | JOIN `barrios` | Barra |
| Tabla: Reclamos urgentes sin resolver | estado=pendiente AND prioridad=urgente | Tabla destacada |

---

## 6. 📍 Relevamientos

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Por tipo de relevamiento | `tipo_relevamiento` | Donut |
| Por zona | `zona` | Barra |
| % con autorización vs sin | `tiene_autorizacion` | Donut |
| Evolución mensual | `fecha_relevamiento` agrupado | Línea |
| Tabla: Últimos relevamientos | `ORDER BY fecha DESC` | Tabla |

---

## 7. 🏪 Comercios

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Relevados en el mes | count por mes | Indicador |
| Habilitados vs No habilitados | `esta_habilitado` | Donut |
| Por rubro | `rubro` | Barra horizontal |
| Necesitan reempadronamiento | `necesita_reempadronamiento = 1` | Indicador |
| Tabla: Nuevos comercios del mes | filtro por mes | Tabla |

---

## 8. 🛵 Vendedores Ambulantes

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Relevados en el mes | count | Indicador |
| Con autorización vs sin | `tiene_autorizacion` | Donut |
| Pagan cánon vs no | `pago_canon` | Donut |
| Próximos a vencer cánon | `fecha_vencimiento_canon` próximos 30 días | Tabla |
| Por rubro | `rubro` | Barra |

---

## 9. 📝 Tareas Diarias

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Tareas por día | `fecha` | Línea |
| Por categoría | JOIN `catalogos` | Donut |
| Por barrio | JOIN `barrios` | Barra |
| Tabla: Tareas más recientes | `ORDER BY fecha DESC` | Tabla |

---

## 10. 📊 Sección Comparativa

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Todos los módulos en un gráfico | count por módulo por mes | Barra agrupada (2 meses) |
| Tendencia últimos 6 meses | count mensual por módulo | Líneas múltiples |
| Días de la semana con más actividad | DAYOFWEEK(`fecha`) | Barra (lun-dom) |

---

## 11. 🧾 Actividad de Usuarios (auditoría)

| Qué mostrar | Dimensión | Gráfico |
|------------|-----------|---------|
| Operaciones por usuario | `usuario_nombre` agrupado | Barra |
| Acciones más comunes | `accion` (crear/editar/eliminar) | Donut |
| Usuario del mes (más operaciones) | count por `usuario_id` | Tarjeta destacada |
| Tabla: Últimas 20 acciones | `ORDER BY fecha DESC` | Tabla |

---

## Maqueta del informe

```
┌──────────────────────────────────────────────────────────┐
│  📊 INFORME MENSUAL — FEBRERO 2026                       │
├──────────────────────────────────────────────────────────┤
│  [234] Total registros   ▲ +12% vs enero  │ Prom: 8/día  │
├──────────────────────────────────────────────────────────┤
│  ┌────────────────────────────────────────────────────┐  │
│  │  Módulo más activo: EXPEDIENTES (45 registros)    │  │
│  │  Ranking: ██ Expedientes ██ Intimaciones ██ Recl. │  │
│  └────────────────────────────────────────────────────┘  │
├─────────────┬──────────────────┬───────────────────────┤
│  📁 Exped.  │  ⚠️ Intimaciones │  📢 Reclamos          │
│  [Donut]    │  [Donut estados] │  [Donut tipos]        │
│  [Línea]    │  % cumplimiento  │  [Línea doble]        │
│   T prom:   │   Plazo prom:    │   Tasa resolución:    │
│   12 días   │   15 días        │   72%                 │
├─────────────┴──────────────────┴───────────────────────┤
│  📈 Tendencia últimos 6 meses (líneas múltiples)       │
│  ┌───────────────────────────────────────────────────┐ │
│  │  [Gráfico líneas - todos los módulos]             │ │
│  └───────────────────────────────────────────────────┘ │
├───────────────────────────────────────────────────────┤
│  Detalle: Últimas 10 acciones registradas              │
│  ┌─────┬──────────┬────────────┬───────────┬────────┐ │
│  │Fecha│ Módulo   │ Acción     │ Usuario   │ Detalle│ │
│  ├─────┼──────────┼────────────┼───────────┼────────┤ │
│  │ ... │ ...      │ ...        │ ...       │ ...    │ │
│  └─────┴──────────┴────────────┴───────────┴────────┘ │
├───────────────────────────────────────────────────────┤
│  Generado: 01/03/2026 | [📄 PDF] [📊 Excel]           │
└───────────────────────────────────────────────────────┘
```

---

## Stack técnico recomendado

| Componente | Tecnología |
|------------|------------|
| Gráficos | Chart.js (ya está en el proyecto) |
| Backend endpoint | `GET /api/informes/mensual?anio=2026&mes=2` |
| PDF | jspdf + jspdf-autotable |
| Excel | xlsx (SheetJS) |
| Frontend | `informes.html` + `js/informes.js` |

---

*Propuesta generada el 13/05/2026*