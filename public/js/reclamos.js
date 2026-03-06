// public/js/reclamos.js - Versión tabla (consistente con intimaciones.js)

const API_URL = '/api';
let reclamos = [];
let paginaActual = 1;
let totalPaginas = 1;
let filtrosActuales = {}; // Filtros persistentes para paginación

// ============================================
// VERIFICAR AUTENTICACIÓN
// ============================================

function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');

    if (!token || !usuario) {
        window.location.href = '/login.html';
        return null;
    }

    return { token, usuario: JSON.parse(usuario) };
}

// ============================================
// CARGAR DATOS
// ============================================

async function cargarReclamos(nuevosFiltos = null) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    // Si se pasan nuevos filtros, actualizarlos; si no, usar los existentes
    if (nuevosFiltos !== null) {
        filtrosActuales = nuevosFiltos;
    }

    // Mostrar loading
    document.getElementById('loadingTable').style.display = 'flex';
    document.getElementById('reclamosTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';

    try {
        // Construir parámetros con filtros persistentes
        const filtros = { ...filtrosActuales };

        // Agregar búsqueda si existe
        const busqueda = document.getElementById('searchInput').value;
        if (busqueda) filtros.busqueda = busqueda;

        filtros.page = paginaActual;
        filtros.limit = 10;

        const params = new URLSearchParams(filtros);
        const response = await fetch(`${API_URL}/reclamos?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            reclamos = data.data;
            totalPaginas = data.pagination.totalPages;
            paginaActual = data.pagination.currentPage;

            renderizarTabla();
            await cargarEstadisticas(sesion.token);
            actualizarPaginacion();
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar reclamos');
    } finally {
        document.getElementById('loadingTable').style.display = 'none';
    }
}

function renderizarTabla() {
    const tbody = document.getElementById('reclamosTableBody');
    const table = document.getElementById('reclamosTable');
    const empty = document.getElementById('emptyState');

    if (reclamos.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    tbody.innerHTML = reclamos.map(r => `
        <tr data-estado="${r.estado}">
            <td><span class="celda-numero">${r.numero_reclamo}</span></td>
            <td>${formatearFecha(r.fecha_creacion)}</td>
            <td><span class="celda-tag">${formatearTipo(r.tipo_reclamo)}</span></td>
            <td>${r.direccion_incidente}</td>
            <td>${r.denunciado_nombre || '-'}</td>
            <td><span class="priority-${r.prioridad}">${formatearPrioridad(r.prioridad)}</span></td>
            <td><span class="estado-badge estado-${r.estado}">${formatearEstado(r.estado)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" data-id="${r.id}" title="Editar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none;">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${r.id}" title="Eliminar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none;">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
    `).join('');
}

async function cargarEstadisticas(token) {
    try {
        const response = await fetch(`${API_URL}/reclamos/estadisticas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            // Contar por estado
            let total = 0, pendientes = 0, enProceso = 0, resueltos = 0;
            data.estados.forEach(e => {
                total += e.count;
                if (e.estado === 'pendiente') pendientes = e.count;
                if (e.estado === 'en_proceso') enProceso = e.count;
                if (e.estado === 'resuelto') resueltos = e.count;
            });

            document.getElementById('statTotal').textContent = total;
            document.getElementById('statPendientes').textContent = pendientes;
            document.getElementById('statEnProceso').textContent = enProceso;
            document.getElementById('statResueltos').textContent = resueltos;
        }
    } catch (error) {
        console.error('Error cargando estadísticas:', error);
    }
}

function actualizarPaginacion() {
    const pagination = document.getElementById('pagination');
    const pageInfo = document.getElementById('pageInfo');
    const btnPrev = document.getElementById('btnPrevPage');
    const btnNext = document.getElementById('btnNextPage');

    if (totalPaginas <= 1) {
        pagination.style.display = 'none';
        return;
    }

    pagination.style.display = 'flex';
    pageInfo.textContent = `Página ${paginaActual} de ${totalPaginas}`;
    btnPrev.disabled = paginaActual <= 1;
    btnNext.disabled = paginaActual >= totalPaginas;
}

// ============================================
// FORMATEO
// ============================================

function formatearFecha(fechaStr) {
    if (!fechaStr) return '-';
    const date = new Date(fechaStr);
    return date.toLocaleDateString();
}

function formatearTipo(tipo) {
    const tipos = {
        alumbrado: 'Alumbrado',
        baldio: 'Baldío',
        ruidos: 'Ruidos',
        animales: 'Animales',
        cloacas: 'Cloacas',
        obras: 'Obras',
        varios: 'Varios'
    };
    return tipos[tipo] || tipo;
}

function formatearPrioridad(prioridad) {
    const dot = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:currentColor;margin-right:5px;vertical-align:middle;"></span>';
    const prioridades = {
        baja: dot + 'Baja',
        media: dot + 'Media',
        alta: dot + 'Alta',
        urgente: dot + 'Urgente'
    };
    return prioridades[prioridad] || prioridad;
}

function formatearEstado(estado) {
    const estados = {
        pendiente: 'Pendiente',
        en_proceso: 'En Proceso',
        resuelto: 'Resuelto',
        anulado: 'Anulado'
    };
    return estados[estado] || estado;
}

// ============================================
// MODAL EDICIÓN / CREACIÓN
// ============================================

function abrirModal(reclamo = null) {
    const esNuevo = !reclamo;
    const datos = reclamo || {};

    const modalHTML = `
        <div class="panel-overlay" id="modalReclamo">
            <div class="panel-lateral" id="panelLateral">
                <div class="panel-header">
                    <h2>${esNuevo ? 'Nuevo Reclamo' : `Editar Reclamo ${datos.numero_reclamo}`}</h2>
                    <button class="btn-close-panel" id="btnCerrarPanel">×</button>
                </div>
                <form id="formReclamo">
                    <div class="panel-body">
                        <div class="form-grid">
                            <div class="form-group-modal">
                                <label>Tipo de Reclamo *</label>
                                <select id="tipo_reclamo" required ${!esNuevo ? 'disabled' : ''}>
                                    <option value="alumbrado">Alumbrado</option>
                                    <option value="baldio">Baldío</option>
                                    <option value="ruidos">Ruidos Molestos</option>
                                    <option value="animales">Animales</option>
                                    <option value="cloacas">Cloacas</option>
                                    <option value="obras">Obras</option>
                                    <option value="varios">Varios</option>
                                </select>
                            </div>
                            <div class="form-group-modal">
                                <label>Prioridad</label>
                                <select id="prioridad">
                                    <option value="baja">Baja</option>
                                    <option value="media" selected>Media</option>
                                    <option value="alta">Alta</option>
                                    <option value="urgente">Urgente</option>
                                </select>
                            </div>
                            <div class="form-group-modal">
                                <label>Dirección del Incidente *</label>
                                <input type="text" id="direccion_incidente" required value="${datos.direccion_incidente || ''}">
                            </div>
                            <div class="form-group-modal">
                                <label>Barrio</label>
                                <select id="barrio_id">
                                    <option value="">-- Sin asignar --</option>
                                </select>
                            </div>
                            <div class="form-group-modal form-grid-full">
                                <label>Descripción del Problema *</label>
                                <textarea id="descripcion" required rows="3">${datos.descripcion || ''}</textarea>
                            </div>
                        </div>

                        <div class="form-section">
                            <div class="form-section-title">Datos del Denunciado (si aplica)</div>
                            <div class="form-grid">
                                <div class="form-group-modal">
                                    <label>Nombre</label>
                                    <input type="text" id="denunciado_nombre" value="${datos.denunciado_nombre || ''}">
                                </div>
                                <div class="form-group-modal">
                                    <label>DNI</label>
                                    <input type="text" id="denunciado_dni" value="${datos.denunciado_dni || ''}">
                                </div>
                                <div class="form-group-modal form-grid-full">
                                    <label>Dirección</label>
                                    <input type="text" id="denunciado_direccion" value="${datos.denunciado_direccion || ''}">
                                </div>
                            </div>
                        </div>

                        <div class="form-section">
                            <div class="form-section-title">Datos del Denunciante (opcional)</div>
                            <div class="form-grid">
                                <div class="form-group-modal">
                                    <label>Nombre</label>
                                    <input type="text" id="vecino_nombre" value="${datos.vecino_nombre || ''}">
                                </div>
                                <div class="form-group-modal">
                                    <label>Teléfono</label>
                                    <input type="text" id="vecino_telefono" value="${datos.vecino_telefono || ''}">
                                </div>
                            </div>
                        </div>

                        ${!esNuevo ? `
                        <div class="form-section">
                            <div class="form-section-title">Gestión / Resolución</div>
                            <div class="form-grid">
                                <div class="form-group-modal">
                                    <label>Estado</label>
                                    <select id="estado">
                                        <option value="pendiente">Pendiente</option>
                                        <option value="en_proceso">En Proceso</option>
                                        <option value="resuelto">Resuelto</option>
                                        <option value="anulado">Anulado</option>
                                    </select>
                                </div>
                                <div class="form-group-modal form-grid-full">
                                    <label>Observaciones de Resolución</label>
                                    <textarea id="observaciones_resolucion" rows="2">${datos.observaciones_resolucion || ''}</textarea>
                                </div>
                            </div>
                        </div>
                        ` : ''}
                    </div>
                    <div class="panel-footer">
                        <button type="button" class="btn-text" id="btnCancelarPanel">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    cargarSelectBarrios('barrio_id', datos.barrio_id);

    if (!esNuevo) {
        document.getElementById('tipo_reclamo').value = datos.tipo_reclamo;
        document.getElementById('prioridad').value = datos.prioridad;
        document.getElementById('estado').value = datos.estado;
    }

    document.getElementById('btnCerrarPanel').addEventListener('click', cerrarPanelReclamo);
    document.getElementById('btnCancelarPanel').addEventListener('click', cerrarPanelReclamo);
    document.getElementById('modalReclamo').addEventListener('click', (e) => {
        if (e.target.id === 'modalReclamo') cerrarPanelReclamo();
    });

    document.getElementById('formReclamo').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarReclamo(esNuevo, datos.id);
    });
}

function cerrarPanelReclamo() {
    const panel = document.getElementById('panelLateral');
    const overlay = document.getElementById('modalReclamo');
    if (panel) {
        panel.classList.add('cerrando');
        setTimeout(() => { if (overlay) overlay.remove(); }, 200);
    }
}

async function guardarReclamo(esNuevo, id) {
    const sesion = verificarAutenticacion();

    const body = {
        tipo_reclamo: document.getElementById('tipo_reclamo').value,
        prioridad: document.getElementById('prioridad').value,
        direccion_incidente: document.getElementById('direccion_incidente').value,
        descripcion: document.getElementById('descripcion').value,
        vecino_nombre: document.getElementById('vecino_nombre').value,
        vecino_telefono: document.getElementById('vecino_telefono').value,
        denunciado_nombre: document.getElementById('denunciado_nombre').value,
        denunciado_dni: document.getElementById('denunciado_dni').value,
        denunciado_direccion: document.getElementById('denunciado_direccion').value,
        barrio_id: document.getElementById('barrio_id').value || null
    };

    if (!esNuevo) {
        body.estado = document.getElementById('estado').value;
        body.observaciones_resolucion = document.getElementById('observaciones_resolucion').value;
    }

    try {
        const url = esNuevo ? `${API_URL}/reclamos` : `${API_URL}/reclamos/${id}`;
        const method = esNuevo ? 'POST' : 'PUT';

        const res = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}`
            },
            body: JSON.stringify(body)
        });

        if (res.ok) {
            document.getElementById('modalReclamo').remove();
            cerrarPanelReclamo();
            cargarReclamos();
            alert(esNuevo ? 'Reclamo registrado exitosamente' : 'Reclamo actualizado');
        } else {
            alert('Error al guardar');
        }
    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function eliminarReclamo(id) {
    if (!confirm('¿Está seguro de eliminar este reclamo?')) return;

    const sesion = verificarAutenticacion();
    try {
        const res = await fetch(`${API_URL}/reclamos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        if (res.ok) {
            cargarReclamos();
            alert('Reclamo eliminado');
        }
    } catch (error) {
        alert('Error al eliminar');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (sesion) {
        document.getElementById('userName').textContent = sesion.usuario.nombre_completo;
    }

    cargarReclamos();

    // Event Listeners
    document.getElementById('btnNuevo').addEventListener('click', () => abrirModal(null));

    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });

    document.getElementById('btnExportar').addEventListener('click', () => {
        exportarExcel(reclamos, [
            { header: 'Nº Reclamo', key: 'numero_reclamo' },
            { header: 'Fecha', key: (r) => formatearFecha(r.fecha_creacion) },
            { header: 'Tipo', key: (r) => formatearTipo(r.tipo_reclamo) },
            { header: 'Dirección', key: 'direccion_incidente' },
            { header: 'Denunciado', key: 'denunciado_nombre' },
            { header: 'Prioridad', key: 'prioridad' },
            { header: 'Estado', key: (r) => formatearEstado(r.estado) },
            { header: 'Descripción', key: 'descripcion' }
        ], 'Reclamos', 'Reclamos');
    });

    // Búsqueda con debounce
    let timeoutBusqueda;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(() => cargarReclamos(), 500);
    });

    // Filtros
    document.getElementById('btnFiltros').addEventListener('click', () => {
        const p = document.getElementById('filtersPanel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        paginaActual = 1;
        cargarReclamos({
            tipo: document.getElementById('filterTipo').value,
            estado: document.getElementById('filterEstado').value,
            prioridad: document.getElementById('filterPrioridad').value,
            fecha_desde: document.getElementById('filterFechaDesde').value,
            fecha_hasta: document.getElementById('filterFechaHasta').value
        });
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filterTipo').value = '';
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterPrioridad').value = '';
        document.getElementById('filterFechaDesde').value = '';
        document.getElementById('filterFechaHasta').value = '';
        document.getElementById('searchInput').value = '';
        paginaActual = 1;
        cargarReclamos({});
    });

    // Paginación
    document.getElementById('btnPrevPage').addEventListener('click', () => {
        if (paginaActual > 1) {
            paginaActual--;
            cargarReclamos();
        }
    });

    document.getElementById('btnNextPage').addEventListener('click', () => {
        if (paginaActual < totalPaginas) {
            paginaActual++;
            cargarReclamos();
        }
    });

    // Delegación de eventos para botones de tabla
    document.getElementById('reclamosTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.dataset.id;

        if (btn.classList.contains('btn-edit')) {
            const reclamo = reclamos.find(r => r.id == id);
            if (reclamo) abrirModal(reclamo);
        } else if (btn.classList.contains('btn-delete')) {
            eliminarReclamo(id);
        }
    });

    // Deep Link Check
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        cargarReclamoIndividual(id);
    }
});

async function cargarReclamoIndividual(id) {
    try {
        const sesion = verificarAutenticacion();
        const response = await fetch(`${API_URL}/reclamos/${id}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                setTimeout(() => abrirModal(result.data), 500);
            }
        }
    } catch (e) {
        console.error('Error deep link:', e);
    }
}
