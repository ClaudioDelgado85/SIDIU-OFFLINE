-- ==========================================================
-- SISTEMA DE GESTIÓN MUNICIPAL - CLORINDA
-- ESQUEMA UNIFICADO (Generado Automáticamente)
-- Fecha: 28/3/2026, 04:27:10
-- ==========================================================

SET FOREIGN_KEY_CHECKS = 0;

-- Estructura para la tabla: auditoria
DROP TABLE IF EXISTS `auditoria`;
CREATE TABLE `auditoria` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `usuario_nombre` varchar(255) DEFAULT NULL,
  `accion` enum('crear','editar','eliminar','login','logout','cambio_estado') NOT NULL,
  `modulo` varchar(50) NOT NULL,
  `registro_id` int(11) DEFAULT NULL,
  `descripcion` text DEFAULT NULL,
  `datos_anteriores` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_anteriores`)),
  `datos_nuevos` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL CHECK (json_valid(`datos_nuevos`)),
  `ip_address` varchar(45) DEFAULT NULL,
  `fecha` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_auditoria_usuario` (`usuario_id`),
  KEY `idx_auditoria_modulo` (`modulo`),
  KEY `idx_auditoria_fecha` (`fecha`),
  KEY `idx_auditoria_accion` (`accion`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=156 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: barrios
DROP TABLE IF EXISTS `barrios`;
CREATE TABLE `barrios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: catalogos
DROP TABLE IF EXISTS `catalogos`;
CREATE TABLE `catalogos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `categoria` varchar(50) NOT NULL COMMENT 'Identificador de la categoría (ej: tipo_intimacion, intimacion_por)',
  `valor` varchar(100) NOT NULL COMMENT 'Valor interno que se guarda en los registros',
  `label` varchar(150) NOT NULL COMMENT 'Texto visible al usuario',
  `orden` int(11) DEFAULT 0 COMMENT 'Orden de aparición en los selects',
  `activo` tinyint(1) DEFAULT 1 COMMENT 'Soft delete: 0 = desactivado',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_categoria_valor` (`categoria`,`valor`),
  KEY `idx_categoria_activo` (`categoria`,`activo`)
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: comercios
DROP TABLE IF EXISTS `comercios`;
CREATE TABLE `comercios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_relevamiento` date NOT NULL,
  `nombre_propietario` varchar(255) DEFAULT NULL,
  `dni_propietario` varchar(20) DEFAULT NULL,
  `direccion_comercial` varchar(255) NOT NULL,
  `rubro` varchar(100) DEFAULT NULL,
  `esta_habilitado` tinyint(1) DEFAULT 0,
  `numero_resolucion` varchar(50) DEFAULT NULL,
  `necesita_reempadronamiento` tinyint(1) DEFAULT 0,
  `observaciones` text DEFAULT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_comercios_propietario` (`nombre_propietario`),
  KEY `idx_comercios_dni` (`dni_propietario`),
  KEY `idx_comercios_rubro` (`rubro`),
  KEY `idx_comercios_habilitado` (`esta_habilitado`),
  KEY `idx_comercios_fecha` (`fecha_relevamiento`),
  KEY `fk_comercios_barrio` (`barrio_id`),
  CONSTRAINT `fk_comercios_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: configuracion_sistema
DROP TABLE IF EXISTS `configuracion_sistema`;
CREATE TABLE `configuracion_sistema` (
  `clave` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: contador_reclamos
DROP TABLE IF EXISTS `contador_reclamos`;
CREATE TABLE `contador_reclamos` (
  `anio` int(11) NOT NULL,
  `ultimo_numero` int(11) DEFAULT 0,
  PRIMARY KEY (`anio`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: expedientes
DROP TABLE IF EXISTS `expedientes`;
CREATE TABLE `expedientes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `numero_expediente` varchar(50) NOT NULL,
  `nombre_apellido` varchar(255) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `motivo` text NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `numero_partida` varchar(50) DEFAULT NULL,
  `estado` enum('ingreso','en_inspeccion','plazo_otorgado','salida') NOT NULL DEFAULT 'ingreso',
  `fecha_inspeccion` date DEFAULT NULL,
  `plazo_dias` int(11) DEFAULT NULL,
  `fecha_salida` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_expediente` (`numero_expediente`),
  KEY `idx_numero_expediente` (`numero_expediente`),
  KEY `idx_dni` (`dni`),
  KEY `idx_nombre` (`nombre_apellido`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_estado` (`estado`),
  KEY `fk_expedientes_barrio` (`barrio_id`),
  CONSTRAINT `fk_expedientes_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: infracciones
DROP TABLE IF EXISTS `infracciones`;
CREATE TABLE `infracciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `nombre_apellido` varchar(255) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `numero_acta` varchar(50) NOT NULL,
  `direccion` text NOT NULL,
  `motivo_infraccion` text NOT NULL,
  `observaciones` text DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_acta` (`numero_acta`),
  KEY `idx_numero_acta` (`numero_acta`),
  KEY `idx_dni` (`dni`),
  KEY `idx_nombre` (`nombre_apellido`),
  KEY `idx_fecha` (`fecha`),
  KEY `fk_infracciones_barrio` (`barrio_id`),
  CONSTRAINT `fk_infracciones_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: intimaciones
DROP TABLE IF EXISTS `intimaciones`;
CREATE TABLE `intimaciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `tipo` varchar(50) NOT NULL DEFAULT 'general',
  `nombre_apellido` varchar(100) NOT NULL,
  `dni` varchar(20) NOT NULL,
  `direccion` varchar(200) NOT NULL,
  `tipo_obstruccion` varchar(100) DEFAULT NULL,
  `plazo_dias` int(11) DEFAULT 0,
  `numero_intimacion` int(11) DEFAULT 1,
  `dio_cumplimiento` tinyint(1) DEFAULT 0,
  `fecha_subsanacion` date DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `estado` enum('vigente','proxima_vencer','vencida','cumplida','reiterada','infraccionado') DEFAULT 'vigente',
  `infraccion_realizada` tinyint(1) DEFAULT 0,
  `numero_infraccion` varchar(50) DEFAULT NULL,
  `fecha_infraccion` date DEFAULT NULL,
  `propietario_no_ubicado` tinyint(1) DEFAULT 0,
  `marca` varchar(50) DEFAULT NULL,
  `modelo` varchar(50) DEFAULT NULL,
  `color` varchar(30) DEFAULT NULL,
  `dominio` varchar(20) DEFAULT NULL,
  `fecha_retiro` date DEFAULT NULL,
  `lugar_deposito` varchar(200) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  `foto_inicial` text DEFAULT NULL,
  `foto_actual` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_intimaciones_barrio` (`barrio_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_tipo` (`tipo`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_dni` (`dni`),
  KEY `idx_nombre` (`nombre_apellido`),
  CONSTRAINT `fk_intimaciones_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=43 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: permisos_modulos
DROP TABLE IF EXISTS `permisos_modulos`;
CREATE TABLE `permisos_modulos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `modulo` varchar(50) NOT NULL,
  `habilitado` tinyint(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_usuario_modulo` (`usuario_id`,`modulo`),
  CONSTRAINT `fk_permisos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: reclamos
DROP TABLE IF EXISTS `reclamos`;
CREATE TABLE `reclamos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_reclamo` varchar(20) NOT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `tipo_reclamo` enum('alumbrado','baldio','ruidos','animales','cloacas','obras','varios') NOT NULL,
  `descripcion` text NOT NULL,
  `direccion_incidente` varchar(255) NOT NULL,
  `denunciado_nombre` varchar(255) DEFAULT NULL,
  `denunciado_dni` varchar(20) DEFAULT NULL,
  `denunciado_direccion` text DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `vecino_nombre` varchar(100) DEFAULT NULL,
  `vecino_telefono` varchar(50) DEFAULT NULL,
  `estado` enum('pendiente','en_proceso','resuelto','anulado') DEFAULT 'pendiente',
  `prioridad` enum('baja','media','alta','urgente') DEFAULT 'media',
  `fecha_resolucion` date DEFAULT NULL,
  `observaciones_resolucion` text DEFAULT NULL,
  `usuario_creador_id` int(11) DEFAULT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `foto_inicial` text DEFAULT NULL,
  `foto_actual` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_reclamo` (`numero_reclamo`),
  KEY `usuario_creador_id` (`usuario_creador_id`),
  KEY `fk_reclamos_barrio` (`barrio_id`),
  KEY `idx_estado` (`estado`),
  KEY `idx_tipo_reclamo` (`tipo_reclamo`),
  KEY `idx_fecha_creacion` (`fecha_creacion`),
  CONSTRAINT `fk_reclamos_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`),
  CONSTRAINT `reclamos_ibfk_1` FOREIGN KEY (`usuario_creador_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: relevamientos
DROP TABLE IF EXISTS `relevamientos`;
CREATE TABLE `relevamientos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_relevamiento` varchar(20) NOT NULL,
  `fecha_relevamiento` date NOT NULL,
  `tipo_relevamiento` enum('baldio','obra','ocupacion','comercio','varios') NOT NULL,
  `ubicacion` varchar(255) NOT NULL,
  `zona` varchar(100) DEFAULT NULL,
  `responsable_nombre` varchar(255) DEFAULT NULL,
  `responsable_dni` varchar(20) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `foto_url` varchar(255) DEFAULT NULL,
  `tiene_autorizacion` tinyint(1) DEFAULT 0,
  `paga_canon` tinyint(1) DEFAULT 0,
  `fecha_vencimiento_canon` date DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `barrio_id` int(11) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_relevamiento` (`numero_relevamiento`),
  KEY `idx_tipo` (`tipo_relevamiento`),
  KEY `idx_responsable` (`responsable_nombre`),
  KEY `fk_relevamientos_barrio` (`barrio_id`),
  CONSTRAINT `fk_relevamientos_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: tareas_diarias
DROP TABLE IF EXISTS `tareas_diarias`;
CREATE TABLE `tareas_diarias` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha` date NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `descripcion` text NOT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `categoria_id` int(11) NOT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_fecha` (`fecha`),
  KEY `idx_categoria` (`categoria_id`),
  KEY `fk_tareas_barrio` (`barrio_id`),
  CONSTRAINT `fk_tareas_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`),
  CONSTRAINT `fk_tareas_categoria` FOREIGN KEY (`categoria_id`) REFERENCES `catalogos` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: usuarios
DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(255) NOT NULL,
  `usuario` varchar(100) NOT NULL,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `rol` enum('admin_total','carga','consulta') NOT NULL,
  `activo` tinyint(1) DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `usuario` (`usuario`),
  UNIQUE KEY `idx_email_unico` (`email`),
  KEY `idx_usuario` (`usuario`),
  KEY `idx_rol` (`rol`)
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la tabla: vendedores_ambulantes
DROP TABLE IF EXISTS `vendedores_ambulantes`;
CREATE TABLE `vendedores_ambulantes` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `fecha_relevamiento` date NOT NULL,
  `nombre_vendedor` varchar(255) DEFAULT NULL,
  `dni_vendedor` varchar(20) DEFAULT NULL,
  `ubicacion` varchar(255) NOT NULL,
  `rubro` varchar(100) DEFAULT NULL,
  `tiene_autorizacion` tinyint(1) DEFAULT 0,
  `pago_canon` tinyint(1) DEFAULT 0,
  `numero_recibo` varchar(50) DEFAULT NULL,
  `fecha_vencimiento_canon` date DEFAULT NULL,
  `dias_vigencia` int(11) DEFAULT NULL,
  `observaciones` text DEFAULT NULL,
  `barrio_id` int(11) DEFAULT NULL,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `idx_vendedores_nombre` (`nombre_vendedor`),
  KEY `idx_vendedores_dni` (`dni_vendedor`),
  KEY `idx_vendedores_rubro` (`rubro`),
  KEY `idx_vendedores_autorizacion` (`tiene_autorizacion`),
  KEY `idx_vendedores_fecha` (`fecha_relevamiento`),
  KEY `fk_vendedores_barrio` (`barrio_id`),
  CONSTRAINT `fk_vendedores_barrio` FOREIGN KEY (`barrio_id`) REFERENCES `barrios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Estructura para la vista: vista_alertas_intimaciones
DROP VIEW IF EXISTS `vista_alertas_intimaciones`;
CREATE VIEW `vista_alertas_intimaciones` AS select `i`.`id` AS `id`,`i`.`tipo` AS `tipo`,`i`.`nombre_apellido` AS `nombre_apellido`,`i`.`dni` AS `dni`,`i`.`direccion` AS `direccion`,`i`.`fecha` AS `fecha_intimacion`,`i`.`fecha` + interval `i`.`plazo_dias` day AS `fecha_vencimiento`,`i`.`plazo_dias` AS `plazo_dias`,`i`.`numero_intimacion` AS `numero_intimacion`,`i`.`barrio_id` AS `barrio_id`,case when `i`.`dio_cumplimiento` = 1 then 'cumplida' when curdate() > `i`.`fecha` + interval `i`.`plazo_dias` day then 'vencida' when to_days(`i`.`fecha` + interval `i`.`plazo_dias` day) - to_days(curdate()) <= 3 then 'proxima_vencer' else 'vigente' end AS `estado_calculado`,to_days(`i`.`fecha` + interval `i`.`plazo_dias` day) - to_days(curdate()) AS `dias_restantes` from `intimaciones` `i` where `i`.`dio_cumplimiento` = 0 order by `i`.`fecha` + interval `i`.`plazo_dias` day;

-- Estructura para la vista: vista_dashboard_resumen
DROP VIEW IF EXISTS `vista_dashboard_resumen`;
CREATE VIEW `vista_dashboard_resumen` AS select (select count(0) from `expedientes` where month(`expedientes`.`fecha`) = month(curdate()) and year(`expedientes`.`fecha`) = year(curdate())) AS `expedientes_mes`,(select count(0) from `intimaciones` where month(`intimaciones`.`fecha`) = month(curdate()) and year(`intimaciones`.`fecha`) = year(curdate())) AS `intimaciones_mes`,(select count(0) from `infracciones` where month(`infracciones`.`fecha`) = month(curdate()) and year(`infracciones`.`fecha`) = year(curdate())) AS `infracciones_mes`,(select count(0) from `reclamos` where month(`reclamos`.`fecha_creacion`) = month(curdate()) and year(`reclamos`.`fecha_creacion`) = year(curdate())) AS `reclamos_mes`,(select count(0) from `relevamientos` where month(`relevamientos`.`fecha_relevamiento`) = month(curdate()) and year(`relevamientos`.`fecha_relevamiento`) = year(curdate())) AS `relevamientos_mes`,(select count(0) from `intimaciones` where curdate() <= `intimaciones`.`fecha` + interval `intimaciones`.`plazo_dias` day and to_days(`intimaciones`.`fecha` + interval `intimaciones`.`plazo_dias` day) - to_days(curdate()) <= 3 and `intimaciones`.`dio_cumplimiento` = 0) AS `alertas_proximas_vencer`,(select count(0) from `intimaciones` where curdate() > `intimaciones`.`fecha` + interval `intimaciones`.`plazo_dias` day and `intimaciones`.`dio_cumplimiento` = 0) AS `alertas_vencidas`,(select count(0) from `intimaciones` where `intimaciones`.`dio_cumplimiento` = 1 and month(`intimaciones`.`fecha_subsanacion`) = month(curdate()) and year(`intimaciones`.`fecha_subsanacion`) = year(curdate())) AS `alertas_cumplidas_mes`;

-- Estructura para la vista: vista_historial_contribuyente
DROP VIEW IF EXISTS `vista_historial_contribuyente`;
CREATE VIEW `vista_historial_contribuyente` AS select 'expediente' AS `tipo`,`e`.`id` AS `id`,`e`.`nombre_apellido` AS `nombre_apellido`,`e`.`dni` AS `dni`,`e`.`fecha` AS `fecha_registro`,`e`.`numero_expediente` AS `numero`,`e`.`motivo` AS `descripcion`,`e`.`estado` AS `estado`,NULL AS `direccion`,`e`.`barrio_id` AS `barrio_id` from `expedientes` `e` union all select 'intimacion' AS `intimacion`,`i`.`id` AS `id`,`i`.`nombre_apellido` AS `nombre_apellido`,`i`.`dni` AS `dni`,`i`.`fecha` AS `fecha`,concat(`i`.`numero_intimacion`,' - ',`i`.`tipo`) AS `CONCAT(i.numero_intimacion, ' - ', i.tipo)`,`i`.`tipo_obstruccion` AS `tipo_obstruccion`,`i`.`estado` AS `estado`,`i`.`direccion` AS `direccion`,`i`.`barrio_id` AS `barrio_id` from `intimaciones` `i` union all select 'infraccion' AS `infraccion`,`inf`.`id` AS `id`,`inf`.`nombre_apellido` AS `nombre_apellido`,`inf`.`dni` AS `dni`,`inf`.`fecha` AS `fecha`,`inf`.`numero_acta` AS `numero_acta`,`inf`.`motivo_infraccion` AS `motivo_infraccion`,'registrada' AS `registrada`,`inf`.`direccion` AS `direccion`,`inf`.`barrio_id` AS `barrio_id` from `infracciones` `inf` union all select 'reclamo_denunciado' AS `reclamo_denunciado`,`r`.`id` AS `id`,`r`.`denunciado_nombre` AS `denunciado_nombre`,`r`.`denunciado_dni` AS `denunciado_dni`,`r`.`fecha_creacion` AS `fecha_creacion`,`r`.`numero_reclamo` AS `numero_reclamo`,`r`.`tipo_reclamo` AS `tipo_reclamo`,`r`.`estado` AS `estado`,`r`.`denunciado_direccion` AS `denunciado_direccion`,`r`.`barrio_id` AS `barrio_id` from `reclamos` `r` union all select 'relevamiento' AS `relevamiento`,`rel`.`id` AS `id`,`rel`.`responsable_nombre` AS `responsable_nombre`,`rel`.`responsable_dni` AS `responsable_dni`,`rel`.`fecha_relevamiento` AS `fecha_relevamiento`,`rel`.`numero_relevamiento` AS `numero_relevamiento`,`rel`.`ubicacion` AS `ubicacion`,case when `rel`.`tiene_autorizacion` then 'autorizado' else 'no_autorizado' end AS `Name_exp_8`,`rel`.`ubicacion` AS `ubicacion`,`rel`.`barrio_id` AS `barrio_id` from `relevamientos` `rel` union all select 'comercio' AS `comercio`,`c`.`id` AS `id`,`c`.`nombre_propietario` AS `nombre_propietario`,`c`.`dni_propietario` AS `dni_propietario`,`c`.`fecha_relevamiento` AS `fecha_relevamiento`,NULL AS `NULL`,`c`.`rubro` AS `rubro`,case when `c`.`esta_habilitado` then 'habilitado' else 'no_habilitado' end AS `Name_exp_8`,`c`.`direccion_comercial` AS `direccion_comercial`,`c`.`barrio_id` AS `barrio_id` from `comercios` `c` union all select 'vendedor_ambulante' AS `vendedor_ambulante`,`v`.`id` AS `id`,`v`.`nombre_vendedor` AS `nombre_vendedor`,`v`.`dni_vendedor` AS `dni_vendedor`,`v`.`fecha_relevamiento` AS `fecha_relevamiento`,NULL AS `NULL`,`v`.`rubro` AS `rubro`,case when `v`.`tiene_autorizacion` then 'autorizado' else 'no_autorizado' end AS `Name_exp_8`,`v`.`ubicacion` AS `ubicacion`,`v`.`barrio_id` AS `barrio_id` from `vendedores_ambulantes` `v` order by `fecha_registro` desc;

SET FOREIGN_KEY_CHECKS = 1;
