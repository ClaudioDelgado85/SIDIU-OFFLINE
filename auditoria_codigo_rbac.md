# 🔍 Informe de Auditoría de Código — RBAC, Auditoría y Sesiones

**Fecha:** 2026-03-17  
**Alcance:** Middleware de autenticación, controllers, rutas, migración SQL, y frontend (navbar, session-manager, login)  
**Archivos revisados:** 20+

---

## Resumen Ejecutivo

El sistema RBAC está **correctamente diseñado en su arquitectura**. Los tres roles (`admin_total`, `carga`, `consulta`) se aplican de forma consistente en las rutas, el middleware `requireModuloAccess` es sólido, y el timeout de sesión funciona bien. Sin embargo, se identificaron **6 hallazgos** que requieren atención, organizados por severidad.

---

## 🔴 Hallazgos Críticos

### 1. Auditoría incompleta — 14 de 16 controllers sin registro

Solo `authController.js` y `usuariosController.js` invocan `registrarAuditoria()`. Los 14 controllers restantes (**expedientes, intimaciones, infracciones, reclamos, relevamientos, comercios, vendedores, tareas, catalogos, barrios, busqueda, dashboard, informes**) no registran ninguna operación.

**Impacto:** Si un usuario de carga crea, edita o elimina un expediente, reclamo, etc., esa acción **no queda registrada** en el panel de auditoría. El admin no tiene visibilidad real de las operaciones más importantes del sistema.

**Recomendación:** Agregar `registrarAuditoria()` en las operaciones `crear`, `editar`, `eliminar` y `cambiarEstado` de cada controller de módulo. Ejemplo para expedientes:

```javascript
// En crearExpediente, después del INSERT exitoso:
await registrarAuditoria({
  usuario_id: req.usuario.id,
  usuario_nombre: req.usuario.nombre_completo,
  accion: 'crear',
  modulo: 'expedientes',
  registro_id: result.insertId,
  descripcion: `Creó expediente Nro ${nro_expediente}`,
  datos_nuevos: req.body,
  ip: req.ip
});
```

---

### 2. SQL Injection potencial en `auditoriaController.js`

En [auditoriaController.js](file:///c:/Users/Estudiante/Downloads/proyecto-completo-final/proyecto/controllers/auditoriaController.js#L54-L61), los valores de `LIMIT` y `OFFSET` se interpolan directamente en la query SQL:

```javascript
// Línea 60 — VULNERABLE
LIMIT ${parseInt(limite)} OFFSET ${offset}
```

Aunque `parseInt()` mitiga parcialmente el riesgo, la práctica segura es usar placeholders:

```javascript
// Forma segura
const sql = `SELECT ... FROM auditoria a ${whereClause} ORDER BY a.fecha DESC LIMIT ? OFFSET ?`;
params.push(parseInt(limite), offset);
const [registros] = await db.pool.execute(sql, params);
```

---

## 🟡 Hallazgos Importantes

### 3. El token JWT no se invalida server-side al cerrar sesión

Cuando el usuario cierra sesión, solo se borra el `localStorage` del navegador. El token JWT sigue siendo válido hasta su expiración (8h). Si alguien captura ese token, puede seguir usándolo.

**Recomendación (a futuro):** Implementar una lista negra de tokens (*token blacklist*) en la base de datos o en Redis. Al cerrar sesión, agregar el token a la lista. En `verifyToken`, verificar que el token no esté en la blacklist.

> [!NOTE]
> Esta es una mejora de seguridad avanzada. Para el uso actual del sistema (red interna municipal), el riesgo es bajo. La verificación de `activo` en la DB ya mitiga el caso de desactivación de cuenta.

### 4. Permisos del frontend basados en `localStorage` sin refresco periódico

El `navbar.js` lee los permisos desde `localStorage` (guardados al hacer login). Si el admin cambia los permisos de un usuario de carga, **ese usuario no ve el cambio hasta que vuelva a loguearse**.

**Recomendación:** En `session-manager.js`, agregar una verificación periódica (ej: cada 5 minutos) que llame a `/api/auth/verify` y actualice los permisos en `localStorage`:

```javascript
setInterval(async () => {
  const response = await fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${token}` }});
  const data = await response.json();
  if (data.success && data.usuario) {
    localStorage.setItem('usuario', JSON.stringify(data.usuario));
  }
}, 5 * 60 * 1000); // cada 5 minutos
```

### 5. Validación de contraseña inconsistente

- En `crearUsuario` **no hay validación de longitud mínima** de contraseña (solo valida que no sea vacía en la línea 75).
- En `resetearPassword` sí se valida (`>= 6 caracteres`).
- En `cambiarPassword` también se valida.

**Recomendación:** Agregar en `crearUsuario`:
```javascript
if (password.length < 6) {
  return res.status(400).json({ success: false, message: 'La contraseña debe tener al menos 6 caracteres.' });
}
```

---

## 🟢 Hallazgos Menores

### 6. Configuración PUT no registra auditoría

El endpoint `PUT /api/configuracion/:clave` (cambio de timeout) no registra quién lo modificó ni a qué valor. Al ser un cambio que afecta a todo el sistema, debería quedar en auditoría.

---

## ✅ Aspectos Correctamente Implementados

| Aspecto | Estado |
|---------|--------|
| Middleware `verifyToken` valida usuario activo en DB | ✅ Correcto |
| `requireAdmin` y `requireCargaOrAdmin` consistentes | ✅ Correcto |
| `requireModuloAccess` con lógica por rol bien segmentada | ✅ Correcto |
| Default "habilitado" para módulos sin registro explícito | ✅ Correcto |
| Rutas de módulos protegidas con `router.use(verifyToken, requireModuloAccess)` | ✅ Correcto |
| Rutas admin (`/usuarios`, `/auditoria`) con `requireAdmin` | ✅ Correcto |
| bcrypt con salt factor 10 para hashing | ✅ Correcto |
| Auditoría silenciosa (no bloquea operación principal) | ✅ Correcto |
| Timeout configurable con modal de advertencia | ✅ Correcto |
| Protección frontend contra acceso directo por URL | ✅ Correcto |
| Migración SQL con índices en `auditoria` | ✅ Correcto |
| Foreign keys con `ON DELETE CASCADE` en `permisos_modulos` | ✅ Correcto |
| Auto-protección: admin no puede desactivarse a sí mismo | ✅ Correcto |

---

## Prioridad de Acción Sugerida

| # | Hallazgo | Esfuerzo | Impacto |
|---|----------|----------|---------|
| 1 | Agregar auditoría a los 14 controllers | Medio (~2h) | 🔴 Crítico |
| 2 | Parametrizar LIMIT/OFFSET | Bajo (5 min) | 🔴 Crítico |
| 5 | Validar contraseña en creación | Bajo (2 min) | 🟡 Importante |
| 6 | Auditar cambios de configuración | Bajo (5 min) | 🟢 Menor |
| 4 | Refrescar permisos periódicamente | Medio (15 min) | 🟡 Importante |
| 3 | Token blacklist al logout | Alto (~1h) | 🟡 Futuro |
