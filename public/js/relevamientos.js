// public/js/relevamientos.js
const API_URL = '/api';
let relevamientos = [];
let filtrosActuales = {};

// Estado de paginación (misma estructura que intimaciones)
let paginacionActual = {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 10
};

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

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (sesion) {
        document.getElementById('userName').textContent = sesion.usuario.nombre_completo;
    }

    cargarRelevamientos();

    // Event Listeners
    document.getElementById('btnNuevo').addEventListener('click', () => abrirModal(null));

    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });

    // Búsqueda
    let timeoutBusqueda;
    document.getElementById('searchInput').addEventListener('input', () => {
        clearTimeout(timeoutBusqueda);
        timeoutBusqueda = setTimeout(() => cargarRelevamientos(), 500);
    });

    // Filtros
    document.getElementById('btnFiltros').addEventListener('click', () => {
        const p = document.getElementById('filtersPanel');
        p.style.display = p.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        cargarRelevamientos({
            tipo: document.getElementById('filterTipo').value,
            zona: document.getElementById('filterZona').value,
            fecha_desde: document.getElementById('filterFechaDesde').value,
            fecha_hasta: document.getElementById('filterFechaHasta').value
        }, 1);
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filterTipo').value = '';
        document.getElementById('filterZona').value = '';
        document.getElementById('filterFechaDesde').value = '';
        document.getElementById('filterFechaHasta').value = '';
        document.getElementById('searchInput').value = '';
        cargarRelevamientos({}, 1);
    });

    // Botones tabla
    document.getElementById('relevamientosTableBody').addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        const id = btn.dataset.id;
        if (btn.classList.contains('btn-edit')) {
            const rel = relevamientos.find(r => r.id == id);
            if (rel) abrirModal(rel);
        } else if (btn.classList.contains('btn-delete')) {
            if (confirm('¿Estás seguro de eliminar este relevamiento?')) {
                eliminarRelevamiento(id);
            }
        }
    });

    // Deep Link Check
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        cargarRelevamientoIndividual(id);
    }
});

async function cargarRelevamientoIndividual(id) {
    try {
        const sesion = verificarAutenticacion();
        const response = await fetch(`${API_URL}/relevamientos/${id}`, {
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

// ============================================
// CARGAR DATOS
// ============================================
async function cargarRelevamientos(filtros = {}, pagina = 1) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    if (Object.keys(filtros).length > 0 || pagina === 1) {
        filtrosActuales = filtros;
    }

    document.getElementById('loadingTable').style.display = 'flex';
    document.getElementById('relevamientosTable').style.display = 'none';
    document.getElementById('emptyState').style.display = 'none';

    try {
        const params = new URLSearchParams();
        if (filtrosActuales.tipo) params.append('tipo', filtrosActuales.tipo);
        if (filtrosActuales.zona) params.append('zona', filtrosActuales.zona);
        if (filtrosActuales.fecha_desde) params.append('fecha_desde', filtrosActuales.fecha_desde);
        if (filtrosActuales.fecha_hasta) params.append('fecha_hasta', filtrosActuales.fecha_hasta);

        const busqueda = document.getElementById('searchInput').value;
        if (busqueda) params.append('busqueda', busqueda);

        params.append('page', pagina);
        params.append('limit', paginacionActual.recordsPerPage);

        const response = await fetch(`${API_URL}/relevamientos?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        if (response.status === 401) {
            localStorage.clear();
            window.location.href = '/login.html';
            return;
        }

        const data = await response.json();

        if (data.success) {
            relevamientos = data.data;
            if (data.pagination) paginacionActual = data.pagination;

            renderizarTabla();
            mostrarPaginacion();
            cargarEstadisticas(sesion.token);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar datos');
    } finally {
        document.getElementById('loadingTable').style.display = 'none';
    }
}

function renderizarTabla() {
    const tbody = document.getElementById('relevamientosTableBody');
    const table = document.getElementById('relevamientosTable');
    const empty = document.getElementById('emptyState');

    if (relevamientos.length === 0) {
        table.style.display = 'none';
        empty.style.display = 'flex';
        return;
    }

    table.style.display = 'table';
    empty.style.display = 'none';

    tbody.innerHTML = relevamientos.map(r => `
        <tr>
            <td><span class="celda-numero">${r.numero_relevamiento}</span></td>
            <td>${formatearFecha(r.fecha_relevamiento)}</td>
            <td><span class="type-badge type-${r.tipo_relevamiento}">${r.tipo_relevamiento}</span></td>
            <td>${r.ubicacion}</td>
            <td>${r.zona || '-'}</td>
            <td>${r.responsable_nombre || '-'}</td>
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
        const response = await fetch(`${API_URL}/relevamientos/estadisticas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success) {
            document.getElementById('statTotal').textContent = data.total;
        }
    } catch (error) {
        console.error('Error estadisticas:', error);
    }
}

function mostrarPaginacion() {
    const container = document.querySelector('.table-container');
    let pagDiv = document.getElementById('paginacionContainer');

    if (!pagDiv) {
        pagDiv = document.createElement('div');
        pagDiv.id = 'paginacionContainer';
        pagDiv.className = 'pagination-container';
        container.appendChild(pagDiv);
    }

    const { currentPage, totalPages, totalRecords, recordsPerPage } = paginacionActual;

    if (totalRecords === 0) {
        pagDiv.innerHTML = '';
        return;
    }

    const inicio = (currentPage - 1) * recordsPerPage + 1;
    const fin = Math.min(currentPage * recordsPerPage, totalRecords);

    pagDiv.innerHTML = `
        <div class="pagination-info">Mostrando ${inicio}-${fin} de ${totalRecords}</div>
        <div class="pagination-controls">
            <button class="btn-page" ${currentPage === 1 ? 'disabled' : ''} onclick="cargarRelevamientos({}, ${currentPage - 1})">Anterior</button>
            <span class="btn-page-num active">${currentPage}</span>
            <button class="btn-page" ${currentPage === totalPages ? 'disabled' : ''} onclick="cargarRelevamientos({}, ${currentPage + 1})">Siguiente</button>
        </div>
    `;
}

// ============================================
// MODAL
// ============================================
function abrirModal(datos = null) {
    const esNuevo = !datos;

    const r = datos || {
        fecha_relevamiento: new Date().toISOString().split('T')[0],
        tipo_relevamiento: 'baldio',
        ubicacion: '',
        zona: '',
        responsable_nombre: '',
        responsable_dni: '',
        observaciones: '',
        foto_url: '',
        tiene_autorizacion: 0,
        paga_canon: 0,
        fecha_vencimiento_canon: ''
    };

    const modalHTML = `
        <div class="panel-overlay" id="modalRelevamiento">
            <div class="panel-lateral" id="panelLateral">
                <div class="panel-header">
                    <h2>${esNuevo ? 'Nuevo Relevamiento' : `Editar ${r.numero_relevamiento}`}</h2>
                    <button class="btn-close-panel" id="btnCerrarPanel">×</button>
                </div>
                <form id="formRelevamiento">
                    <div class="panel-body">
                        
                        <div class="form-grid">
                            <div class="form-group-modal">
                                <label>Tipo *</label>
                                <select id="tipo_relevamiento" required onchange="toggleCamposEspeciales()">
                                    <option value="baldio" ${r.tipo_relevamiento === 'baldio' ? 'selected' : ''}>Baldío</option>
                                    <option value="obra" ${r.tipo_relevamiento === 'obra' ? 'selected' : ''}>Obra</option>
                                    <option value="ocupacion" ${r.tipo_relevamiento === 'ocupacion' ? 'selected' : ''}>Ocupación Esp. Público</option>
                                    <option value="comercio" ${r.tipo_relevamiento === 'comercio' ? 'selected' : ''}>Comercio</option>
                                    <option value="varios" ${r.tipo_relevamiento === 'varios' ? 'selected' : ''}>Varios</option>
                                </select>
                            </div>
                            <div class="form-group-modal">
                                <label>Fecha *</label>
                                <input type="date" id="fecha_relevamiento" value="${formatDateForInput(r.fecha_relevamiento)}" required>
                            </div>
                        </div>

                        <div class="form-group-modal">
                            <label>Ubicación / Dirección *</label>
                            <input type="text" id="ubicacion" value="${r.ubicacion}" required>
                        </div>
                        
                        <div class="form-group-modal">
                            <label>Barrio</label>
                            <select id="barrio_id">
                                <option value="">-- Sin asignar --</option>
                            </select>
                        </div>

                        <div class="form-section">
                            <div class="form-section-title">Responsable (Opcional)</div>
                            <div class="form-grid">
                                <div class="form-group-modal">
                                    <label>Nombre</label>
                                    <input type="text" id="responsable_nombre" value="${r.responsable_nombre || ''}">
                                </div>
                                <div class="form-group-modal">
                                    <label>DNI / CUIT</label>
                                    <input type="text" id="responsable_dni" value="${r.responsable_dni || ''}">
                                </div>
                            </div>
                        </div>

                        <div id="camposOcupacion" class="form-section campo-especifico" style="border-left: 3px solid #66BB6A; padding-left: 10px; display: none;">
                            <div class="form-section-title" style="color: #2E7D32;">Detalles de Ocupación</div>
                            <div class="form-grid">
                                <div class="form-group-modal">
                                    <label>¿Tiene Autorización?</label>
                                    <select id="tiene_autorizacion">
                                        <option value="0" ${!r.tiene_autorizacion ? 'selected' : ''}>No</option>
                                        <option value="1" ${r.tiene_autorizacion ? 'selected' : ''}>Sí</option>
                                    </select>
                                </div>
                                <div class="form-group-modal">
                                    <label>¿Paga Canon?</label>
                                    <select id="paga_canon">
                                        <option value="0" ${!r.paga_canon ? 'selected' : ''}>No</option>
                                        <option value="1" ${r.paga_canon ? 'selected' : ''}>Sí</option>
                                    </select>
                                </div>
                                <div class="form-group-modal form-grid-full">
                                    <label>Vencimiento Canon</label>
                                    <input type="date" id="fecha_vencimiento_canon" value="${formatDateForInput(r.fecha_vencimiento_canon)}">
                                </div>
                            </div>
                        </div>

                        <div class="form-group-modal" style="margin-top: 16px;">
                            <label>Observaciones</label>
                            <textarea id="observaciones" rows="3">${r.observaciones || ''}</textarea>
                        </div>

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

    cargarSelectBarrios('barrio_id', r.barrio_id);
    toggleCamposEspeciales();

    document.getElementById('btnCerrarPanel').addEventListener('click', cerrarPanelRelevamiento);
    document.getElementById('btnCancelarPanel').addEventListener('click', cerrarPanelRelevamiento);
    document.getElementById('modalRelevamiento').addEventListener('click', (e) => {
        if (e.target.id === 'modalRelevamiento') cerrarPanelRelevamiento();
    });

    document.getElementById('formRelevamiento').addEventListener('submit', async (e) => {
        e.preventDefault();
        await guardarRelevamiento(esNuevo, r.id);
    });
}

function cerrarPanelRelevamiento() {
    const panel = document.getElementById('panelLateral');
    const overlay = document.getElementById('modalRelevamiento');
    if (panel) {
        panel.classList.add('cerrando');
        setTimeout(() => { if (overlay) overlay.remove(); }, 200);
    }
}

function toggleCamposEspeciales() {
    const tipo = document.getElementById('tipo_relevamiento').value;
    const ocupacionDiv = document.getElementById('camposOcupacion');

    if (tipo === 'ocupacion') {
        ocupacionDiv.style.display = 'block';
    } else {
        ocupacionDiv.style.display = 'none';
    }
}

async function guardarRelevamiento(esNuevo, id) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    const data = {
        fecha_relevamiento: document.getElementById('fecha_relevamiento').value,
        tipo_relevamiento: document.getElementById('tipo_relevamiento').value,
        ubicacion: document.getElementById('ubicacion').value,
        zona: document.getElementById('zona').value,
        responsable_nombre: document.getElementById('responsable_nombre').value,
        responsable_dni: document.getElementById('responsable_dni').value,
        observaciones: document.getElementById('observaciones').value,
        barrio_id: document.getElementById('barrio_id').value || null,
        // Campos Ocupacion
        tiene_autorizacion: document.getElementById('tiene_autorizacion').value === '1',
        paga_canon: document.getElementById('paga_canon').value === '1',
        fecha_vencimiento_canon: document.getElementById('fecha_vencimiento_canon').value
    };

    try {
        const url = esNuevo ? `${API_URL}/relevamientos` : `${API_URL}/relevamientos/${id}`;
        const method = esNuevo ? 'POST' : 'PUT';

        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}`
            },
            body: JSON.stringify(data)
        });

        const res = await response.json();

        if (res.success) {
            cerrarPanelRelevamiento();
            cargarRelevamientos();
            alert(res.message);
        } else {
            alert(res.message);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('Error al guardar');
    }
}

async function eliminarRelevamiento(id) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const response = await fetch(`${API_URL}/relevamientos/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        if (response.ok) {
            cargarRelevamientos();
        } else {
            alert('Error al eliminar');
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

// Helpers
function formatearFecha(fecha) {
    if (!fecha) return '-';
    // Asumiendo fecha viene como YYYY-MM-DDT... o YYYY-MM-DD
    const date = new Date(fecha);
    return date.toLocaleDateString('es-AR');
}

function formatDateForInput(fecha) {
    if (!fecha) return '';
    const d = new Date(fecha);
    return d.toISOString().split('T')[0];
}
