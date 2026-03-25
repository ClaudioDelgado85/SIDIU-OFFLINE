# Plan de Testing y Aseguramiento de Calidad (QA)
**Sistema de Gestión Municipal - Clorinda**  
*Última actualización: 25/03/2026*

---

## 1. Estrategia de Ramas (Git Branching)

```bash
# 1. Guardar todo el trabajo actual
git add .
git commit -m "Rediseño visual y corrección lógica intimaciones"

# 2. Crear rama dedicada a QA
git checkout -b qa

# 3. (Al finalizar QA exitosamente) Merge a main
git checkout main
git merge qa
```

---

## 2. Niveles de Pruebas

### A. Pruebas de Backend / API (Integración)
**Herramientas:** `Jest` + `Supertest`

| Módulo | Casos a probar |
|--------|---------------|
| **Auth (login)** | Login exitoso, credenciales inválidas, token expirado, token ausente |
| **Middleware RBAC** | Admin accede a todo, roles limitados son rechazados en rutas protegidas |
| **Intimaciones** | CRUD completo, `calcularEstadoAutomatico` (vigente/vencida/reiterada), bloqueo de escalamiento en #3 |
| **Usuarios** | Crear usuario, rechazar DNI duplicado, resetear contraseña, toggle estado |
| **Expedientes** | CRUD completo, validación de campos obligatorios |
| **Reclamos** | Crear, editar estado, filtrar por tipo |
| **Infracciones** | Crear, vincular con intimación |
| **Comercios** | CRUD, validación de habilitación |
| **Vendedores** | CRUD, validación de autorización |
| **Dashboard** | KPIs calculados correctamente, manejo de datos null/vacíos sin romper |
| **Sesión/JWT** | Token expira correctamente, redirección al login |

### B. Pruebas End-to-End E2E (Frontend/UI) — **Obligatorio**
**Herramientas:** `Cypress`

| Flujo | Qué verifica |
|-------|-------------|
| **Login → Dashboard** | Ingreso exitoso, KPIs visibles, navbar completa |
| **Intimaciones** | Crear intimación, verificar tabla, botón → oculto en #3 |
| **Búsqueda Global** | Buscar por DNI, ver ficha contribuyente, exportar PDF |
| **Usuarios (Admin)** | Crear usuario, resetear contraseña, toggle activo/inactivo |
| **Permisos RBAC** | Usuario limitado NO ve módulos restringidos en navbar ni puede forzar URL |
| **Responsive** | Navbar y Dashboard se adaptan a pantallas pequeñas |

### C. QA Manual (Casos de Borde y Seguridad)

| Prueba | Descripción |
|--------|-------------|
| **Forzar URLs** | Ingresar con rol VENDEDOR e intentar acceder a `/auditoria.html` y `/usuarios.html` por URL directa |
| **Migraciones SQL** | Aplicar `schema.sql` + migraciones sobre una DB vacía y verificar que todo funcione |
| **Exportación** | Probar "Exportar Excel" y "Descargar PDF" en Búsqueda Global |
| **Fotos** | Subir, visualizar y eliminar fotos en Intimaciones |
| **Datos extremos** | Crear intimación con nombre de 200 caracteres, DNI con letras, fecha futura |

### D. Pruebas de Estrés *(Opcional)*
**Herramienta:** `Artillery`
- Simular 50-100 peticiones simultáneas a endpoints pesados (Dashboard, Búsqueda).
- Verificar que MySQL no genere deadlocks ni timeouts.

---

## 3. Plan de Acción (Fases)

- [ ] **Fase 1: Configurar Entorno**
  - `npm install --save-dev jest supertest`
  - Crear script `"test"` en `package.json`
  - Crear estructura `/tests/controllers/`, `/tests/middlewares/`

- [ ] **Fase 2: Pruebas Backend Críticas**
  - `auth.test.js` → Login + middleware de roles
  - `intimaciones.test.js` → CRUD + lógica de estados + bloqueo #3
  - `usuarios.test.js` → CRUD + duplicados + reset password
  - `dashboard.test.js` → KPIs con datos normales y vacíos

- [ ] **Fase 3: Pruebas Backend Secundarias**
  - `expedientes.test.js` → CRUD básico
  - `reclamos.test.js` → CRUD básico
  - `infracciones.test.js` → CRUD + vinculación
  - `comercios.test.js` y `vendedores.test.js` → CRUD

- [ ] **Fase 4: Ejecución y Corrección**
  - Correr suite completa (`npm test`)
  - Corregir bugs detectados
  - Documentar resultados

- [ ] **Fase 5: Pruebas E2E con Cypress**
  - `npm install --save-dev cypress`
  - Escribir flujos principales (Login, Intimaciones, Búsqueda)
  - Verificar UI responsive y permisos RBAC visual

- [ ] **Fase 6: QA Manual**
  - Ejecutar checklist manual de seguridad y casos de borde
  - Verificar migraciones SQL sobre DB limpia
  - Probar exportaciones (Excel/PDF)

- [ ] **Fase 7: Merge Final**
  - `git checkout main && git merge qa`
  - Deploy a producción (Render)
