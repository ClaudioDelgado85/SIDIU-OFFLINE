// ============================================
// NAVBAR GLOBAL — Navegación entre módulos
// Incluir este script en todas las páginas (excepto login)
// Adapta la navegación según el rol del usuario
// ============================================

(function () {
    // Definición de módulos con su ID para permisos
    const modulos = [
        {
            href: 'dashboard.html',
            label: 'Inicio',
            moduloId: null, // Siempre visible
            icon: '<svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>'
        },
        {
            href: 'expedientes.html',
            label: 'Expedientes',
            moduloId: 'expedientes',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>'
        },
        {
            href: 'intimaciones.html',
            label: 'Intimaciones',
            moduloId: 'intimaciones',
            icon: '<svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/></svg>'
        },
        {
            href: 'infracciones.html',
            label: 'Infracciones',
            moduloId: 'infracciones',
            icon: '<svg viewBox="0 0 24 24"><path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2"/></svg>'
        },
        {
            href: 'reclamos.html',
            label: 'Reclamos',
            moduloId: 'reclamos',
            icon: '<svg viewBox="0 0 24 24"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z"/><path d="M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>'
        },
        {
            href: 'relevamientos.html',
            label: 'Relevamientos',
            moduloId: 'relevamientos',
            icon: '<svg viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
        },
        {
            href: 'comercios.html',
            label: 'Comercios',
            moduloId: 'comercios',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 3h18v4H3zM4 7v12a1 1 0 001 1h14a1 1 0 001-1V7"/><path d="M10 12h4m-2-2v4"/></svg>'
        },
        {
            href: 'vendedores.html',
            label: 'Vendedores',
            moduloId: 'vendedores',
            icon: '<svg viewBox="0 0 24 24"><path d="M16 7a4 4 0 11-8 0 4 4 0 018 0z"/><path d="M12 14c-4.418 0-8 1.79-8 4v2h16v-2c0-2.21-3.582-4-8-4z"/></svg>'
        },
        {
            href: 'tareas_diarias.html',
            label: 'Tareas',
            moduloId: 'tareas',
            icon: '<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/></svg>'
        },
        {
            href: 'informe_diario.html',
            label: 'Informe',
            moduloId: null, // Siempre visible
            icon: '<svg viewBox="0 0 24 24"><path d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>'
        },
        {
            href: 'busqueda.html',
            label: 'Búsqueda',
            moduloId: null, // Siempre visible (todos pueden buscar)
            icon: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
        },
        {
            href: 'catalogos.html',
            label: 'Catálogos',
            moduloId: 'catalogos',
            icon: '<svg viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"/><circle cx="12" cy="12" r="3"/></svg>'
        }
    ];

    // Módulos solo para admin
    const modulosAdmin = [
        {
            href: 'usuarios.html',
            label: 'Usuarios',
            moduloId: null,
            adminOnly: true,
            icon: '<svg viewBox="0 0 24 24"><path d="M17 20h5V16c0-2-3-4-6-4h-5c-3 0-6 2-6 4v4h5M12 12a4 4 0 100-8 4 4 0 000 8z"/></svg>'
        },
        {
            href: 'auditoria.html',
            label: 'Auditoría',
            moduloId: null,
            adminOnly: true,
            icon: '<svg viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/><path d="M9 14l2 2 4-4"/></svg>'
        }
    ];

    // Obtener datos del usuario
    const usuarioData = JSON.parse(localStorage.getItem('usuario') || '{}');
    const rol = usuarioData.rol || 'consulta';
    const permisos = usuarioData.permisos || {};

    // Filtrar módulos según rol
    function moduloVisible(m) {
        // Módulos sin moduloId siempre son visibles
        if (!m.moduloId) return true;

        // Admin ve todo
        if (rol === 'admin_total') return true;

        // Consulta ve todo (solo lectura, restricción es en el backend)
        if (rol === 'consulta') return true;

        // Carga: verificar permisos específicos
        if (rol === 'carga') {
            // Si no hay permisos definidos, asumimos habilitado
            if (!permisos || Object.keys(permisos).length === 0) return true;
            // Si tiene un permiso definido, respetarlo
            if (permisos.hasOwnProperty(m.moduloId)) {
                return permisos[m.moduloId];
            }
            // Sin registro explícito = habilitado
            return true;
        }

        return true;
    }

    // Construir lista de módulos a mostrar
    let modulosVisibles = modulos.filter(moduloVisible);

    // Agregar módulos solo-admin
    if (rol === 'admin_total') {
        modulosVisibles = modulosVisibles.concat(modulosAdmin);
    }

    const paginaActual = window.location.pathname.split('/').pop() || 'dashboard.html';

    // Verificar acceso a la página actual
    const moduloActual = modulos.find(m => m.href === paginaActual);
    if (moduloActual && moduloActual.moduloId && rol === 'carga') {
        if (permisos && permisos.hasOwnProperty(moduloActual.moduloId) && !permisos[moduloActual.moduloId]) {
            // Redirigir al dashboard si no tiene acceso
            alert('No tiene acceso a este módulo. Contacte al administrador.');
            window.location.href = '/dashboard.html';
            return;
        }
    }

    // Verificar páginas solo-admin
    const paginasAdmin = ['auditoria.html', 'usuarios.html'];
    if (paginasAdmin.includes(paginaActual) && rol !== 'admin_total') {
        alert('Acceso denegado. Se requieren permisos de administrador.');
        window.location.href = '/dashboard.html';
        return;
    }

    const nav = document.createElement('nav');
    nav.className = 'navbar-modulos';
    nav.innerHTML = modulosVisibles.map(m => {
        const activo = paginaActual === m.href;
        return `<a href="${m.href}" class="navbar-link${activo ? ' active' : ''}" title="${m.label}">
            <span class="navbar-icon">${m.icon}</span>
            <span class="navbar-label">${m.label}</span>
        </a>`;
    }).join('');

    // Insertar después del header
    const header = document.querySelector('.dashboard-header');
    if (header) {
        header.insertAdjacentElement('afterend', nav);
    }

    // Agregar indicador de rol y botón de logout al header
    if (header) {
        const rolLabels = {
            'admin_total': 'Administrador',
            'carga': 'Usuario de Carga',
            'consulta': 'Solo Consulta'
        };

        const userInfo = document.createElement('div');
        userInfo.className = 'navbar-user-info';
        userInfo.innerHTML = `
            <span class="navbar-user-name">${usuarioData.nombre_completo || 'Usuario'}</span>
            <span class="navbar-user-role rol-${rol}">${rolLabels[rol] || rol}</span>
            <button class="navbar-logout-btn" id="btnNavbarLogout" title="Cerrar sesión">
                <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16,17 21,12 16,7"/><line x1="21" y1="12" x2="9" y2="12"/>
                </svg>
            </button>
        `;

        // Estilos del user info
        const style = document.createElement('style');
        style.textContent = `
            .navbar-user-info {
                display: flex; align-items: center; gap: 10px;
                position: absolute; right: 20px; top: 50%;
                transform: translateY(-50%);
            }
            .navbar-user-name {
                color: #e2e8f0; font-size: 0.85rem; font-weight: 500;
            }
            .navbar-user-role {
                font-size: 0.7rem; padding: 2px 8px; border-radius: 10px;
                font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;
            }
            .navbar-user-role.rol-admin_total {
                background: rgba(239,68,68,0.2); color: #fca5a5; border: 1px solid rgba(239,68,68,0.3);
            }
            .navbar-user-role.rol-carga {
                background: rgba(59,130,246,0.2); color: #93c5fd; border: 1px solid rgba(59,130,246,0.3);
            }
            .navbar-user-role.rol-consulta {
                background: rgba(34,197,94,0.2); color: #86efac; border: 1px solid rgba(34,197,94,0.3);
            }
            .navbar-logout-btn {
                background: rgba(239,68,68,0.15); border: 1px solid rgba(239,68,68,0.3);
                color: #fca5a5; cursor: pointer; padding: 6px; border-radius: 6px;
                display: flex; align-items: center; transition: all 0.2s;
            }
            .navbar-logout-btn:hover {
                background: rgba(239,68,68,0.3); color: #fee2e2;
            }
            .dashboard-header { position: relative; }

            @media (max-width: 768px) {
                .navbar-user-info {
                    position: static; transform: none;
                    justify-content: center; margin-top: 8px;
                }
                .navbar-user-name { display: none; }
            }
        `;
        // Ocultar el div .user-info original si existe (evita duplicidad visual pero mantiene IDs para JS viejo)
        const oldUserInfo = header.querySelector('.user-info');
        if (oldUserInfo) {
            oldUserInfo.style.display = 'none';
        }

        document.head.appendChild(style);
        header.appendChild(userInfo);

        // Evento logout
        document.getElementById('btnNavbarLogout').addEventListener('click', () => {
            if (typeof window.cerrarSesionManual === 'function') {
                window.cerrarSesionManual();
            } else {
                localStorage.removeItem('token');
                localStorage.removeItem('usuario');
                window.location.href = '/login.html';
            }
        });
        
        // Si existe el btnLogout original (ej: dashboard.html antiguo), enlazarlo también
        const btnLogoutOriginal = document.getElementById('btnLogout');
        if (btnLogoutOriginal && btnLogoutOriginal !== document.getElementById('btnNavbarLogout')) {
            btnLogoutOriginal.addEventListener('click', () => {
                if (typeof window.cerrarSesionManual === 'function') {
                    window.cerrarSesionManual();
                } else {
                    localStorage.removeItem('token');
                    localStorage.removeItem('usuario');
                    window.location.href = '/login.html';
                }
            });
        }
    }
})();
