# Plan de Testing y Aseguramiento de Calidad (QA)
**Sistema de Gestión Municipal - Clorinda**

Este documento detalla la estrategia recomendada, herramientas y plan de acción paso a paso para comenzar la fase de pruebas formales del sistema.

---

## 1. Estrategia de Ramas (Git Branching)
Para no romper el código estable actual durante las pruebas, se recomienda el siguiente flujo:
1. Crear una rama dedicada al control de calidad desde tu rama principal (`develop` o `main`):
   ```bash
   git checkout -b qa
   ```
2. Todo el código de pruebas, configuración de librerías (Jest/Cypress) y **correcciones de bugs** detectados irán a esta rama `qa`.
3. Una vez que la suite completa de pruebas corra sin errores, se realizará el *merge* de `qa` hacia `main` (producción).

---

## 2. Niveles de Pruebas Recomendados (Pirámide de QA)

### A. Pruebas Unitarias y de Integración (Backend)
Son las pruebas más rápidas y económicas computacionalmente. Evalúan la "columna vertebral" del sistema (Node.js/Express) atacando los endpoints directamente simulando peticiones HTTP.
*   **Herramientas recomendadas:** `Jest` (Framework) + `Supertest` (Librería HTTP).
*   **Casos clave a cubrir:**
    *   Lógica matemática (`calcularEstadoAutomatico`, plazos de fechas).
    *   Rechazo correcto de autenticación (Middleware `auth.js` sin token).
    *   Validación de duplicados (No permitir crear dos usuarios con el mismo DNI).
    *   Restricción de permisos (Roles RBAC limitando accesos).

### B. Pruebas End-to-End E2E (Frontend/UI)
Simulan el comportamiento de un usuario humano interactuando con las pantallas del navegador, completando inputs y haciendo clic en botones.
*   **Herramientas recomendadas:** `Cypress` o `Playwright`.
*   **Casos clave a cubrir:**
    *   Flujo completo: *Login → Navegación a Intimaciones → Creación de nueva intimación → Verificación de aparición en tabla*.
    *   Comportamiento de la barra de búsqueda global.
    *   Renderizado condicional de la UI (Ej: Ocultar el botón "Generar Siguiente Instancia" en la 3ª intimación).

### C. QA Manual y Pruebas de Carga
Pruebas destructivas y de capacidad técnica que son difíciles de automatizar al 100%.
*   **Seguridad Manual:** Intentar forzar URLs (ej: `/auditoria.html`) con cuentas de bajo nivel (ej: `VENDEDOR`) para asegurar que el backend y frontend evitan el paso.
*   **Pruebas de Estrés (opcional):** Usar herramientas como `Artillery` para mandar cientos de peticiones simultáneas de inserción de actas y verificar cómo responde la base de datos MySQL (bloqueos, latencia).

---

## 3. Plan de Acción (Siguientes Pasos)

Para comenzar de forma progresiva, recomiendo el siguiente itinerario de ejecución:

- [ ] **Fase 1: Configurar Entorno Backend**
  - Instalar dependencias: `npm install --save-dev jest supertest`
  - Crear el script `"test"` en el `package.json`.
  - Crear la carpeta `/tests` estructurada (ej: `tests/controllers`, `tests/middlewares`).

- [ ] **Fase 2: Batería de Pruebas Críticas (Backend)**
  - Escribir pruebas para `auth.js` (Autenticación y RBAC).
  - Escribir pruebas para `intimacionesController.js`.
  - Escribir pruebas para el login y creación de `usuariosController.js`.

- [ ] **Fase 3: Ejecución y Corrección de Bugs**
  - Correr la suite (`npm test`).
  - Arreglar cualquier fallo (bug) que descubran los tests automatizados.

- [ ] **Fase 4: (Opcional) Configurar E2E Frontend**
  - Instalar `cypress`.
  - Crear pruebas visuales básicas del flujo principal de login y expedientes.
