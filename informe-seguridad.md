# Informe de Seguridad - Sistema de Gestión Municipal Clorinda

**Fecha de análisis:** 17 de abril de 2026
**Tipo de proyecto:** Sistema Web Full-Stack (Node.js/Express + MySQL)
**Versión del análisis:** 1.0

---

## Resumen Ejecutivo

Este documento presenta el análisis de seguridad realizado sobre el Sistema de Gestión Municipal de Clorinda, una aplicación web para la gestión de expedientes, intimaciones, infracciones, reclamos y otros procesos municipales.

El sistema implementa controles de seguridad fundamentales como autenticación JWT, autorización basada en roles (RBAC), hashing de contraseñas con bcrypt y queries parametrizadas. Sin embargo, se identificaron **vulnerabilidades críticas** relacionadas principalmente con la gestión de credenciales y configuración de producción que requieren atención inmediata antes de un despliegue en producción.

---

## Stack Tecnológico

| Componente | Tecnología |
|------------|------------|
| Backend | Express.js 4.18.2 |
| Base de datos | MySQL (TiDB Cloud) |
| Autenticación | JWT (jsonwebtoken 9.0.2) + bcryptjs |
| Seguridad | helmet 7.1.0, express-rate-limit 7.1.5, cors |
| Subida de archivos | multer 2.1.1 |
| Frontend | HTML/CSS/JS vanilla (SPA) |

---

## Problemas Críticos

### 1. Credenciales Expuestas en Repositorio

**Severidad:** CRÍTICA
**Archivo:** `.env`

El archivo `.env` contiene credenciales sensibles en texto plano:

```env
DB_HOST=gateway01.us-east-1.prod.aws.tidbcloud.com
DB_USER=38jNZ816uJDMVZL.root
DB_PASSWORD=PlLcyF5fj2FfcN0g
JWT_SECRET=tu_clave_secreta_muy_segura_cambiala_en_produccion_12345
```

**Riesgo:** Si el repositorio es público o hay filtraciones, un atacante obtiene acceso completo a la base de datos en la nube.

**Mitigación:**
- Eliminar `.env` del repositorio (ya debería estar en `.gitignore`)
- Usar variables de entorno de la plataforma de hosting (Render Environment Variables)
- Rotar inmediatamente las credenciales de TiDB Cloud
- Implementar rotación de secrets periódica

---

### 2. JWT Secret Débil

**Severidad:** CRÍTICA
**Archivo:** `.env` línea `JWT_SECRET`

El secret actual es un placeholder reconocible:
```
tu_clave_secreta_muy_segura_cambiala_en_produccion_12345
```

**Riesgo:** Un atacante que conozca este string puede generar tokens JWT válidos para cualquier usuario, incluyendo administradores.

**Mitigación:**
- Generar un secret criptográficamente aleatorio (256 bits mínimo)
- Usar: `openssl rand -hex 32`
- Almacenar en variables de entorno, nunca en código
- Considerar usar JSON Web Key (JWK) para mayor seguridad

---

### 3. CORS Demasiado Permisivo en Producción

**Severidad:** CRÍTICA
**Archivo:** `render.yaml`

```yaml
CORS_ORIGIN=*
```

**Riesgo:** Cualquier sitio web puede realizar peticiones autenticadas al API, facilitando ataques CSRF y acceso no autorizado desde dominios maliciosos.

**Mitigación:**
- Especificar exactamente los orígenes permitidos
- Usar múltiples orígenes solo si es necesario (ej: dominio web + subdomain API)
- Considerar implementar validación de Origin header

---

## Problemas Medios

### 4. Content Security Policy Deshabilitada

**Severidad:** MEDIA
**Archivo:** `server.js`

```javascript
contentSecurityPolicy: false
```

**Riesgo:** Sin CSP, scripts inyectados vía XSS pueden ejecutarse sin restricciones.

**Nota:** Probablemente deshabilitado para permitir scripts inline del SPA. El frontend usa vanilla JS sin framework de templates.

**Mitigación:**
- Configurar CSP permitiendo inline solo donde sea necesario
- Implementar nonce-based inline scripts
- Migrar a un sistema de bundling que extraiga y hashifique scripts

---

### 5. Almacenamiento de JWT en localStorage

**Severidad:** MEDIA
**Archivos:** `public/js/session-manager.js`, `public/js/auth.js`

Los tokens JWT se almacenan en `localStorage`.

**Riesgo:** Vulnerable a ataques XSS, que pueden robar el token directamente desde el almacenamiento del navegador.

**Alternativas más seguras:**
- **Cookies httpOnly:** El token se almacena en una cookie con flags `HttpOnly`, `Secure` y `SameSite`
- **Silent refresh:** Renovar tokens automáticamente sin exposición a JavaScript

**Mitigación:**
- Si se mantiene localStorage, asegurar que la aplicación tenga validación estricta de inputs para prevenir XSS
- Implementar detección de manipulación de DOM

---

### 6. Falta Validación Centralizada de Inputs

**Severidad:** MEDIA
**Ubicación:** `controllers/*.js`

El proyecto tiene `express-validator` en dependencias pero no se observa uso consistente de schemas de validación centralizados.

**Riesgo:** Cada controller valida inputs manualmente, incrementando la probabilidad de inconsistencias y bypasses.

**Mitigación:**
- Implementar Joi o express-validator con schemas por entidad
- Crear middleware de validación reutilizable
- Validar tipos de datos, rangos, formatos y longitudes

---

### 7. Permisos Granulares de Archivos

**Severidad:** MEDIA
**Archivo:** `middleware/upload.js`

Las rutas de subida de archivos solo verifican `verifyToken` + acceso al módulo.

**Riesgo:** Un usuario con acceso a cualquier módulo podría subir archivos potencialmente maliciosos (aunque hay filtros de tipo MIME).

**Mitigación:**
- Implementar permisos específicos para subida de archivos
- Validar no solo tipo MIME sino también contenido (magic numbers)
- Escanear archivos con antivirus si es posible

---

### 8. Falta Separación de Duties para Admins

**Severidad:** MEDIA
**Archivo:** `controllers/usuariosController.js`

Un administrador puede crear otros administradores sin restricciones.

**Riesgo:** Un admin comprometido o malicioso puede escalar privilegios del sistema.

**Mitigación:**
- Requerir aprobación de múltiples admins para crear nuevos admins
- Implementar jerarquía de admins con diferentes niveles de permisos
- Registrar y notificar creación de nuevos admins

---

## Hallazgos Positivos

### Autenticación y Autorización

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Password hashing | ✅ Correcto | bcrypt con salt rounds de 10 |
| Contraseñas mínimas | ✅ Correcto | Mínimo 6 caracteres |
| Prevención enumeración | ✅ Correcto | Mensaje genérico "Usuario o contraseña incorrectos" |
| Timeout de sesión | ✅ Correcto | 30 minutos configurables |
| RBAC por módulos | ✅ Correcto | 3 roles: admin_total, carga, consulta |
| Permisos granulares | ✅ Correcto | Tabla permisos_modulos por usuario |

### Protección contra Inyecciones

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| SQL Injection | ✅ Protegido | Uso consistente de `db.pool.execute()` con parámetros |
| Query building | ✅ Correcto | Whitelist de campos permitidos en updates |

### Seguridad de Infraestructura

| Aspecto | Estado | Detalle |
|---------|--------|---------|
| Rate limiting | ✅ Activo | 100 req/15min en producción, 2000 en desarrollo |
| SSL Base de datos | ✅ Activo | `DB_SSL=true` |
| Auditoría completa | ✅ Implementado | Log de todas las operaciones CRUD con before/after |
| Dependencias actualizadas | ⚠️ Revisar | Express 4.18.2 (actualizar a 4.21+) |

---

## Recomendaciones Priorizadas

### Inmediato (antes de producción)

1. **Rotar todas las credenciales**
   - Contraseña de TiDB Cloud
   - JWT Secret
   - Cualquier API key en `.env`

2. **Configurar CORS correctamente**
   - Especificar origen exacto en `render.yaml`
   - No usar `*` en producción

3. **Mover secrets a variables de entorno de Render**
   - No commitear `.env` aunque esté en .gitignore
   - Usar Render Environment Variables

4. **Generar JWT Secret nuevo**
   ```bash
   openssl rand -hex 32
   ```

### Corto plazo (próximas 2-4 semanas)

5. **Implementar validación de inputs centralizada**
   - Crear schemas Joi/express-validator
   - Validación consistente en todos los endpoints

6. **Habilitar CSP con configuración adecuada**
   - Probar thoroughly después de configurar
   - Usar nonces para scripts inline si es posible

7. **Migrar JWT a cookies httpOnly**
   - Más seguro que localStorage contra XSS
   - Requiere cambios en frontend y backend

8. **Añadir headers de seguridad adicionales**
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `Strict-Transport-Security` (si hay HTTPS)

### Mediano plazo

9. **Implementar auditoría para admins**
   - Notificaciones al crear/modificar cuentas privilegiadas
   - Requiere approval workflow para nuevos admins

10. **Añadir validación de contenido de archivos**
    - Verificar magic numbers, no solo MIME type
    - Considerar escaneo antivirus

11. **Actualizar dependencias**
    - Express a 4.21+ (mejoras de seguridad)
    - Revisar vulnerabilidades conocidas con `npm audit`

---

## Checklist de Seguridad para Producción

- [ ] Credenciales de BD rotadas
- [ ] JWT Secret nuevo generado
- [ ] CORS configurado con orígenes específicos
- [ ] Secrets movidos a variables de entorno de hosting
- [ ] CSP habilitada y probada
- [ ] Rate limiting verificado en producción
- [ ] Timeout de sesión funcionando
- [ ] HTTPS forzado (redirect HTTP → HTTPS)
- [ ] Headers de seguridad adicionales
- [ ] Validación de inputs probada
- [ ] Logs de auditoría activos
- [ ] Dependencias actualizadas
- [ ] Backup de BD configurado
- [ ] Plan de recuperación de desastres documentado

---

## Conclusión

El proyecto tiene una base de seguridad sólida en cuanto a autenticación, autorización y protección contra SQL injection. Los principales riesgos están en la **gestión de credenciales** y la **configuración de producción**.

La mayoría de los problemas identificados pueden resolverse con cambios de configuración y mejores prácticas sin requerir refactoring significativo del código existente.

**Prioridad absoluta:** Resolver los 3 problemas críticos antes de cualquier despliegue en producción.

---

*Documento generado automáticamente tras análisis de seguridad del proyecto.*
