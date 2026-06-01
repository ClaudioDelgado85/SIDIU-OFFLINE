// config/jwt.js
// Configuracion centralizada para JWT.

require('dotenv').config();

const DEFAULT_DEV_SECRET = 'sidiu_offline_desarrollo_local_cambiar_en_produccion_2026';

function getJwtSecret() {
  const configuredSecret = process.env.JWT_SECRET && process.env.JWT_SECRET.trim();

  if (configuredSecret) {
    return configuredSecret;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET no esta configurado.');
  }

  return DEFAULT_DEV_SECRET;
}

function getJwtExpiresIn() {
  return process.env.JWT_EXPIRES_IN || '8h';
}

module.exports = {
  getJwtSecret,
  getJwtExpiresIn
};
