**PLANIFICACIÓN DEL SISTEMA\
**

Gestión de Oficina Municipal

*Sistema Integral de Registro y Reportes\
*

Fecha: 30 de Enero de 2026

# 1. RESUMEN EJECUTIVO

Este documento presenta la planificación completa de un sistema web
integral para la gestión de actividades de oficina municipal, diseñado
específicamente para el registro, seguimiento y generación de informes
de expedientes, intimaciones, infracciones, reclamos vecinales y
relevamientos de vía pública.

## 1.1 Objetivo Principal

Desarrollar una aplicación web que permita:

-   Registrar todas las tareas y actividades de la oficina municipal

-   Generar informes flexibles y personalizables (diarios, mensuales,
    anuales)

-   Visualizar estadísticas en tiempo real mediante un dashboard
    interactivo

-   Realizar seguimiento de plazos y alertas de vencimientos

-   Facilitar consultas por nombre, DNI, dirección y otros criterios

## 1.2 Usuarios del Sistema

El sistema está diseñado para máximo 5 usuarios de carga de datos, con
tres niveles de acceso diferenciados según su rol y responsabilidades.

## 1.3 Arquitectura Tecnológica

Aplicación web alojada en servidor cloud con acceso restringido por
autenticación. La interfaz de carga está optimizada para PC de
escritorio, mientras que las consultas e informes son responsive
(adaptables a dispositivos móviles).

# 2. USUARIOS Y ROLES DEL SISTEMA

## 2.1 Estructura de Roles

El sistema contempla tres niveles de acceso con permisos diferenciados:

  -----------------------------------------------------------------------
  **ROL**                 **PERMISOS**            **CANTIDAD**
  ----------------------- ----------------------- -----------------------
  Administrador Total     Acceso completo: crear, 1
                          modificar, eliminar,    
                          generar informes,       
                          gestionar usuarios      

  Usuario de Carga        Crear y modificar       Hasta 5
                          registros, consultar    
                          información             

  Usuario de Consulta     Solo lectura: consultar Variable
                          por nombre, DNI,        
                          dirección. No puede     
                          modificar               
  -----------------------------------------------------------------------

## 2.2 Datos de Usuario

Para cada usuario del sistema se registrará la siguiente información:

-   Nombre completo

-   Usuario (para login)

-   Email

-   Rol (administrador total, carga, consulta)

## 2.3 Nota Importante sobre Trazabilidad

El sistema NO registrará qué usuario cargó cada registro. Esta decisión
simplifica la interfaz y el flujo de trabajo según los requerimientos
específicos de la oficina.

# 3. MÓDULOS DEL SISTEMA

El sistema está compuesto por 5 módulos principales de registro, cada
uno con características y campos específicos:

1.  EXPEDIENTES

2.  INTIMACIONES

3.  INFRACCIONES

4.  RECLAMOS VECINALES

5.  RELEVAMIENTOS DE VÍA PÚBLICA

## 3.1 Módulo de EXPEDIENTES

### Descripción

Gestión del flujo completo de expedientes administrativos desde su
ingreso hasta su salida. Los expedientes pasan por diferentes estados
que reflejan su proceso dentro de la oficina.

### Campos del Registro

  -----------------------------------------------------------------------
  **CAMPO**               **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Fecha                   Fecha                   Fecha de ingreso

  Número de Expediente    Texto                   Formato: 11-V-2026
                                                  (manual)

  Nombre y Apellido       Texto                   Del contribuyente

  DNI                     Número                  Del contribuyente

  Motivo del Expediente   Texto                   Descripción del motivo

  Estado                  Selección               Ver tabla de estados
  -----------------------------------------------------------------------

### Estados del Expediente

  -----------------------------------------------------------------------
  **ESTADO**                          **DESCRIPCIÓN**
  ----------------------------------- -----------------------------------
  Ingresó                             El expediente ha sido registrado en
                                      el sistema

  En la oficina                       El expediente está siendo procesado

  Se dio cumplimiento                 El expediente ha sido resuelto

  Dio salida                          El expediente ha salido de la
                                      oficina
  -----------------------------------------------------------------------

## 3.2 Módulo de INTIMACIONES

### Descripción General

Este módulo gestiona las intimaciones a contribuyentes por obstrucción
de vía pública y otros problemas. Las intimaciones están enfocadas
principalmente en: escombros, arenas, restos de construcción,
construcción sin autorización, pérdida de agua servida, vehículos
abandonados y terrenos baldíos. Se pueden realizar hasta 3 intimaciones
por caso antes de labrar un acta de infracción.

### Tipos de Intimaciones

El sistema contempla tres tipos de intimaciones con diferentes niveles
de detalle:

6.  Intimaciones Generales (casos comunes de obstrucción)

7.  Intimaciones de Terrenos Baldíos (tratamiento prioritario con campos
    específicos)

8.  Intimaciones de Vehículos Abandonados (tratamiento prioritario con
    identificación del vehículo)

### Campos de Intimaciones Generales

  -----------------------------------------------------------------------
  **CAMPO**               **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Fecha de intimación     Fecha                   Fecha de emisión

  Nombre y apellido       Texto                   Del contribuyente
                                                  intimado

  DNI                     Número                  Del contribuyente

  Dirección del problema  Texto                   Ubicación de la
                                                  obstrucción

  Tipo de obstrucción     Selección/Texto         Escombros, arena,
                                                  construcción, etc.

  Plazo de cumplimiento   Número                  En DÍAS (manual, varía
                                                  según caso)

  Número de intimación    Selección               1ra, 2da o 3ra
                                                  intimación

  ¿Dio cumplimiento?      Sí/No                   Si subsanó el problema

  Fecha de subsanación    Fecha                   Cuando se solucionó el
                                                  problema

  Observaciones           Texto largo             Información adicional
                                                  relevante

  Estado                  Automático              Ver tabla de estados
  -----------------------------------------------------------------------

### Estados de Intimaciones

  -----------------------------------------------------------------------
  **ESTADO**                          **DESCRIPCIÓN**
  ----------------------------------- -----------------------------------
  Vigente/Pendiente                   La intimación está activa y el
                                      plazo no ha vencido

  Próxima a vencer                    Faltan 3 días o menos para el
                                      vencimiento

  Vencida                             El plazo ha pasado y no se ha
                                      cumplido

  Cumplida                            El contribuyente subsanó el
                                      problema
  -----------------------------------------------------------------------

### Campos Adicionales para Terrenos Baldíos

Incluye todos los campos de intimaciones generales, más:

  -----------------------------------------------------------------------
  **CAMPO ADICIONAL**     **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Infracción realizada    Sí/No                   Si se labró acta de
                                                  infracción

  Número de infracción    Texto                   Número del acta

  Fecha de infracción     Fecha                   Cuando se labró el acta

  Propietario no ubicado  Sí/No                   Si fue imposible dar
                                                  con el propietario

  Observaciones           Texto largo             Información adicional
  -----------------------------------------------------------------------

### Campos Adicionales para Vehículos Abandonados

Incluye todos los campos de terrenos baldíos, más:

  -----------------------------------------------------------------------
  **CAMPO ADICIONAL**     **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Marca del vehículo      Texto                   Ej: Ford, Chevrolet

  Modelo del vehículo     Texto                   Ej: Corsa, Focus

  Color                   Texto                   Color del vehículo

  Dominio/Patente         Texto                   Número de patente

  Fecha de retiro         Fecha                   Cuando se retiró el
                                                  vehículo

  Lugar de depósito       Texto                   Adónde se trasladó el
                                                  vehículo

  Observaciones           Texto largo             Información adicional
  -----------------------------------------------------------------------

**Nota importante:** Cada intimación (1ra, 2da o 3ra) se registra como
un registro INDEPENDIENTE pero vinculado por DNI/nombre y dirección del
contribuyente. Esto permite máxima flexibilidad en informes y
estadísticas por etapa de intimación.

## 3.3 Módulo de INFRACCIONES

### Descripción

Registro de actas de infracción labradas cuando el contribuyente no
cumple con las intimaciones (generalmente después de la 3ra intimación).
Las infracciones son registros informativos sin seguimiento de estados.

### Campos del Registro

  -----------------------------------------------------------------------
  **CAMPO**               **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Fecha                   Fecha                   Fecha de labrado del
                                                  acta

  Nombre y apellido       Texto                   Del infractor

  DNI                     Número                  Del infractor

  Número de acta          Texto                   Formato: 2026-0000045
                                                  (manual)

  Dirección               Texto                   Ubicación de la
                                                  infracción

  Motivo de infracción    Texto                   Descripción de la falta

  Observaciones           Texto largo             Información adicional
  -----------------------------------------------------------------------

**Nota importante:** Las infracciones son registros informativos SIN
seguimiento de estados (no tienen estados como pagada, impaga, etc.).
Solo se registran para fines estadísticos y de consulta.

## 3.4 Módulo de RECLAMOS VECINALES

### Descripción

Gestión de reclamos realizados por vecinos sobre diversos problemas en
la vía pública o relacionados con infracciones de otros contribuyentes.
Los datos del denunciante son opcionales para permitir reclamos
anónimos.

### Campos del Registro

  -----------------------------------------------------------------------
  **CAMPO**               **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Número de reclamo       Automático              Formato: 001/2026 (se
                                                  reinicia cada año)

  Fecha del reclamo       Fecha                   Fecha de ingreso del
                                                  reclamo

  \-\-- DATOS DEL                                 
  DENUNCIANTE                                     
  (OPCIONALES) \-\--                              

  Nombre del denunciante  Texto (opcional)        Puede quedar en blanco
                                                  (anonimato)

  DNI del denunciante     Número (opcional)       Puede quedar en blanco

  Dirección del           Texto (opcional)        Puede quedar en blanco
  denunciante                                     

  Teléfono del            Número (opcional)       Puede quedar en blanco
  denunciante                                     

  \-\-- DATOS DEL                                 
  DENUNCIADO                                      
  (OBLIGATORIOS) \-\--                            

  Nombre del denunciado   Texto                   Del infractor

  DNI del denunciado      Número                  Del infractor

  Dirección del problema  Texto                   Ubicación de la
                                                  infracción/problema

  Tipo/motivo del reclamo Texto/Selección         Descripción del
                                                  problema

  Estado                  Selección               Pendiente, En proceso,
                                                  Resuelto

  Observaciones           Texto largo             Información adicional
  -----------------------------------------------------------------------

## 3.5 Módulo de RELEVAMIENTOS DE VÍA PÚBLICA

### Descripción

Registro informativo de ocupación de vía pública por vendedores
ambulantes, gastronómicos, casillas, etc. Este módulo NO tiene
seguimiento de estados ni alertas, es únicamente informativo para
conocer qué existe en la vía pública.

### Campos del Registro

  -----------------------------------------------------------------------
  **CAMPO**               **TIPO**                **OBSERVACIONES**
  ----------------------- ----------------------- -----------------------
  Fecha del relevamiento  Fecha                   Cuando se realizó el
                                                  registro

  Tipo de ocupación       Selección/Texto         Vendedor ambulante,
                                                  gastronómico, casilla,
                                                  etc.

  Ubicación/dirección     Texto                   Dónde se encuentra

  Nombre del ocupante     Texto                   Si se puede identificar

  DNI                     Número                  Del ocupante

  ¿Tiene autorización?    Sí/No                   Si cuenta con permiso
                                                  oficial

  ¿Paga canon?            Sí/No                   Si abona el canon
                                                  correspondiente

  Número de recibo        Texto                   Si paga canon

  Fecha de vencimiento    Fecha                   Hasta cuándo tiene
  del canon                                       vigencia

  Días de vigencia        Número                  Cantidad de días
                                                  pagados (2, 3, 10,
                                                  etc.)

  Observaciones           Texto largo             Información adicional
  -----------------------------------------------------------------------

# 4. SISTEMA DE BÚSQUEDA Y CONSULTA

## 4.1 Cruzamiento de Datos

Una funcionalidad clave del sistema es el cruzamiento automático de
datos. Cuando se consulta por una persona (nombre o DNI), el sistema
mostrará un HISTORIAL COMPLETO con:

-   Todos sus expedientes

-   Todas sus intimaciones (y en qué estado están)

-   Todas sus infracciones

-   Si está en algún relevamiento

-   Si tiene reclamos asociados

Esto crea una FICHA ÚNICA DEL CONTRIBUYENTE que permite ver su
comportamiento completo y tener contexto.

## 4.2 Tipos de Búsquedas Disponibles

  -----------------------------------------------------------------------
  **CRITERIO DE BÚSQUEDA**            **DESCRIPCIÓN**
  ----------------------------------- -----------------------------------
  Por nombre o DNI                    Ver TODOS los registros de una
                                      persona (expedientes, intimaciones,
                                      infracciones, reclamos,
                                      relevamientos)

  Por dirección                       Ver todo lo relacionado a una
                                      ubicación específica

  Por número de expediente            Buscar un expediente específico

  Por número de acta                  Buscar una infracción específica

  Por número de reclamo               Buscar un reclamo específico

  Por rango de fechas                 Filtrar registros por período
  -----------------------------------------------------------------------

# 5. SISTEMA DE ALERTAS DE VENCIMIENTOS

## 5.1 Alertas en el Dashboard

El dashboard mostrará 3 tipos de alertas visuales:

  -----------------------------------------------------------------------
  **TIPO DE ALERTA**                  **CRITERIO**
  ----------------------------------- -----------------------------------
  Próximas a vencer                   Intimaciones que vencen en 3 días o
                                      menos

  Vencidas                            Intimaciones que ya pasaron su
                                      fecha de vencimiento sin cumplirse

  Cumplidas                           Intimaciones donde el contribuyente
                                      dio cumplimiento
  -----------------------------------------------------------------------

## 5.2 Alertas de Cánones

El sistema también puede generar alertas para relevamientos con cánones
vencidos, permitiendo identificar vendedores ambulantes o gastronómicos
que necesitan renovar su permiso.

# 6. SISTEMA DE INFORMES Y ESTADÍSTICAS

## 6.1 Flexibilidad Total en Informes

El sistema contará con un GENERADOR DE INFORMES FLEXIBLES que permite
combinar cualquier campo para crear reportes personalizados. Ejemplos de
consultas posibles:

-   Cantidad de expedientes por motivo

-   Cantidad de intimaciones por tipo y por período

-   Cuántos contribuyentes dieron cumplimiento después de la 1ra, 2da o
    3ra intimación

-   Vehículos abandonados por color (ej: todos los autos rojos)

-   Terrenos baldíos donde no se ubicó al propietario

-   Reclamos resueltos vs no resueltos por período

-   Vendedores ambulantes con canon vencido

-   Productividad: registros cargados por período

-   Cualquier combinación de filtros imaginable

## 6.2 Formatos de Exportación

Todos los informes podrán:

-   Visualizarse en pantalla (dashboard interactivo)

-   Exportarse a PDF (para imprimir o compartir)

-   Exportarse a Excel (para análisis adicional)

## 6.3 Dashboard Principal

El dashboard inicial mostrará:

-   Alertas de vencimientos (próximas, vencidas, cumplidas)

-   Resumen numérico (totales del mes/año actual)

-   Gráficos estadísticos (tipos más frecuentes, evolución temporal)

-   Últimos registros cargados

-   Accesos rápidos (botones para crear nuevos registros)

# 7. ARQUITECTURA TÉCNICA

## 7.1 Tecnología y Hosting

-   Aplicación web alojada en servidor cloud

-   Acceso mediante navegador web (sin instalación)

-   Base de datos relacional para integridad de datos

-   Backups automáticos en la nube

-   Conexión segura mediante HTTPS

## 7.2 Seguridad

-   Sistema de login con usuario y contraseña

-   Sesiones seguras con timeout automático

-   Encriptación de datos sensibles

-   Control de acceso por roles

-   Logs de auditoría (registro de acciones críticas)

-   Posibilidad de autenticación de dos factores (2FA) opcional

## 7.3 Acceso Multi-dispositivo

  -----------------------------------------------------------------------
  **DISPOSITIVO**                     **FUNCIONALIDAD**
  ----------------------------------- -----------------------------------
  PC de escritorio                    Carga completa de datos (optimizada
                                      para formularios extensos)

  Móviles/Tablets                     Consultas e informes (interfaz
                                      responsive adaptada)
  -----------------------------------------------------------------------

# 8. FUNCIONALIDADES PENDIENTES (NO PRIORITARIAS)

Las siguientes funcionalidades han sido identificadas pero NO son
prioritarias para la versión inicial:

-   Adjuntar archivos/documentos a los registros (fotos, PDFs
    escaneados, etc.)

-   Notificaciones por email de alertas de vencimientos

-   Generación automática de documentos oficiales (intimaciones, actas)

-   Integración con sistemas externos (catastro, rentas, etc.)

-   App móvil nativa (actualmente solo responsive web)

# 9. PRÓXIMOS PASOS PARA EL DESARROLLO

9.  Aprobación de esta planificación

10. Diseño de prototipos visuales (wireframes/mockups)

11. Desarrollo de la base de datos

12. Desarrollo del backend (API y lógica de negocio)

13. Desarrollo del frontend (interfaz de usuario)

14. Pruebas funcionales

15. Carga de datos de prueba

16. Capacitación de usuarios

17. Puesta en producción

18. Soporte y mantenimiento continuo

# 10. RESUMEN DE DECISIONES CLAVE

  -----------------------------------------------------------------------
  **ASPECTO**                         **DECISIÓN**
  ----------------------------------- -----------------------------------
  Usuarios máximos de carga           5 personas

  Niveles de acceso                   3 roles: Administrador Total,
                                      Usuario de Carga, Usuario de
                                      Consulta

  Trazabilidad de carga               NO se registra quién cargó cada
                                      dato

  Módulos principales                 5: Expedientes, Intimaciones,
                                      Infracciones, Reclamos,
                                      Relevamientos

  Intimaciones por caso               Hasta 3 intimaciones antes de
                                      infracción

  Registro de intimaciones            Cada intimación (1ra, 2da, 3ra) es
                                      un registro independiente

  Plazos de intimación                Ingreso manual en DÍAS (varía según
                                      caso)

  Alertas de vencimiento              3 días antes del plazo

  Tipos de alertas                    3: Próximas a vencer, Vencidas,
                                      Cumplidas

  Numeración automática               Solo reclamos vecinales (formato:
                                      001/2026)

  Numeración manual                   Expedientes e infracciones

  Reclamos anónimos                   Datos del denunciante opcionales

  Cruzamiento de datos                Ficha única por contribuyente con
                                      todo su historial

  Informes                            Flexibilidad total con filtros
                                      combinables

  Exportación                         Pantalla, PDF y Excel

  Hosting                             Servidor cloud con acceso web

  Carga de datos                      Optimizada para PC

  Consultas e informes                Responsive (PC y móviles)

  Adjuntar archivos                   Pendiente (no prioritario)
  -----------------------------------------------------------------------

**\-\-- FIN DEL DOCUMENTO DE PLANIFICACIÓN \-\--**
