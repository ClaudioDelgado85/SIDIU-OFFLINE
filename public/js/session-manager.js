// ============================================
// SESSION MANAGER — Control de inactividad
// Incluir en todas las páginas excepto login
// ============================================

(function () {
  'use strict';

  const API_URL = '/api';
  let timeoutMinutos = 30; // default, se actualiza desde el backend
  let inactivityTimer = null;
  let warningTimer = null;
  let warningModal = null;
  const WARNING_SECONDS = 60; // Mostrar advertencia 60 segundos antes

  // ============================================
  // INICIALIZACIÓN
  // ============================================

  async function init() {
    // Verificar que exista token
    const token = localStorage.getItem('token');
    if (!token) {
      redirigirALogin('Debe iniciar sesión para acceder.');
      return;
    }

    // Obtener configuración de timeout (puede venir del login o verificar)
    await cargarConfiguracion();

    // Configurar listeners de actividad
    configurarListenersActividad();

    // Iniciar timer
    resetTimer();
  }

  async function cargarConfiguracion() {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/configuracion`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data.timeout_inactividad_minutos) {
          timeoutMinutos = parseInt(data.data.timeout_inactividad_minutos) || 30;
        }
      } else if (response.status === 401) {
        // Token expirado
        cerrarSesion('Su sesión ha expirado. Inicie sesión nuevamente.');
        return;
      }
    } catch (error) {
      console.error('Error al cargar configuración de sesión:', error);
    }
  }

  // ============================================
  // LISTENERS DE ACTIVIDAD
  // ============================================

  function configurarListenersActividad() {
    const eventos = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    eventos.forEach(evento => {
      document.addEventListener(evento, () => {
        resetTimer();
      }, { passive: true });
    });
  }

  // ============================================
  // TIMER DE INACTIVIDAD
  // ============================================

  function resetTimer() {
    // Limpiar timers existentes
    if (inactivityTimer) clearTimeout(inactivityTimer);
    if (warningTimer) clearTimeout(warningTimer);

    // Ocultar modal de advertencia si existe
    ocultarModalWarning();

    const timeoutMs = timeoutMinutos * 60 * 1000;
    const warningMs = timeoutMs - (WARNING_SECONDS * 1000);

    // Timer para mostrar advertencia
    if (warningMs > 0) {
      warningTimer = setTimeout(() => {
        mostrarModalWarning();
      }, warningMs);
    }

    // Timer para cerrar sesión
    inactivityTimer = setTimeout(() => {
      cerrarSesion('Sesión cerrada por inactividad.');
    }, timeoutMs);
  }

  // ============================================
  // MODAL DE ADVERTENCIA
  // ============================================

  function mostrarModalWarning() {
    if (warningModal) return; // Ya está mostrándose

    warningModal = document.createElement('div');
    warningModal.id = 'session-warning-modal';
    warningModal.innerHTML = `
      <div class="session-warning-overlay"></div>
      <div class="session-warning-box">
        <div class="session-warning-icon">⏰</div>
        <h3>Sesión a punto de expirar</h3>
        <p>Su sesión se cerrará en <span id="session-countdown">${WARNING_SECONDS}</span> segundos por inactividad.</p>
        <button id="session-continue-btn" class="session-continue-btn">Continuar sesión</button>
      </div>
    `;

    // Estilos
    const style = document.createElement('style');
    style.id = 'session-warning-styles';
    style.textContent = `
      .session-warning-overlay {
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.6); z-index: 99998;
      }
      .session-warning-box {
        position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%);
        background: #1e293b; color: #f1f5f9; border-radius: 16px; padding: 32px 40px;
        text-align: center; z-index: 99999; min-width: 360px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        border: 1px solid rgba(255,255,255,0.1);
      }
      .session-warning-icon { font-size: 48px; margin-bottom: 12px; }
      .session-warning-box h3 { margin: 0 0 12px; font-size: 1.3rem; color: #fbbf24; }
      .session-warning-box p { margin: 0 0 20px; color: #94a3b8; font-size: 0.95rem; }
      .session-warning-box #session-countdown { color: #ef4444; font-weight: bold; font-size: 1.1em; }
      .session-continue-btn {
        background: linear-gradient(135deg, #3b82f6, #2563eb); color: white;
        border: none; padding: 12px 32px; border-radius: 8px; cursor: pointer;
        font-size: 1rem; font-weight: 600; transition: all 0.2s;
      }
      .session-continue-btn:hover { background: linear-gradient(135deg, #2563eb, #1d4ed8); transform: scale(1.02); }
    `;

    document.head.appendChild(style);
    document.body.appendChild(warningModal);

    // Botón de continuar
    document.getElementById('session-continue-btn').addEventListener('click', () => {
      resetTimer();
    });

    // Countdown
    let remaining = WARNING_SECONDS;
    const countdownEl = document.getElementById('session-countdown');
    const countdownInterval = setInterval(() => {
      remaining--;
      if (countdownEl) countdownEl.textContent = remaining;
      if (remaining <= 0) clearInterval(countdownInterval);
    }, 1000);

    warningModal._countdownInterval = countdownInterval;
  }

  function ocultarModalWarning() {
    if (warningModal) {
      if (warningModal._countdownInterval) clearInterval(warningModal._countdownInterval);
      warningModal.remove();
      warningModal = null;
      const styles = document.getElementById('session-warning-styles');
      if (styles) styles.remove();
    }
  }

  // ============================================
  // CERRAR SESIÓN
  // ============================================

  function cerrarSesion(mensaje) {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    sessionStorage.setItem('session_message', mensaje || 'Sesión cerrada.');
    window.location.href = '/login.html';
  }

  function redirigirALogin(mensaje) {
    sessionStorage.setItem('session_message', mensaje || '');
    window.location.href = '/login.html';
  }

  // ============================================
  // Función global para cerrar sesión desde otros scripts
  // ============================================
  window.cerrarSesionManual = function () {
    cerrarSesion('Sesión cerrada correctamente.');
  };

  // Función global para verificar si el token sigue válido
  window.verificarAutenticacion = async function () {
    const token = localStorage.getItem('token');
    if (!token) {
      redirigirALogin('Debe iniciar sesión.');
      return false;
    }

    try {
      const response = await fetch(`${API_URL}/auth/verify`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        cerrarSesion('Su sesión ha expirado.');
        return false;
      }

      return true;
    } catch (error) {
      return true; // Si hay error de red, no desloguear
    }
  };

  // Iniciar al cargar el DOM
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
