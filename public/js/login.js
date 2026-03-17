// ============================================
// CONFIGURACIÓN
// ============================================

const API_URL = '/api';

// ============================================
// ELEMENTOS DEL DOM
// ============================================

const loginForm = document.getElementById('loginForm');
const usuarioInput = document.getElementById('usuario');
const passwordInput = document.getElementById('password');
const btnLogin = document.getElementById('btnLogin');
const btnText = document.getElementById('btnText');
const btnLoader = document.getElementById('btnLoader');
const errorMessage = document.getElementById('errorMessage');
const errorText = document.getElementById('errorText');

// ============================================
// FUNCIONES DE UTILIDAD
// ============================================

// Mostrar mensaje de error
function mostrarError(mensaje) {
    errorText.textContent = mensaje;
    errorMessage.style.display = 'flex';
    
    // Ocultar después de 5 segundos
    setTimeout(() => {
        errorMessage.style.display = 'none';
    }, 5000);
}

// Ocultar mensaje de error
function ocultarError() {
    errorMessage.style.display = 'none';
}

// Mostrar loader en el botón
function mostrarLoader() {
    btnLogin.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-block';
}

// Ocultar loader en el botón
function ocultarLoader() {
    btnLogin.disabled = false;
    btnText.style.display = 'inline';
    btnLoader.style.display = 'none';
}

// Guardar token en localStorage
function guardarToken(token) {
    localStorage.setItem('token', token);
}

// Guardar datos del usuario en localStorage
function guardarUsuario(usuario) {
    localStorage.setItem('usuario', JSON.stringify(usuario));
}

// ============================================
// MANEJO DEL FORMULARIO DE LOGIN
// ============================================

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    // Obtener valores
    const usuario = usuarioInput.value.trim();
    const password = passwordInput.value;
    
    // Validar campos
    if (!usuario || !password) {
        mostrarError('Por favor complete todos los campos');
        return;
    }
    
    // Ocultar errores previos y mostrar loader
    ocultarError();
    mostrarLoader();
    
    try {
        // Hacer petición al backend
        const response = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                usuario: usuario,
                password: password
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Login exitoso
            console.log('Login exitoso:', data);
            
            // Guardar token y datos del usuario (incluyendo permisos)
            guardarToken(data.token);
            const usuarioData = data.usuario;
            if (data.configuracion) {
                usuarioData._timeout = data.configuracion.timeout_inactividad_minutos;
            }
            guardarUsuario(usuarioData);
            
            // Mostrar mensaje de éxito brevemente
            mostrarMensajeExito();
            
            // Redirigir al dashboard después de 1 segundo
            setTimeout(() => {
                window.location.href = '/dashboard.html';
            }, 1000);
            
        } else {
            // Error en el login
            mostrarError(data.message || 'Usuario o contraseña incorrectos');
            ocultarLoader();
        }
        
    } catch (error) {
        console.error('Error al hacer login:', error);
        mostrarError('Error de conexión. Verifique que el servidor esté corriendo.');
        ocultarLoader();
    }
});

// Mostrar mensaje de éxito
function mostrarMensajeExito() {
    btnLogin.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
    btnText.textContent = '¡Ingresando...';
    btnLoader.style.display = 'none';
    btnText.style.display = 'inline';
}

// ============================================
// VALIDACIÓN EN TIEMPO REAL
// ============================================

// Ocultar error al escribir
usuarioInput.addEventListener('input', ocultarError);
passwordInput.addEventListener('input', ocultarError);

// Enter en campo de usuario pasa a password
usuarioInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        e.preventDefault();
        passwordInput.focus();
    }
});

// ============================================
// VERIFICAR SI YA HAY SESIÓN ACTIVA
// ============================================

window.addEventListener('DOMContentLoaded', async () => {
    const token = localStorage.getItem('token');
    
    if (token) {
        // Verificar si el token es válido
        try {
            const response = await fetch(`${API_URL}/auth/verify`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            
            if (response.ok) {
                // Token válido, redirigir al dashboard
                window.location.href = '/dashboard.html';
            } else {
                // Token inválido, limpiar localStorage
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
            }
        } catch (error) {
            console.error('Error al verificar token:', error);
            // En caso de error, limpiar localStorage
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
        }
    }
});

// ============================================
// FOCUS AUTOMÁTICO
// ============================================

// Focus en el campo de usuario al cargar la página
window.addEventListener('load', () => {
    usuarioInput.focus();

    // Mostrar mensaje de sesión si existe (ej: "Sesión expirada por inactividad")
    const sessionMsg = sessionStorage.getItem('session_message');
    if (sessionMsg) {
        sessionStorage.removeItem('session_message');
        mostrarError(sessionMsg);
    }
});
