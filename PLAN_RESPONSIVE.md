# 📱 Plan Responsive — Sistema de Gestión Municipal

**Fecha:** 20/04/2026  
**Enfoque:** Mobile = consulta. Desktop = sin cambios.

---

## Objetivo

Hacer responsive el sistema completo para uso en celulares. El enfoque mobile es **consulta**, no carga de datos. En móvil se ocultan botones de acción (crear, exportar) y las tablas se reemplazan por **tarjetas (cards)** que aparecen solo al buscar o filtrar.

---

## Comportamiento por Pantalla

| Elemento | Desktop (>768px) | Móvil (≤768px) |
|---|---|---|
| **Navbar** | Horizontal con scroll | Hamburger menu (☰) |
| **Header** | Horizontal (título + usuario) | Apilado vertical |
| **Stats/Contadores** | Grid horizontal | Grid 2 columnas |
| **Botones de acción** | Visibles (Nuevo, Exportar, Filtros) | **Ocultos** (Nuevo, Exportar) / solo Buscar y Filtros |
| **Buscador** | En barra de acciones | Prominente, ancho completo |
| **Tabla de datos** | Tabla completa | **Oculta** |
| **Cards de resultados** | Ocultas | **Visibles** al buscar/filtrar |
| **Panel lateral (formularios)** | 520px ancho | Full screen (ya funciona) |
| **Paginación** | Como está | Simplificada |

---

## Archivos a Crear/Modificar

### Fase 1: CSS Base Responsive

#### [NUEVO] `public/css/responsive.css`
Archivo centralizado con todas las reglas móviles:
- Hamburger menu styles
- Ocultar `.btn-primary`, `.btn-export` en móvil
- Ocultar `table` en móvil
- Cards container visible solo en móvil
- Stats grid adaptado a 2 columnas
- Header apilado
- Buscador full-width
- Touch targets mínimo 44px

---

### Fase 2: Hamburger Menu

#### [MODIFICAR] `public/js/navbar.js`
- Botón hamburger (☰) visible solo en móvil
- Menú vertical desplegable al tocar ☰
- Respeta los permisos del usuario (solo muestra módulos habilitados)
- Overlay semi-transparente al abrir
- Cerrar al seleccionar un módulo o tocar fuera

---

### Fase 3: Cards para Resultados Móviles

#### [NUEVO] `public/js/mobile-cards.js`
Utilidad compartida que genera cards a partir de datos.

#### [MODIFICAR] Módulos JS (agregar renderizado de cards)

| Módulo | Archivo JS | Campos en Card |
|---|---|---|
| Expedientes | `expedientes.js` | Nro, Nombre, DNI, Estado |
| Intimaciones | `intimaciones.js` | Nombre, Dirección, Tipo, Estado, Días |
| Infracciones | `infracciones.js` | Nro Acta, Nombre, DNI, Motivo |
| Reclamos | `reclamos.js` | Nro, Tipo, Estado, Prioridad |
| Relevamientos | `relevamientos.js` | Nro, Tipo, Ubicación, Autorización |
| Comercios | `comercios.js` | Propietario, Rubro, Habilitado |
| Vendedores | `vendedores.js` | Nombre, Rubro, Ubicación |
| Tareas | `tareas_diarias.js` | Categoría, Título, Barrio |
| Catálogos | `catalogos.js` | Valor, Label, Estado |
| Usuarios | `usuarios.js` | Nombre, Usuario, Rol |
| Auditoría | `auditoria.js` | Fecha, Usuario, Acción |

---

### Fase 4: HTMLs

#### [MODIFICAR] Todos los `.html` de módulos (13 archivos)
- Incluir `responsive.css` y `mobile-cards.js`
- Agregar container vacío para cards: `<div id="mobileCardsContainer">`

---

## Diseño Visual

### Card individual
```
┌─────────────────────────────────┐
│ 📋 EXP-2026-001                │  ← Nro/ID destacado
│ Juan Pérez · DNI 12345678      │  ← Datos principales
│ Habilitación                   │  ← Detalle secundario
│ ┌──────────┐                   │
│ │ INGRESO  │  20/03/2026       │  ← Estado badge + fecha
│ └──────────┘                   │
└─────────────────────────────────┘
```
- Borde izquierdo con color del estado
- Tap → abre panel detalle (lectura)
- Sin botones editar/eliminar (es consulta)

### Hamburger Menu
```
┌────────────────────────────┐
│ ☰  SIDIU                  │
├────────────────────────────┤
│ 🏠 Inicio                 │
│ 📁 Expedientes            │
│ 📋 Intimaciones           │
│ ⚡ Infracciones            │
│ 📢 Reclamos               │
│ ... (según permisos)       │
├────────────────────────────┤
│ 👤 Admin · Cerrar Sesión  │
└────────────────────────────┘
```

### Vista Móvil por Defecto
```
┌────────────────────────────┐
│ ☰  Expedientes      👤    │
├────────────────────────────┤
│ ┌──────┐ ┌──────┐         │
│ │  5   │ │  2   │         │  Stats 2x2
│ │TOTAL │ │INGR. │         │
│ └──────┘ └──────┘         │
│ ┌──────┐ ┌──────┐         │
│ │  0   │ │  3   │         │
│ │INSP. │ │SALIDA│         │
│ └──────┘ └──────┘         │
├────────────────────────────┤
│ 🔍 Buscar por nombre...   │  Buscador prominente
│ 📅 Filtros ▼              │
├────────────────────────────┤
│  Busque un expediente      │
│  para ver resultados       │  Mensaje guía
└────────────────────────────┘
```

---

## Orden de Implementación

1. `responsive.css` — Reglas base
2. Hamburger menu — `navbar.js` + CSS
3. `mobile-cards.js` — Utilidad de renderizado
4. Integrar en cada módulo JS
5. Actualizar HTMLs
6. Testing visual

---

## Regla Principal

> ⚠️ **Desktop no se toca.** Todos los cambios son dentro de `@media (max-width: 768px)`.
> La experiencia actual de escritorio queda idéntica.

---

*Última actualización: 20/04/2026*
