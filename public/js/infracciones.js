// public/js/infracciones.js

const API_URL = '/api';
let infracciones = [];
let infraccionEditando = null;

// Estado de paginación
let paginacionActual = {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 10
};
let filtrosActuales = {};

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

    return {
        token,
        usuario: JSON.parse(usuario)
    };
}

// ============================================
// CARGAR DATOS
// ============================================

async function cargarInfracciones(filtros = {}, pagina = 1) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    if (Object.keys(filtros).length > 0 || pagina === 1) {
        filtrosActuales = filtros;
    }

    try {
        const params = new URLSearchParams();
        if (filtrosActuales.fecha_desde) params.append('fecha_desde', filtrosActuales.fecha_desde);
        if (filtrosActuales.fecha_hasta) params.append('fecha_hasta', filtrosActuales.fecha_hasta);

        // Búsqueda desde el input principal
        const busqueda = document.getElementById('searchInput').value;
        if (busqueda) params.append('busqueda', busqueda);

        params.append('page', pagina);
        params.append('limit', paginacionActual.recordsPerPage);

        const response = await fetch(`${API_URL}/infracciones?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) throw new Error('Error al cargar datos');

        const data = await response.json();
        infracciones = data.data;

        if (data.pagination) paginacionActual = data.pagination;

        mostrarInfracciones();
        mostrarPaginacion();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las infracciones');
    }
}

function mostrarInfracciones() {
    const tbody = document.getElementById('infraccionesTableBody');
    const table = document.getElementById('infraccionesTable');
    const emptyState = document.getElementById('emptyState');
    const loading = document.getElementById('loadingTable');

    loading.style.display = 'none';

    if (infracciones.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = '';

    infracciones.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatearFecha(item.fecha)}</td>
            <td><span class="badge" style="background:#ddd; color:#333;">${item.numero_acta}</span></td>
            <td>
                <div style="font-weight:bold">${item.nombre_apellido}</div>
                <div style="font-size:12px; color:#666">DNI: ${item.dni}</div>
            </td>
            <td>${item.direccion}</td>
            <td>${item.motivo_infraccion}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" data-id="${item.id}" title="Editar">✏️</button>
                    <button class="btn-icon btn-delete" data-id="${item.id}" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

// ============================================
// MODAL Y FORMULARIO
// ============================================

function abrirModal() {
    const modalHTML = `
        <div class="modal-overlay" id="modalOverlay">
            <div class="modal">
                <div class="modal-header">
                    <h2 id="modalTitle">${infraccionEditando ? 'Editar' : 'Nueva'} Acta de Infracción</h2>
                    <button class="btn-close" id="btnCerrarModal">×</button>
                </div>
                <form id="formInfraccion">
                    <div class="modal-body">
                        <div class="form-grid">
                            <div class="form-group-modal">
                                <label>Fecha *</label>
                                <input type="date" id="fecha" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Número de Acta *</label>
                                <input type="text" id="numero_acta" required placeholder="001-2026">
                            </div>
                            <div class="form-group-modal">
                                <label>Nombre y Apellido (Infractor) *</label>
                                <input type="text" id="nombre_apellido" required>
                            </div>
                            <div class="form-group-modal">
                                <label>DNI *</label>
                                <input type="text" id="dni" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Lugar de Infracción *</label>
                                <input type="text" id="direccion" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Barrio</label>
                                <select id="barrio_id">
                                    <option value="">-- Sin asignar --</option>
                                </select>
                            </div>
                            <div class="form-group-modal form-grid-full">
                                <label>Motivo Infracción *</label>
                                <textarea id="motivo_infraccion" required rows="2" placeholder="Describir la falta..."></textarea>
                            </div>
                            <div class="form-group-modal form-grid-full">
                                <label>Observaciones</label>
                                <textarea id="observaciones" rows="2"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn-text" id="btnCancelarModal">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    // Cargar barrios en el select
    cargarSelectBarrios('barrio_id', infraccionEditando?.barrio_id);

    // Event Listeners
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('formInfraccion').addEventListener('submit', guardarInfraccion);

    // Inicializar fecha
    if (!infraccionEditando) {
        document.getElementById('fecha').valueAsDate = new Date();
    } else {
        cargarDatosFormulario();
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.remove();
    infraccionEditando = null;
}

async function guardarInfraccion(e) {
    e.preventDefault();
    const sesion = verificarAutenticacion();

    const formData = {
        fecha: document.getElementById('fecha').value,
        numero_acta: document.getElementById('numero_acta').value,
        nombre_apellido: document.getElementById('nombre_apellido').value,
        dni: document.getElementById('dni').value,
        direccion: document.getElementById('direccion').value,
        motivo_infraccion: document.getElementById('motivo_infraccion').value,
        observaciones: document.getElementById('observaciones').value,
        barrio_id: document.getElementById('barrio_id').value || null
    };

    try {
        const url = infraccionEditando
            ? `${API_URL}/infracciones/${infraccionEditando.id}`
            : `${API_URL}/infracciones`;

        const method = infraccionEditando ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}`
            },
            body: JSON.stringify(formData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Error al guardar');
        }

        cerrarModal();
        cargarInfracciones();
        alert('Guardado exitosamente');

    } catch (error) {
        console.error(error);
        alert(error.message || 'Error al guardar');
    }
}

function cargarDatosFormulario() {
    const i = infraccionEditando;
    document.getElementById('fecha').value = i.fecha.substring(0, 10);
    document.getElementById('numero_acta').value = i.numero_acta;
    document.getElementById('nombre_apellido').value = i.nombre_apellido;
    document.getElementById('dni').value = i.dni;
    document.getElementById('direccion').value = i.direccion;
    document.getElementById('motivo_infraccion').value = i.motivo_infraccion;
    document.getElementById('observaciones').value = i.observaciones || '';
}

// ============================================
// UTILIDADES
// ============================================

function formatearFecha(fecha) {
    if (!fecha) return '-';
    const fechaStr = String(fecha).substring(0, 10);
    const parts = fechaStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
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
            <button class="btn-page" ${currentPage === 1 ? 'disabled' : ''} onclick="cargarInfracciones({}, ${currentPage - 1})">Anterior</button>
            <span class="btn-page-num active">${currentPage}</span>
            <button class="btn-page" ${currentPage === totalPages ? 'disabled' : ''} onclick="cargarInfracciones({}, ${currentPage + 1})">Siguiente</button>
        </div>
    `;
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (sesion) document.getElementById('userName').textContent = sesion.usuario.nombre_completo;

    cargarInfracciones();

    // Event Listeners Globales
    document.getElementById('btnNuevo').addEventListener('click', () => {
        infraccionEditando = null;
        abrirModal();
    });

    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login.html';
    });

    document.getElementById('btnFiltros').addEventListener('click', () => {
        const panel = document.getElementById('filtersPanel');
        panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    });

    document.getElementById('btnAplicarFiltros').addEventListener('click', () => {
        const filtros = {
            fecha_desde: document.getElementById('filterFechaDesde').value,
            fecha_hasta: document.getElementById('filterFechaHasta').value
        };
        cargarInfracciones(filtros);
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filterFechaDesde').value = '';
        document.getElementById('filterFechaHasta').value = '';
        cargarInfracciones();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            cargarInfracciones();
        }, 500);
    });

    // Delegación tabla
    document.getElementById('infraccionesTableBody').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.closest('.btn-edit')) {
            const id = (e.target.dataset.id || e.target.closest('.btn-edit').dataset.id);
            infraccionEditando = infracciones.find(i => i.id == id);
            abrirModal();
        }

        if (e.target.classList.contains('btn-delete') || e.target.closest('.btn-delete')) {
            const id = (e.target.dataset.id || e.target.closest('.btn-delete').dataset.id);
            if (confirm('¿Seguro de eliminar?')) {
                fetch(`${API_URL}/infracciones/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${verificarAutenticacion().token}` }
                }).then(() => {
                    cargarInfracciones();
                    alert('Eliminado');
                });
            }
        }
    });

    // Verificar si hay datos precargados desde Intimaciones
    const datosPendientes = localStorage.getItem('datosNuevaInfraccion');
    if (datosPendientes) {
        try {
            const datos = JSON.parse(datosPendientes);
            // Abrir modal "Nueva"
            infraccionEditando = null;
            abrirModal();

            // Llenar campos
            document.getElementById('nombre_apellido').value = datos.nombre_apellido || '';
            document.getElementById('dni').value = datos.dni || '';
            document.getElementById('direccion').value = datos.direccion || '';
            document.getElementById('motivo_infraccion').value = datos.motivo || '';
            document.getElementById('observaciones').value = datos.observaciones || '';

            // Limpiar para que no se abra de nuevo al recargar
            localStorage.removeItem('datosNuevaInfraccion');

        } catch (err) {
            console.error('Error al cargar datos pendientes:', err);
            localStorage.removeItem('datosNuevaInfraccion');
        }
    }

    // Deep Link Check (desde Carga Unificada)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        cargarInfraccionIndividual(id);
    }
});

async function cargarInfraccionIndividual(id) {
    try {
        const sesion = verificarAutenticacion();
        const response = await fetch(`${API_URL}/infracciones/${id}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                infraccionEditando = result.data;
                setTimeout(() => abrirModal(), 500);
            }
        }
    } catch (e) {
        console.error('Error deep link:', e);
    }
}
