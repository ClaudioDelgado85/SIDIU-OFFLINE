// ============================================
// USUARIOS — Panel de gestión de accesos (Admin)
// Rediseño v2: Panel lateral, toasts, toggle
// ============================================

(function () {
    'use strict';

    const API_URL = '/api';
    let usuarios = [];
    const MODULOS = [
        { id: 'expedientes', nombre: 'Expedientes' },
        { id: 'intimaciones', nombre: 'Intimaciones' },
        { id: 'infracciones', nombre: 'Infracciones' },
        { id: 'reclamos', nombre: 'Reclamos' },
        { id: 'relevamientos', nombre: 'Relevamientos' },
        { id: 'comercios', nombre: 'Comercios' },
        { id: 'vendedores', nombre: 'Vendedores' },
        { id: 'tareas', nombre: 'Tareas Diarias' },
        { id: 'catalogos', nombre: 'Catálogos' }
    ];

    // ============================================
    // INICIALIZACIÓN
    // ============================================

    async function init() {
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (usuario.rol !== 'admin_total') {
            alert('Acceso denegado.');
            window.location.href = '/dashboard.html';
            return;
        }
        document.getElementById('userName').textContent = usuario.nombre_completo || 'Admin';

        document.getElementById('btnNuevoUsuario').addEventListener('click', () => abrirPanel('crear'));
        await cargarUsuarios();
    }

    // ============================================
    // CARGAR Y RENDERIZAR
    // ============================================

    async function cargarUsuarios() {
        const loading = document.getElementById('loadingTable');
        const table = document.getElementById('usuariosTable');
        loading.style.display = 'flex';
        table.style.display = 'none';

        try {
            const data = await fetchAPI('/usuarios');
            if (data.success) {
                usuarios = data.data;
                renderTabla();
                renderStats();
                table.style.display = 'table';
            }
        } catch (e) {
            console.error(e);
            toast('Error al cargar usuarios', 'error');
        } finally {
            loading.style.display = 'none';
        }
    }

    function renderStats() {
        document.getElementById('statTotal').textContent = usuarios.length;
        document.getElementById('statAdmin').textContent = usuarios.filter(u => u.rol === 'admin_total').length;
        document.getElementById('statCarga').textContent = usuarios.filter(u => u.rol === 'carga').length;
        document.getElementById('statConsulta').textContent = usuarios.filter(u => u.rol === 'consulta').length;
    }

    function renderTabla() {
        const miId = JSON.parse(localStorage.getItem('usuario') || '{}').id;
        const tbody = document.getElementById('usuariosTableBody');

        tbody.innerHTML = usuarios.map(u => {
            const esYo = u.id === miId;
            return `
            <tr>
                <td>
                    <div class="celda-nombre">${u.nombre_completo}</div>
                    <div class="celda-sub">${u.email}</div>
                </td>
                <td><span class="celda-tag">${u.usuario}</span></td>
                <td><span class="rol-badge rol-${u.rol}">${rolLabel(u.rol)}</span></td>
                <td>
                    ${esYo
                        ? `<span class="estado-toggle activo" style="cursor:default;" title="No puedes desactivarte a ti mismo"><span class="estado-dot"></span>Activo</span>`
                        : `<button class="estado-toggle ${u.activo ? 'activo' : 'inactivo'}" onclick="toggleEstado(${u.id}, ${u.activo})" title="Clic para ${u.activo ? 'desactivar' : 'activar'}">
                            <span class="estado-dot"></span>${u.activo ? 'Activo' : 'Inactivo'}
                           </button>`
                    }
                </td>
                <td>
                    <div class="action-buttons" style="display:flex; gap:4px;">
                        <button class="btn-icon btn-edit" onclick="abrirPanel('editar', ${u.id})" title="Editar">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="btn-icon btn-next" onclick="abrirPanel('resetpwd', ${u.id})" title="Resetear Contraseña">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                                <path d="M7 11V7a5 5 0 0110 0v4"/>
                            </svg>
                        </button>
                        ${!esYo ? `<button class="btn-icon btn-delete" onclick="eliminarUsuario(${u.id}, '${u.nombre_completo.replace(/'/g, "\\'")}')" title="Desactivar usuario">
                            <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                            </svg>
                        </button>` : ''}
                    </div>
                </td>
            </tr>`;
        }).join('');
    }

    // ============================================
    // PANEL LATERAL
    // ============================================

    function abrirPanel(modo, userId = null) {
        cerrarPanel();

        if (modo === 'crear') return crearPanelCrear();
        if (modo === 'editar') return crearPanelEditar(userId);
        if (modo === 'resetpwd') return crearPanelResetPwd(userId);
    }

    function cerrarPanel() {
        const overlay = document.querySelector('.panel-overlay');
        const panel = document.querySelector('.panel-lateral');
        if (panel) {
            panel.classList.add('cerrando');
            setTimeout(() => {
                overlay?.remove();
                panel?.remove();
            }, 200);
        }
    }

    function montarPanel(titulo, bodyHTML, footerHTML) {
        // Overlay
        const overlay = document.createElement('div');
        overlay.className = 'panel-overlay';
        overlay.addEventListener('click', cerrarPanel);

        // Panel
        const panel = document.createElement('div');
        panel.className = 'panel-lateral';
        panel.innerHTML = `
            <div class="panel-header">
                <h2>${titulo}</h2>
                <button class="btn-close-panel" onclick="cerrarPanelGlobal()">✕</button>
            </div>
            <div class="panel-body">${bodyHTML}</div>
            ${footerHTML ? `<div class="panel-footer">${footerHTML}</div>` : ''}
        `;

        document.body.appendChild(overlay);
        document.body.appendChild(panel);

        // Activar toggles de ojo para contraseñas
        panel.querySelectorAll('.btn-eye-toggle').forEach(btn => {
            btn.addEventListener('click', function() {
                const input = panel.querySelector('#' + this.dataset.target);
                const svg = this.querySelector('svg');
                if (input.type === 'password') {
                    input.type = 'text';
                    svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>';
                } else {
                    input.type = 'password';
                    svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>';
                }
            });
        });

        return panel;
    }

    // --- Panel CREAR ---
    function crearPanelCrear() {
        const body = `
            <div class="form-grid">
                <div class="form-group-modal">
                    <label>Nombre completo</label>
                    <input type="text" id="pNombre" placeholder="Ej: Juan Pérez">
                </div>
                <div class="form-group-modal">
                    <label>Nombre de usuario</label>
                    <input type="text" id="pUsername" placeholder="Ej: jperez" autocomplete="off">
                </div>
                <div class="form-group-modal">
                    <label>Email</label>
                    <input type="email" id="pEmail" placeholder="Ej: juan@municipio.gob.ar">
                </div>
                <div class="form-group-modal">
                    <label>Contraseña</label>
                    <div class="pwd-field-wrap">
                        <input type="password" id="pPassword" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                        <button type="button" class="btn-eye-toggle" data-target="pPassword" title="Mostrar contraseña">
                            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                        </button>
                    </div>
                </div>
                <div class="form-group-modal form-grid-full">
                    <label>Rol</label>
                    <select id="pRol">
                        <option value="">Seleccione un rol</option>
                        <option value="admin_total">Administrador Total</option>
                        <option value="carga">Usuario de Carga</option>
                        <option value="consulta">Solo Consulta</option>
                    </select>
                </div>
            </div>
            <div id="seccionPermisos" style="display:none; margin-top: 16px;">
                <div class="permisos-titulo">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Permisos de módulos
                </div>
                <div class="permisos-grid" id="permGrid"></div>
            </div>
        `;
        const footer = `
            <button class="btn-text" onclick="cerrarPanelGlobal()">Cancelar</button>
            <button class="btn-primary" id="btnCrearUsuario">Crear Usuario</button>
        `;

        const panel = montarPanel('Nuevo Usuario', body, footer);
        generarCheckboxes(panel);

        panel.querySelector('#pRol').addEventListener('change', function () {
            panel.querySelector('#seccionPermisos').style.display = this.value === 'carga' ? 'block' : 'none';
        });

        panel.querySelector('#btnCrearUsuario').addEventListener('click', async () => {
            const nombre = panel.querySelector('#pNombre').value.trim();
            const usuario = panel.querySelector('#pUsername').value.trim();
            const email = panel.querySelector('#pEmail').value.trim();
            const password = panel.querySelector('#pPassword').value;
            const rol = panel.querySelector('#pRol').value;

            if (!nombre || !usuario || !email || !password || !rol) {
                return toast('Complete todos los campos', 'error');
            }
            if (password.length < 6) {
                return toast('La contraseña debe tener al menos 6 caracteres', 'error');
            }

            const payload = { nombre_completo: nombre, usuario, email, password, rol };
            if (rol === 'carga') {
                payload.permisos = recogerPermisos(panel);
            }

            try {
                const res = await fetchAPI('/usuarios', 'POST', payload);
                if (res.success) {
                    cerrarPanel();
                    cargarUsuarios();
                    // Mostrar contraseña brevemente
                    mostrarPasswordReveal(nombre, usuario, password);
                    toast('Usuario creado exitosamente', 'success');
                } else {
                    toast(res.message || 'Error al crear usuario', 'error');
                }
            } catch (e) {
                toast('Error de conexión', 'error');
            }
        });
    }

    // --- Panel EDITAR ---
    async function crearPanelEditar(userId) {
        let data;
        try {
            data = await fetchAPI(`/usuarios/${userId}`);
            if (!data.success) return toast('Error al cargar usuario', 'error');
        } catch (e) {
            return toast('Error de conexión', 'error');
        }

        const u = data.data;
        const body = `
            <div class="form-grid">
                <div class="form-group-modal">
                    <label>Nombre completo</label>
                    <input type="text" id="pNombre" value="${u.nombre_completo}">
                </div>
                <div class="form-group-modal">
                    <label>Nombre de usuario</label>
                    <input type="text" id="pUsername" value="${u.usuario}" disabled style="opacity:0.6;">
                </div>
                <div class="form-group-modal form-grid-full">
                    <label>Email</label>
                    <input type="email" id="pEmail" value="${u.email}">
                </div>
                <div class="form-group-modal form-grid-full">
                    <label>Rol</label>
                    <select id="pRol">
                        <option value="admin_total" ${u.rol === 'admin_total' ? 'selected' : ''}>Administrador Total</option>
                        <option value="carga" ${u.rol === 'carga' ? 'selected' : ''}>Usuario de Carga</option>
                        <option value="consulta" ${u.rol === 'consulta' ? 'selected' : ''}>Solo Consulta</option>
                    </select>
                </div>
            </div>
            <div id="seccionPermisos" style="display:${u.rol === 'carga' ? 'block' : 'none'}; margin-top: 16px;">
                <div class="permisos-titulo">
                    <svg viewBox="0 0 24 24"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    Permisos de módulos
                </div>
                <div class="permisos-grid" id="permGrid"></div>
            </div>
        `;
        const footer = `
            <button class="btn-text" onclick="cerrarPanelGlobal()">Cancelar</button>
            <button class="btn-primary" id="btnGuardarEdicion">Guardar Cambios</button>
        `;

        const panel = montarPanel('Editar Usuario', body, footer);
        generarCheckboxes(panel, u.permisos);

        panel.querySelector('#pRol').addEventListener('change', function () {
            panel.querySelector('#seccionPermisos').style.display = this.value === 'carga' ? 'block' : 'none';
        });

        panel.querySelector('#btnGuardarEdicion').addEventListener('click', async () => {
            const payload = {
                nombre_completo: panel.querySelector('#pNombre').value.trim(),
                email: panel.querySelector('#pEmail').value.trim(),
                rol: panel.querySelector('#pRol').value
            };

            if (!payload.nombre_completo || !payload.email || !payload.rol) {
                return toast('Complete todos los campos', 'error');
            }

            if (payload.rol === 'carga') {
                payload.permisos = recogerPermisos(panel);
            }

            try {
                const res = await fetchAPI(`/usuarios/${userId}`, 'PUT', payload);
                if (res.success) {
                    cerrarPanel();
                    cargarUsuarios();
                    toast('Usuario actualizado', 'success');
                } else {
                    toast(res.message || 'Error al actualizar', 'error');
                }
            } catch (e) {
                toast('Error de conexión', 'error');
            }
        });
    }

    // --- Panel RESET PASSWORD ---
    async function crearPanelResetPwd(userId) {
        const u = usuarios.find(x => x.id === userId);
        if (!u) return;

        const body = `
            <p style="color: var(--si-text-secondary); font-size: 14px; margin-bottom: 20px;">
                Ingrese la nueva contraseña para <strong>${u.nombre_completo}</strong>
            </p>
            <div class="form-group-modal">
                <label>Nueva Contraseña</label>
                <div class="pwd-field-wrap">
                    <input type="password" id="pNewPwd" placeholder="Mínimo 6 caracteres" autocomplete="new-password">
                    <button type="button" class="btn-eye-toggle" data-target="pNewPwd" title="Mostrar contraseña">
                        <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    </button>
                </div>
            </div>
        `;
        const footer = `
            <button class="btn-text" onclick="cerrarPanelGlobal()">Cancelar</button>
            <button class="btn-primary" id="btnResetPwd">Cambiar Contraseña</button>
        `;

        const panel = montarPanel('Resetear Contraseña', body, footer);

        panel.querySelector('#btnResetPwd').addEventListener('click', async () => {
            const pwd = panel.querySelector('#pNewPwd').value;
            if (pwd.length < 6) return toast('Mínimo 6 caracteres', 'error');

            try {
                const res = await fetchAPI(`/usuarios/${userId}/resetear-password`, 'PUT', { nueva_password: pwd });
                if (res.success) {
                    cerrarPanel();
                    toast('Contraseña reseteada exitosamente', 'success');
                } else {
                    toast(res.message || 'Error', 'error');
                }
            } catch (e) {
                toast('Error de conexión', 'error');
            }
        });
    }

    // ============================================
    // TOGGLE ESTADO (activo/inactivo)
    // ============================================

    window.toggleEstado = async function (userId, estadoActual) {
        const nuevoEstado = !estadoActual;
        const u = usuarios.find(x => x.id === userId);
        const accion = nuevoEstado ? 'activar' : 'desactivar';

        if (!confirm(`¿${nuevoEstado ? 'Activar' : 'Desactivar'} a ${u?.nombre_completo}?`)) return;

        try {
            const res = await fetchAPI(`/usuarios/${userId}`, 'PUT', { activo: nuevoEstado });
            if (res.success) {
                cargarUsuarios();
                toast(`Usuario ${accion === 'activar' ? 'activado' : 'desactivado'}`, 'success');
            } else {
                toast(res.message || 'Error', 'error');
            }
        } catch (e) {
            toast('Error de conexión', 'error');
        }
    };

    window.eliminarUsuario = async function (userId, nombre) {
        if (!confirm(`¿Está seguro que desea desactivar a "${nombre}"?\nEl usuario no podrá iniciar sesión pero su historial se mantendrá.`)) return;

        try {
            const res = await fetchAPI(`/usuarios/${userId}`, 'DELETE');
            if (res.success) {
                cargarUsuarios();
                toast('Usuario desactivado exitosamente', 'success');
            } else {
                toast(res.message || 'Error al desactivar', 'error');
            }
        } catch (e) {
            toast('Error de conexión', 'error');
        }
    };

    // ============================================
    // PASSWORD REVEAL (mostrar contraseña brevemente)
    // ============================================

    function mostrarPasswordReveal(nombre, usuario, password) {
        // Quitar cualquiera anterior
        document.querySelector('.password-reveal-box')?.remove();

        const box = document.createElement('div');
        box.className = 'password-reveal-box';
        box.innerHTML = `
            <div class="pw-label">✓ Usuario creado — Credenciales</div>
            <div style="margin-top:8px;">
                <span style="font-size:12px; color:var(--si-text-muted);">Usuario:</span>
                <span class="pw-value">${usuario}</span>
            </div>
            <div style="margin-top:4px;">
                <span style="font-size:12px; color:var(--si-text-muted);">Contraseña:</span>
                <span class="pw-value">${password}</span>
            </div>
            <div class="pw-hint">⏱ Este aviso se ocultará automáticamente en 30 segundos. Anote las credenciales.</div>
        `;

        const main = document.querySelector('.dashboard-main');
        main.insertBefore(box, main.querySelector('.actions-bar'));

        // Auto-ocultar en 30 segundos
        setTimeout(() => {
            box.style.transition = 'opacity 0.5s';
            box.style.opacity = '0';
            setTimeout(() => box.remove(), 500);
        }, 30000);
    }

    // ============================================
    // HELPERS: checkboxes, toasts, fetch
    // ============================================

    function generarCheckboxes(panel, permisosActuales = null) {
        const grid = panel.querySelector('#permGrid');
        grid.innerHTML = MODULOS.map(m => {
            const checked = permisosActuales
                ? (permisosActuales.hasOwnProperty(m.id) ? permisosActuales[m.id] : true)
                : true;
            return `
                <div class="perm-item">
                    <input type="checkbox" id="perm_${m.id}" value="${m.id}" ${checked ? 'checked' : ''}>
                    <label for="perm_${m.id}">${m.nombre}</label>
                </div>`;
        }).join('');
    }

    function recogerPermisos(panel) {
        const permisos = {};
        MODULOS.forEach(m => {
            const cb = panel.querySelector(`#perm_${m.id}`);
            if (cb) permisos[m.id] = cb.checked;
        });
        return permisos;
    }

    function toast(mensaje, tipo = 'info') {
        const container = document.getElementById('toastContainer');
        const t = document.createElement('div');
        t.className = `toast ${tipo}`;
        t.textContent = mensaje;
        container.appendChild(t);
        setTimeout(() => t.remove(), 4000);
    }

    async function fetchAPI(endpoint, method = 'GET', body = null) {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };
        const options = { method, headers };
        if (body) {
            headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify(body);
        }
        const response = await fetch(`${API_URL}${endpoint}`, options);
        if (response.status === 401) {
            window.cerrarSesionManual ? window.cerrarSesionManual() : (window.location.href = '/login.html');
            throw new Error('No autorizado');
        }
        return await response.json();
    }

    function rolLabel(rol) {
        return { admin_total: 'Administrador', carga: 'De Carga', consulta: 'Consulta' }[rol] || rol;
    }

    // Función global para cerrar panel desde botones inline
    window.cerrarPanelGlobal = cerrarPanel;
    window.abrirPanel = abrirPanel;

    // Run
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
