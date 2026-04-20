# ✅ Pendientes para Producción (Hostinger)

Checklist de tareas a realizar antes del despliegue final en Hostinger.

---

## Seguridad

- [ ] **CORS:** Cambiar `CORS_ORIGIN` de `*` al dominio exacto de Hostinger (ej: `https://tudominio.com`)
  - Archivo: `server.js` línea 36 o variable de entorno `CORS_ORIGIN`
- [ ] **JWT Secret:** Generar un secret fuerte y configurarlo en las variables de entorno de Hostinger
  - Comando: `openssl rand -hex 32`
  - NO usar el placeholder de desarrollo

## Base de Datos

- [ ] Importar `database/schema_unificado.sql` en MySQL de Hostinger (incluye tablas + datos iniciales)
- [ ] Ejecutar `node scripts/seed-admin.js` para crear el usuario administrador
- [ ] Verificar que `DB_SSL` NO se configure (Hostinger usa MySQL local, no requiere SSL)

## Variables de Entorno (Hostinger)

```env
DB_HOST=localhost
DB_USER=tu_usuario_mysql_hostinger
DB_PASSWORD=tu_password_mysql_hostinger
DB_NAME=gestion_municipal
DB_PORT=3306
JWT_SECRET=<generado con openssl rand -hex 32>
NODE_ENV=production
CORS_ORIGIN=https://tu-dominio-hostinger.com
```

> ⚠️ **NO copiar** el `.env` de desarrollo. Crear uno nuevo con las credenciales de Hostinger.

---

*Última actualización: 17/04/2026*
