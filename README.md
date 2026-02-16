# Sistema de Gestión Municipal - Clorinda

Sistema web integral para la gestión de expedientes, intimaciones, infracciones, reclamos vecinales y relevamientos de vía pública.

## 📋 Requisitos

- Node.js (versión 16 o superior)
- MySQL (versión 5.7 o superior)
- npm (incluido con Node.js)

## 🚀 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd proyecto
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar base de datos

**a) Crear la base de datos:**

Ejecutar el archivo `database/schema.sql` en MySQL:

```bash
mysql -u root -p < database/schema.sql
```

O desde phpMyAdmin:
1. Importar el archivo `database/schema.sql`
2. La base de datos `gestion_municipal` se creará automáticamente

**b) Verificar que se creó correctamente:**

```sql
USE gestion_municipal;
SHOW TABLES;
```

Deberías ver 7 tablas:
- usuarios
- expedientes
- intimaciones
- infracciones
- reclamos_vecinales
- relevamientos
- contador_reclamos

### 4. Configurar variables de entorno

**a) Copiar el archivo de ejemplo:**

```bash
cp .env.example .env
```

**b) Editar el archivo `.env` con tus datos:**

```env
# Configuración del Servidor
PORT=3000
NODE_ENV=development

# Configuración de Base de Datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password_mysql
DB_NAME=gestion_municipal
DB_PORT=3306

# Configuración JWT
JWT_SECRET=genera_una_clave_secreta_aleatoria_muy_larga_12345
JWT_EXPIRES_IN=24h

# CORS
CORS_ORIGIN=http://localhost:3000
```

**⚠️ IMPORTANTE:** Cambia `JWT_SECRET` por una clave aleatoria y segura.

### 5. Iniciar el servidor

**Modo desarrollo (con auto-recarga):**
```bash
npm run dev
```

**Modo producción:**
```bash
npm start
```

El servidor estará corriendo en: `http://localhost:3000`

## 👤 Usuario por Defecto

Al instalar la base de datos, se crea un usuario administrador:

- **Usuario:** `admin`
- **Contraseña:** `admin123`

**⚠️ MUY IMPORTANTE:** Cambia esta contraseña inmediatamente después del primer login.

## 📁 Estructura del Proyecto

```
proyecto/
├── config/
│   └── database.js          # Configuración de MySQL
├── controllers/
│   ├── authController.js    # Controlador de autenticación
│   └── usuariosController.js # Controlador de usuarios
├── middleware/
│   └── auth.js              # Middleware de autenticación JWT
├── routes/
│   ├── authRoutes.js        # Rutas de autenticación
│   └── usuariosRoutes.js    # Rutas de usuarios
├── public/                  # Frontend (HTML, CSS, JS)
│   ├── index.html
│   ├── login.html
│   ├── dashboard.html
│   ├── css/
│   └── js/
├── database/
│   ├── schema.sql           # Schema de la base de datos
│   └── README.md            # Documentación de la BD
├── .env                     # Variables de entorno (NO subir a git)
├── .env.example             # Ejemplo de variables de entorno
├── .gitignore               # Archivos a ignorar en git
├── package.json             # Dependencias del proyecto
├── server.js                # Servidor principal
└── README.md                # Este archivo
```

## 🔌 API Endpoints

### Autenticación

| Método | Ruta | Descripción | Requiere Auth |
|--------|------|-------------|---------------|
| POST | `/api/auth/login` | Login de usuario | No |
| GET | `/api/auth/verify` | Verificar token | Sí |
| PUT | `/api/auth/cambiar-password` | Cambiar contraseña | Sí |

### Usuarios (Solo Admin)

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/usuarios` | Obtener todos los usuarios |
| GET | `/api/usuarios/:id` | Obtener un usuario por ID |
| POST | `/api/usuarios` | Crear nuevo usuario |
| PUT | `/api/usuarios/:id` | Actualizar usuario |
| DELETE | `/api/usuarios/:id` | Desactivar usuario |
| PUT | `/api/usuarios/:id/resetear-password` | Resetear contraseña |

### Ejemplo de Login

```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"usuario":"admin","password":"admin123"}'
```

### Ejemplo de petición autenticada

```bash
curl -X GET http://localhost:3000/api/usuarios \
  -H "Authorization: Bearer TU_TOKEN_JWT_AQUI"
```

## 🔒 Seguridad

- ✅ Autenticación con JWT
- ✅ Contraseñas hasheadas con bcrypt
- ✅ Rate limiting (límite de peticiones)
- ✅ Helmet para headers de seguridad
- ✅ CORS configurado
- ✅ Validación de roles y permisos

## 🚀 Deploy en Hostinger

### 1. Subir archivos

Sube todos los archivos del proyecto excepto:
- `node_modules/` (se instalará en el servidor)
- `.env` (se configurará en el servidor)
- `.git/`

### 2. Configurar base de datos en Hostinger

1. Crear base de datos MySQL desde el panel
2. Anotar: host, usuario, password, nombre de BD
3. Importar `database/schema.sql` desde phpMyAdmin

### 3. Configurar variables de entorno

Crear archivo `.env` en el servidor con datos de Hostinger:

```env
PORT=3000
NODE_ENV=production
DB_HOST=tu_host_mysql.hostinger.com
DB_USER=tu_usuario_mysql
DB_PASSWORD=tu_password_mysql
DB_NAME=tu_base_datos
JWT_SECRET=clave_secreta_muy_larga_y_aleatoria
CORS_ORIGIN=https://tu-dominio.com
```

### 4. Instalar dependencias

```bash
npm install --production
```

### 5. Iniciar aplicación

```bash
npm start
```

O configurar PM2 para mantenerla corriendo:

```bash
npm install -g pm2
pm2 start server.js --name gestion-municipal
pm2 save
pm2 startup
```

## 📝 Próximos Pasos

- [ ] Crear frontend (HTML/CSS/JS)
- [ ] Crear controladores para expedientes
- [ ] Crear controladores para intimaciones
- [ ] Crear controladores para infracciones
- [ ] Crear controladores para reclamos
- [ ] Crear controladores para relevamientos
- [ ] Crear sistema de búsqueda
- [ ] Crear dashboard con estadísticas
- [ ] Crear sistema de reportes

## 🐛 Troubleshooting

### Error: "Cannot connect to MySQL"

- Verificar que MySQL esté corriendo
- Verificar credenciales en `.env`
- Verificar que la base de datos existe

### Error: "Port already in use"

- Cambiar el PORT en `.env`
- O matar el proceso que está usando el puerto:
```bash
# Linux/Mac
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID [PID_NUMBER] /F
```

### Error: "Module not found"

```bash
rm -rf node_modules
npm install
```

## 📞 Soporte

Para dudas o problemas, contactar al equipo de desarrollo.

---

**Municipalidad de Clorinda** - Sistema de Gestión Municipal v1.0.0
