// ============================================
// AUDITORÍA — Panel de auditoría para admin
// ============================================

(function () {
    'use strict';

    const API_URL = '/api';
    let paginaActual = 1;
    const LIMITE = 30;

    // ============================================
    // INICIALIZACIÓN
    // ============================================

    async function init() {
        const token = localStorage.getItem('token');
        if (!token) {
            window.location.href = '/login.html';
            return;
        }

        // Verificar rol admin
        const usuario = JSON.parse(localStorage.getItem('usuario') || '{}');
        if (usuario.rol !== 'admin_total') {
            alert('Acceso denegado. Se requieren permisos de administrador.');
            window.location.href = '/dashboard.html';
            return;
        }

        // Mostrar nombre
        const userName = document.getElementById('userName');
        if (userName) userName.textContent = usuario.nombre_completo || 'Admin';

        // Cargar configuración de timeout
        await cargarConfiguracion();

        // Cargar usuarios para filtro
        await cargarUsuariosFiltro();

        // Cargar estadísticas y registros
        await cargarResumen();
        await cargarRegistros();

        // Event listeners
        document.getElementById('btnFiltrar').addEventListener('click', () => {
            paginaActual = 1;
            cargarRegistros();
        });

        document.getElementById('btnGuardarTimeout').addEventListener('click', guardarTimeout);
    }

    // ============================================
    // CONFIGURACIÓN DE TIMEOUT
    // ============================================

    async function cargarConfiguracion() {
        try {
            const response = await fetchAPI('/configuracion');
            if (response.success && response.data.timeout_inactividad_minutos) {
                document.getElementById('inputTimeout').value = response.data.timeout_inactividad_minutos;
            }
        } catch (error) {
            console.error('Error al cargar configuración:', error);
        }
    }

    async function guardarTimeout() {
        const valor = document.getElementById('inputTimeout').value;
        const msgEl = document.getElementById('timeoutMsg');

        if (!valor || parseInt(valor) < 5 || parseInt(valor) > 120) {
            msgEl.textContent = 'El valor debe ser entre 5 y 120 minutos';
            msgEl.style.color = '#f87171';
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${API_URL}/configuracion/timeout_inactividad_minutos`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ valor: valor })
            });

            const data = await response.json();
            if (data.success) {
                msgEl.textContent = '✓ Guardado';
                msgEl.style.color = '#4ade80';
                setTimeout(() => { msgEl.textContent = ''; }, 3000);
            } else {
                msgEl.textContent = data.message || 'Error al guardar';
                msgEl.style.color = '#f87171';
            }
        } catch (error) {
            msgEl.textContent = 'Error de conexión';
            msgEl.style.color = '#f87171';
        }
    }

    // ============================================
    // CARGAR USUARIOS PARA FILTRO
    // ============================================

    async function cargarUsuariosFiltro() {
        try {
            const data = await fetchAPI('/usuarios');
            if (data.success) {
                const select = document.getElementById('filterUsuario');
                data.data.forEach(u => {
                    const option = document.createElement('option');
                    option.value = u.id;
                    option.textContent = u.nombre_completo;
                    select.appendChild(option);
                });
            }
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    }

    // ============================================
    // CARGAR RESUMEN/ESTADÍSTICAS
    // ============================================

    async function cargarResumen() {
        try {
            const data = await fetchAPI('/auditoria/resumen');
            if (data.success) {
                document.getElementById('statTotal').textContent = data.data.total || 0;

                // Acciones por tipo
                const porAccion = {};
                (data.data.por_accion || []).forEach(a => {
                    porAccion[a.accion] = a.total;
                });

                document.getElementById('statCrear').textContent = porAccion.crear || 0;
                document.getElementById('statEditar').textContent = porAccion.editar || 0;
                document.getElementById('statEliminar').textContent = porAccion.eliminar || 0;
                document.getElementById('statLogin').textContent = porAccion.login || 0;
            }
        } catch (error) {
            console.error('Error al cargar resumen:', error);
        }
    }

    // ============================================
    // CARGAR REGISTROS DE AUDITORÍA
    // ============================================

    async function cargarRegistros() {
        const loadingEl = document.getElementById('loadingTable');
        const emptyEl = document.getElementById('emptyState');
        const tableEl = document.getElementById('auditTable');
        const tbody = document.getElementById('auditTableBody');

        loadingEl.style.display = 'flex';
        tableEl.style.display = 'none';
        emptyEl.style.display = 'none';

        try {
            const params = new URLSearchParams();
            params.append('pagina', paginaActual);
            params.append('limite', LIMITE);

            const usuario = document.getElementById('filterUsuario').value;
            const modulo = document.getElementById('filterModulo').value;
            const accion = document.getElementById('filterAccion').value;
            const fechaDesde = document.getElementById('filterFechaDesde').value;
            const fechaHasta = document.getElementById('filterFechaHasta').value;

            if (usuario) params.append('usuario_id', usuario);
            if (modulo) params.append('modulo', modulo);
            if (accion) params.append('accion', accion);
            if (fechaDesde) params.append('fecha_desde', fechaDesde);
            if (fechaHasta) params.append('fecha_hasta', fechaHasta);

            const data = await fetchAPI(`/auditoria?${params.toString()}`);

            loadingEl.style.display = 'none';

            if (!data.success || !data.data || data.data.length === 0) {
                emptyEl.style.display = 'flex';
                renderPaginacion(null);
                return;
            }

            tbody.innerHTML = data.data.map(r => `
                <tr>
                    <td style="white-space: nowrap;">${formatearFecha(r.fecha)}</td>
                    <td>${r.usuario_nombre || '-'}</td>
                    <td><span class="badge-accion badge-${r.accion}">${r.accion}</span></td>
                    <td>${r.modulo}</td>
                    <td style="max-width: 300px; overflow: hidden; text-overflow: ellipsis;">${r.descripcion || '-'}</td>
                    <td style="font-size: 0.75rem; color: #64748b;">${r.ip_address || '-'}</td>
                </tr>
            `).join('');

            tableEl.style.display = 'table';
            renderPaginacion(data.paginacion);

        } catch (error) {
            console.error('Error al cargar registros:', error);
            loadingEl.style.display = 'none';
            emptyEl.style.display = 'flex';
        }
    }

    // ============================================
    // PAGINACIÓN
    // ============================================

    function renderPaginacion(pag) {
        const container = document.getElementById('paginacion');
        if (!pag || pag.total_paginas <= 1) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = `
            <button ${paginaActual <= 1 ? 'disabled' : ''} id="btnPagAnterior">← Anterior</button>
            <span>Página ${pag.pagina} de ${pag.total_paginas} (${pag.total} registros)</span>
            <button ${paginaActual >= pag.total_paginas ? 'disabled' : ''} id="btnPagSiguiente">Siguiente →</button>
        `;

        document.getElementById('btnPagAnterior').addEventListener('click', () => {
            paginaActual--;
            cargarRegistros();
        });

        document.getElementById('btnPagSiguiente').addEventListener('click', () => {
            paginaActual++;
            cargarRegistros();
        });
    }

    // ============================================
    // UTILIDADES
    // ============================================

    async function fetchAPI(endpoint) {
        const token = localStorage.getItem('token');
        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login.html';
            return {};
        }

        return await response.json();
    }

    function formatearFecha(fechaStr) {
        if (!fechaStr) return '-';
        const fecha = new Date(fechaStr);
        const dia = fecha.getDate().toString().padStart(2, '0');
        const mes = (fecha.getMonth() + 1).toString().padStart(2, '0');
        const anio = fecha.getFullYear();
        const hora = fecha.getHours().toString().padStart(2, '0');
        const min = fecha.getMinutes().toString().padStart(2, '0');
        return `${dia}/${mes}/${anio} ${hora}:${min}`;
    }

    // Iniciar
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
