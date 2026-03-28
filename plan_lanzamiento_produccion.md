# FASE 7: Lanzamiento a Producción 🚀

Todo el trabajo de ingeniería de meses se condensa aquí. Nuestro entorno de QA ha probado ser robusto, la seguridad es extrema (Zero Trust) y nuestra base de datos está consolidada en un archivo maestro.

Es la hora de preparar todo para el despliegue final en línea. ¡El Sistema de Gestión Municipal estará vivo en internet!

## 📌 Contexto
Tu sistema consta de 3 capas esenciales que vamos a integrar en la nube:
1. **El Código Fuente:** Frontend (HTML/JS) y Backend (Node.js API).
2. **Base de Datos Prod:** El MySQL remoto que alojarás en tu proveedor (Hostinger).
3. **El Servidor Web (Hosting):** La máquina virtual que mantendrá el sistema encendido 24/7 (Render).

---

## 🔁 Secuencia Propuesta de Lanzamiento

### PASO 1: Rama `staging` (Pre-Producción en la Nube)
- En lugar de ir directo a `main`, crearemos la rama `staging` desde `qa`.
- Esta rama será nuestro banco de pruebas remoto. Todo lo que esté aquí irá a servidores gratuitos en la nube para asegurar que la app y la base de datos se conecten bien por internet (y no solo en tu PC).

### PASO 2: Base de Datos Gratuita en la Nube (Pruebas)
- Crearemos una cuenta en un proveedor que ofrezca **MySQL gratuito** (Opciones recomendadas: **Aiven** o **TiDB Cloud** o **Clever-Cloud**).
- Exportaremos allí el famoso `schema_unificado.sql`.
- Tu backend se conectará a esta DB remota, permitiéndote probar la latencia real por internet.

> **⚠️ Observación Técnica — SSL para MySQL Remoto:**
> La conexión a proveedores gratuitos de MySQL en la nube (Aiven, TiDB, Clever-Cloud) **requiere SSL obligatoriamente**. Será necesario agregar soporte SSL condicional en `config/database.js` (variable `DB_SSL=true`) antes del staging. Esto **NO afecta** a Hostinger en producción, ya que allí la app y la base de datos están en el mismo servidor/red interna y no requieren SSL.
>
> | Escenario | ¿Necesita SSL? |
> |-----------|----------------|
> | Local (tu PC) | ❌ No |
> | Hostinger (app + DB juntas) | ❌ No |
> | Render → Aiven/TiDB (staging) | ✅ Sí |

### PASO 3: Hosting Gratuito del Sistema (Render)
- Conectaremos GitHub a **Render** para alojar todo el código de Node.js.
- Configurarás las Variables de Entorno en Render usando las credenciales de tu DB MySQL gratuita.
- Iniciaremos el servidor y nos meteremos desde nuestro celular para hacer el "User Acceptance Testing" (Prueba de Aceptación Real).

> **📦 Optimización — Deploy liviano:**
> El archivo `render.yaml` usa `npm install --production`, lo que omite las dependencias de desarrollo (Cypress ~500MB, Jest, Nodemon, Supertest) e instala solo lo necesario para correr el servidor. Los archivos de documentación (`.md`), tests y configs de Cypress se suben al repo pero **no afectan el rendimiento** porque no se sirven al usuario ni se ejecutan en producción.

### PASO 4: Fusión Sagrada a Producción (`main` + Servidor Pago)
- Si todo anduvo perfecto en Staging y ni vos ni tus QA testers encontraron pantallazos de error 500, ¡es luz verde!
- Fusionaremos (Merge) `staging` hacia `main`.
- Ahí sí, levantarás tu servidor oficial y tu Hostinger de pago sabiendo que tu app es un tanque indomable.

### PASO 5: Variables y Entornos Privados
Nunca subiremos contraseñas reales a GitHub. Usaremos las credenciales (Host, Usuario, Password) que nos otorgue la base de datos de prueba en la nube, inyectándolas como variables de entorno directamente en el panel de control de Render (`DB_HOST`, `DB_USER`, `DB_PASSWORD`, `JWT_SECRET`).

> **⚠️ Recordatorio — CORS en Producción:**
> El archivo `render.yaml` actualmente tiene `CORS_ORIGIN: "*"` (acepta requests de cualquier origen). Esto es aceptable para staging/pruebas, pero **en producción (Hostinger) se debe cambiar al dominio real** del sistema, por ejemplo: `https://gestion.municipalidadclorinda.gob.ar`. Dejarlo como wildcard en producción es un riesgo de seguridad.

### PASO 6: Creación del Usuario Administrador
Antes de poder usar el sistema en producción, es necesario crear el primer usuario administrador en la base de datos. Sin este paso, nadie podrá iniciar sesión.

**Opciones para crearlo:**
1. **Por SQL directo** en el panel de Hostinger (phpMyAdmin):
   ```sql
   INSERT INTO usuarios (nombre_usuario, password_hash, nombre, apellido, rol)
   VALUES ('admin', '$2a$10$[hash_generado_con_bcrypt]', 'Administrador', 'Sistema', 'admin');
   ```
   *(El hash se genera localmente con `bcryptjs` antes de insertar)*

2. **Por script** ejecutando `node scripts/seed-admin.js` desde la terminal del servidor (si el hosting lo permite).

> **📝 Nota:** Una vez creado el admin, este puede crear los demás usuarios desde el panel de gestión de usuarios del sistema.

---
> **🛡️ Estrategia Staging (Seguridad Total):** Esta arquitectura te asegura no tocar tu servidor de pago (Producción) hasta que la app entera (con base de datos y Node) funcione perfecto por red de a pie (Staging). Tus ciudadanos nunca sufrirán una caída.

