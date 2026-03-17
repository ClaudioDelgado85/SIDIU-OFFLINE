-- ============================================
-- MIGRACIÓN: Auditoría, Permisos de Módulos y Configuración del Sistema
-- Fecha: 2026-03-14
-- ============================================

USE gestion_municipal;

-- ============================================
-- 1. Tabla de auditoría
-- Registra todas las acciones de los usuarios
-- ============================================

CREATE TABLE IF NOT EXISTS `auditoria` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `usuario_nombre` VARCHAR(255) DEFAULT NULL,
  `accion` ENUM('crear','editar','eliminar','login','logout','cambio_estado') NOT NULL,
  `modulo` VARCHAR(50) NOT NULL,
  `registro_id` INT DEFAULT NULL,
  `descripcion` TEXT DEFAULT NULL,
  `datos_anteriores` JSON DEFAULT NULL,
  `datos_nuevos` JSON DEFAULT NULL,
  `ip_address` VARCHAR(45) DEFAULT NULL,
  `fecha` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY `idx_auditoria_usuario` (`usuario_id`),
  KEY `idx_auditoria_modulo` (`modulo`),
  KEY `idx_auditoria_fecha` (`fecha`),
  KEY `idx_auditoria_accion` (`accion`),
  CONSTRAINT `fk_auditoria_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 2. Tabla de configuración del sistema
-- Almacena parámetros globales (ej: timeout)
-- ============================================

CREATE TABLE IF NOT EXISTS `configuracion_sistema` (
  `clave` VARCHAR(50) NOT NULL,
  `valor` VARCHAR(255) NOT NULL,
  `descripcion` VARCHAR(255) DEFAULT NULL,
  PRIMARY KEY (`clave`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO `configuracion_sistema` (`clave`, `valor`, `descripcion`) VALUES
('timeout_inactividad_minutos', '30', 'Minutos de inactividad antes de cerrar sesión automáticamente');

-- ============================================
-- 3. Tabla de permisos por módulo
-- Solo aplica a usuarios con rol 'carga'
-- Admin tiene acceso total, consulta solo lee
-- ============================================

CREATE TABLE IF NOT EXISTS `permisos_modulos` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `usuario_id` INT NOT NULL,
  `modulo` VARCHAR(50) NOT NULL,
  `habilitado` TINYINT(1) NOT NULL DEFAULT 1,
  UNIQUE KEY `uk_usuario_modulo` (`usuario_id`, `modulo`),
  CONSTRAINT `fk_permisos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
