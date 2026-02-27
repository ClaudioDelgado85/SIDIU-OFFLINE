// ============================================
// CONFIGURACIÓN
// ============================================

const API_URL = 'http://localhost:3000/api';
let expedientes = [];
let expedienteEditando = null;

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
// CARGAR EXPEDIENTES
// ============================================

async function cargarExpedientes(filtros = {}, pagina = 1) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    // Guardar filtros actuales para la paginación
    if (Object.keys(filtros).length > 0 || pagina === 1) {
        filtrosActuales = filtros;
    }

    try {
        // Construir query string con filtros y paginación
        const params = new URLSearchParams();
        if (filtrosActuales.estado) params.append('estado', filtrosActuales.estado);
        if (filtrosActuales.motivo) params.append('motivo', filtrosActuales.motivo);
        if (filtrosActuales.fecha_desde) params.append('fecha_desde', filtrosActuales.fecha_desde);
        if (filtrosActuales.fecha_hasta) params.append('fecha_hasta', filtrosActuales.fecha_hasta);
        if (filtrosActuales.busqueda) {
            params.append('busqueda', filtrosActuales.busqueda);
        }

        // Parámetros de paginación
        params.append('page', pagina);
        params.append('limit', paginacionActual.recordsPerPage);

        const url = `${API_URL}/expedientes?${params.toString()}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${sesion.token}`
            }
        });

        if (!response.ok) {
            throw new Error('Error al cargar expedientes');
        }

        const data = await response.json();
        expedientes = data.data;

        // Actualizar estado de paginación
        if (data.pagination) {
            paginacionActual = data.pagination;
        }

        mostrarExpedientes();
        mostrarPaginacion();

    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al cargar expedientes');
    }
}

// ============================================
// MOSTRAR EXPEDIENTES EN LA TABLA
// ============================================

function mostrarExpedientes() {
    const loadingTable = document.getElementById('loadingTable');
    const emptyState = document.getElementById('emptyState');
    const table = document.getElementById('expedientesTable');
    const tbody = document.getElementById('expedientesTableBody');

    // Ocultar loading
    loadingTable.style.display = 'none';

    if (expedientes.length === 0) {
        emptyState.style.display = 'block';
        table.style.display = 'none';
        return;
    }

    emptyState.style.display = 'none';
    table.style.display = 'table';

    // Limpiar tabla
    tbody.innerHTML = '';

    // Llenar tabla
    expedientes.forEach(exp => {
        const tr = document.createElement('tr');
        tr.setAttribute('data-estado', exp.estado);

        tr.innerHTML = `
            <td><span class="celda-numero">${exp.numero_expediente}</span></td>
            <td>${formatearFecha(exp.fecha)}</td>
            <td>
                <div class="celda-nombre">${exp.nombre_apellido}</div>
                <div class="celda-sub">${exp.dni}</div>
            </td>
            <td><span class="celda-tag" title="${formatearMotivo(exp.motivo)}">${formatearMotivo(exp.motivo)}</span></td>
            <td><span class="estado-badge estado-${exp.estado}">${formatearEstado(exp.estado)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" data-id="${exp.id}" title="Editar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events: none;">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" data-id="${exp.id}" data-numero="${exp.numero_expediente}" title="Eliminar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events: none;">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

// ============================================
// CARGAR ESTADÍSTICAS
// ============================================

async function cargarEstadisticas() {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const response = await fetch(`${API_URL}/expedientes/estadisticas`, {
            headers: {
                'Authorization': `Bearer ${sesion.token}`
            }
        });

        if (!response.ok) throw new Error('Error al cargar estadísticas');

        const data = await response.json();
        const stats = data.data;

        // Actualizar contadores
        document.getElementById('statTotal').textContent = stats.total;

        // Contar por estado
        const porEstado = stats.por_estado.reduce((acc, item) => {
            acc[item.estado] = item.cantidad;
            return acc;
        }, {});

        document.getElementById('statIngreso').textContent = porEstado.ingreso || 0;
        document.getElementById('statEnInspeccion').textContent = porEstado.en_inspeccion || 0;
        document.getElementById('statSalida').textContent = porEstado.salida || 0;
        document.getElementById('statPlazoOtorgado').textContent = porEstado.plazo_otorgado || 0;

    } catch (error) {
        console.error('Error:', error);
    }
}

// ============================================
// CREAR/EDITAR EXPEDIENTE
// ============================================

// ============================================

async function guardarExpediente(event) {
    event.preventDefault();

    const sesion = verificarAutenticacion();
    if (!sesion) return;

    // Si el motivo es "otros", combinar con el detalle
    const motivoSelect = document.getElementById('motivo').value;
    const motivoDetalle = document.getElementById('motivo_detalle')?.value || '';
    const motivoFinal = motivoSelect === 'otros' ? `Otros: ${motivoDetalle}` : motivoSelect;

    const formData = {
        fecha: document.getElementById('fecha').value,
        numero_expediente: document.getElementById('numero_expediente').value,
        nombre_apellido: document.getElementById('nombre_apellido').value,
        dni: document.getElementById('dni').value,
        motivo: motivoFinal,
        direccion: document.getElementById('direccion').value || null,
        numero_partida: document.getElementById('numero_partida').value || null,
        estado: document.getElementById('estado').value,
        barrio_id: document.getElementById('barrio_id').value || null,
        fecha_inspeccion: document.getElementById('fecha_inspeccion').value || null,
        plazo_dias: document.getElementById('plazo_dias').value || null,
        fecha_salida: document.getElementById('fecha_salida').value || null,
        observaciones: document.getElementById('observaciones').value || null
    };

    try {
        const url = expedienteEditando
            ? `${API_URL}/expedientes/${expedienteEditando.id}`
            : `${API_URL}/expedientes`;

        const method = expedienteEditando ? 'PUT' : 'POST';

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
            throw new Error(data.message || 'Error al guardar expediente');
        }

        cerrarModal();
        cargarExpedientes();
        cargarEstadisticas();

        mostrarMensajeExito(expedienteEditando ? 'Expediente actualizado' : 'Expediente creado');

    } catch (error) {
        console.error('Error:', error);
        mostrarError(error.message);
    }
}

// ============================================
// EDITAR EXPEDIENTE
// ============================================

function editarExpediente(id) {
    const expediente = expedientes.find(e => e.id === id);
    if (!expediente) return;

    expedienteEditando = expediente;

    // Primero abrir el modal para que existan los elementos en el DOM
    abrirModal();

    // Llenar formulario
    // Manejo robusto de fechas: extraer YYYY-MM-DD directamente del string
    console.log('Fecha recibida:', expediente.fecha);
    let fechaInput = '';

    if (expediente.fecha) {
        // Tomamos los primeros 10 caracteres (YYYY-MM-DD)
        // Esto funciona tanto para "2026-02-05T00:00:00.000Z" como para "2026-02-05"
        fechaInput = String(expediente.fecha).substring(0, 10);
    }

    document.getElementById('fecha').value = fechaInput;
    document.getElementById('numero_expediente').value = expediente.numero_expediente;
    document.getElementById('nombre_apellido').value = expediente.nombre_apellido;
    document.getElementById('dni').value = expediente.dni;
    if (expediente.direccion) document.getElementById('direccion').value = expediente.direccion;
    if (expediente.numero_partida) document.getElementById('numero_partida').value = expediente.numero_partida;

    // Motivo se carga en el callback de cargarSelectCatalogo via _setMotivoDesdeEdicion
    // (ya se maneja en abrirModal)

    document.getElementById('estado').value = expediente.estado;

    // Campos del nuevo flujo
    if (expediente.fecha_inspeccion) {
        document.getElementById('fecha_inspeccion').value = String(expediente.fecha_inspeccion).substring(0, 10);
    }
    if (expediente.plazo_dias) {
        document.getElementById('plazo_dias').value = expediente.plazo_dias;
    }
    if (expediente.fecha_salida) {
        document.getElementById('fecha_salida').value = String(expediente.fecha_salida).substring(0, 10);
    }
    if (expediente.observaciones) {
        document.getElementById('observaciones').value = expediente.observaciones;
    }

    // Mostrar/ocultar campos según estado
    toggleCamposEstado(expediente.estado);

    // Cambiar título del modal
    document.getElementById('modalTitle').textContent = 'Editar Expediente';
}

// ============================================
// ELIMINAR EXPEDIENTE
// ============================================

async function eliminarExpediente(id, numero) {
    if (!confirm(`¿Está seguro de eliminar el expediente ${numero}?`)) {
        return;
    }

    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const response = await fetch(`${API_URL}/expedientes/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${sesion.token}`
            }
        });

        if (!response.ok) throw new Error('Error al eliminar');

        cargarExpedientes();
        cargarEstadisticas();
        mostrarMensajeExito('Expediente eliminado');

    } catch (error) {
        console.error('Error:', error);
        mostrarError('Error al eliminar expediente');
    }
}

// ============================================
// MODAL
// ============================================

function abrirModal() {
    const panelHTML = `
        <div class="panel-overlay" id="modalOverlay">
            <div class="panel-lateral" id="panelLateral">
                <div class="panel-header">
                    <h2 id="modalTitle">${expedienteEditando ? 'Editar Expediente' : 'Nuevo Expediente'}</h2>
                    <button class="btn-close-panel" id="btnCerrarModal">×</button>
                </div>
                <form id="formExpediente">
                    <div class="panel-body">
                        <div class="form-grid">
                            <div class="form-group-modal">
                                <label>Fecha *</label>
                                <input type="date" id="fecha" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Nº Expediente *</label>
                                <input type="text" id="numero_expediente" placeholder="Ej: 11-V-2026" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Nombre y Apellido *</label>
                                <input type="text" id="nombre_apellido" placeholder="Nombre completo" required>
                            </div>
                            <div class="form-group-modal">
                                <label>DNI *</label>
                                <input type="text" id="dni" placeholder="Número de DNI" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Dirección</label>
                                <input type="text" id="direccion" placeholder="Dirección del inmueble">
                            </div>
                            <div class="form-group-modal">
                                <label>N° de Partida</label>
                                <input type="text" id="numero_partida" placeholder="Número de partida">
                            </div>
                            <div class="form-group-modal">
                                <label>Estado</label>
                                <select id="estado">
                                    <option value="ingreso">Ingresó</option>
                                    <option value="en_inspeccion">En inspección</option>
                                    <option value="plazo_otorgado">Plazo otorgado</option>
                                    <option value="salida">Dio salida</option>
                                </select>
                            </div>
                            <div class="form-group-modal" id="grupoFechaInspeccion" style="display:none">
                                <label>Fecha de Inspección</label>
                                <input type="date" id="fecha_inspeccion">
                            </div>
                            <div class="form-group-modal" id="grupoPlazo" style="display:none">
                                <label>Plazo (días)</label>
                                <input type="number" id="plazo_dias" placeholder="Ej: 30" min="1">
                            </div>
                            <div class="form-group-modal" id="grupoFechaSalida" style="display:none">
                                <label>Fecha de Salida</label>
                                <input type="date" id="fecha_salida">
                            </div>
                            <div class="form-group-modal">
                                <label>Barrio</label>
                                <select id="barrio_id">
                                    <option value="">-- Sin asignar --</option>
                                </select>
                            </div>
                            <div class="form-group-modal">
                                <label>Motivo *</label>
                                <select id="motivo" required>
                                    <option value="">-- Cargando... --</option>
                                </select>
                            </div>
                            <div class="form-group-modal" id="grupoMotivoDetalle" style="display:none">
                                <label>Detalle del motivo *</label>
                                <input type="text" id="motivo_detalle" placeholder="Especifique el motivo">
                            </div>
                            <div class="form-group-modal form-grid-full" id="grupoObservaciones" style="display:none">
                                <label>Observaciones</label>
                                <textarea id="observaciones" placeholder="Notas del inspector u observaciones generales"></textarea>
                            </div>
                        </div>
                    </div>
                    <div class="panel-footer">
                        <button type="button" class="btn-text" id="btnCancelarModal">Cancelar</button>
                        <button type="submit" class="btn-primary">
                            ${expedienteEditando ? 'Actualizar' : 'Crear'} Expediente
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', panelHTML);

    // Cargar barrios en el select
    cargarSelectBarrios('barrio_id', expedienteEditando?.barrio_id);

    // Cargar motivos desde catálogo
    cargarSelectCatalogo('motivo', 'motivo_expediente', expedienteEditando?.motivo || null).then(() => {
        if (expedienteEditando) {
            _setMotivoDesdeEdicion(expedienteEditando.motivo);
        }
    });

    // Establecer fecha actual por defecto si es nuevo
    if (!expedienteEditando) {
        document.getElementById('fecha').valueAsDate = new Date();
    }

    // Agregar event listeners
    document.getElementById('formExpediente').addEventListener('submit', guardarExpediente);
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);

    // Listener para mostrar/ocultar campos según estado
    document.getElementById('estado').addEventListener('change', (e) => {
        toggleCamposEstado(e.target.value);
    });

    // Listener para mostrar/ocultar campo detalle de motivo "Otros"
    document.getElementById('motivo').addEventListener('change', (e) => {
        const grupoDetalle = document.getElementById('grupoMotivoDetalle');
        if (grupoDetalle) {
            grupoDetalle.style.display = e.target.value === 'otros' ? '' : 'none';
        }
    });

    // Si estamos editando, mostrar campos según estado actual
    if (expedienteEditando) {
        toggleCamposEstado(expedienteEditando.estado);
    }

    // Cerrar al hacer click en overlay (fuera del panel)
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') {
            cerrarModal();
        }
    });
}

function cerrarModal() {
    const panel = document.getElementById('panelLateral');
    const overlay = document.getElementById('modalOverlay');
    if (panel) {
        panel.classList.add('cerrando');
        setTimeout(() => {
            if (overlay) overlay.remove();
        }, 200);
    }
    expedienteEditando = null;
}

// ============================================
// TOGGLE CAMPOS DINÁMICOS SEGÚN ESTADO
// ============================================

function toggleCamposEstado(estado) {
    const grupoInspeccion = document.getElementById('grupoFechaInspeccion');
    const grupoPlazo = document.getElementById('grupoPlazo');
    const grupoSalida = document.getElementById('grupoFechaSalida');
    const grupoObs = document.getElementById('grupoObservaciones');

    // Ocultar todos primero
    if (grupoInspeccion) grupoInspeccion.style.display = 'none';
    if (grupoPlazo) grupoPlazo.style.display = 'none';
    if (grupoSalida) grupoSalida.style.display = 'none';
    if (grupoObs) grupoObs.style.display = 'none';

    // Mostrar según estado seleccionado
    if (estado === 'en_inspeccion' || estado === 'plazo_otorgado' || estado === 'salida') {
        if (grupoInspeccion) grupoInspeccion.style.display = '';
        if (grupoObs) grupoObs.style.display = '';
    }
    if (estado === 'plazo_otorgado' || estado === 'salida') {
        if (grupoPlazo) grupoPlazo.style.display = '';
    }
    if (estado === 'salida') {
        if (grupoSalida) grupoSalida.style.display = '';
    }
}

// ============================================
// FILTROS
// ============================================

function toggleFiltros() {
    const panel = document.getElementById('filtersPanel');
    const btn = document.getElementById('btnFiltros');

    if (panel.style.display === 'none') {
        panel.style.display = 'block';
        btn.classList.add('active');
    } else {
        panel.style.display = 'none';
        btn.classList.remove('active');
    }
}

function aplicarFiltros() {
    const filtros = {
        estado: document.getElementById('filterEstado').value,
        motivo: document.getElementById('filterMotivo').value,
        fecha_desde: document.getElementById('filterFechaDesde').value,
        fecha_hasta: document.getElementById('filterFechaHasta').value
    };

    cargarExpedientes(filtros);
}

function limpiarFiltros() {
    document.getElementById('filterEstado').value = '';
    document.getElementById('filterMotivo').value = '';
    document.getElementById('filterFechaDesde').value = '';
    document.getElementById('filterFechaHasta').value = '';
    cargarExpedientes();
}

// ============================================
// BÚSQUEDA
// ============================================

let searchTimeout;
function buscar(texto) {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
        cargarExpedientes({ busqueda: texto });
    }, 500);
}

// ============================================
// UTILIDADES
// ============================================

function formatearFecha(fecha) {
    if (!fecha) return '-';
    // Extraer solo la parte YYYY-MM-DD (primeros 10 caracteres)
    // Esto funciona tanto para "2026-02-05" como para "2026-02-05T00:00:00.000Z"
    const fechaStr = String(fecha).substring(0, 10);
    const d = new Date(fechaStr + 'T00:00:00');

    if (isNaN(d.getTime())) return '-';

    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatearEstado(estado) {
    const estados = {
        'ingreso': 'Ingresó',
        'en_inspeccion': 'En inspección',
        'plazo_otorgado': 'Plazo otorgado',
        'salida': 'Dio salida'
    };
    return estados[estado] || estado;
}

function formatearMotivo(motivo) {
    // Intentar usar el caché de catálogo si está disponible
    if (_cacheLabelMotivos && _cacheLabelMotivos[motivo]) return _cacheLabelMotivos[motivo];
    if (motivo && motivo.startsWith('Otros:')) return motivo;
    return motivo || '-';
}

// Caché de labels de motivo cargados del catálogo
let _cacheLabelMotivos = null;

// Helper: cargar caché de labels de motivo
async function _cargarCacheMotivos() {
    try {
        const datos = await obtenerCatalogo('motivo_expediente');
        _cacheLabelMotivos = {};
        datos.forEach(d => { _cacheLabelMotivos[d.valor] = d.label; });
    } catch (e) {
        console.error('Error cargando caché de motivos:', e);
    }
}

// Helper: setear el valor de motivo al editar (maneja valor de catálogo o "Otros: xxx")
function _setMotivoDesdeEdicion(valor) {
    if (!valor) return;

    const select = document.getElementById('motivo');
    if (!select) return;

    const opciones = Array.from(select.options).map(o => o.value);
    const valorLower = valor.toLowerCase();

    if (valorLower.startsWith('otros:')) {
        select.value = 'otros';
        const detalle = valor.substring(6).trim();
        document.getElementById('motivo_detalle').value = detalle;
        document.getElementById('grupoMotivoDetalle').style.display = '';
    } else if (opciones.includes(valorLower) || opciones.includes(valor)) {
        select.value = opciones.includes(valorLower) ? valorLower : valor;
    } else {
        // Valor no reconocido → tratarlo como "Otros"
        select.value = 'otros';
        document.getElementById('motivo_detalle').value = valor;
        document.getElementById('grupoMotivoDetalle').style.display = '';
    }
}

// ============================================
// PAGINACIÓN
// ============================================

function mostrarPaginacion() {
    // Buscar o crear el contenedor de paginación
    let paginacionContainer = document.getElementById('paginacionContainer');

    if (!paginacionContainer) {
        // Crear el contenedor si no existe
        const tableContainer = document.querySelector('.table-container');
        if (tableContainer) {
            paginacionContainer = document.createElement('div');
            paginacionContainer.id = 'paginacionContainer';
            paginacionContainer.className = 'pagination-container';
            tableContainer.appendChild(paginacionContainer);
        } else {
            return;
        }
    }

    const { currentPage, totalPages, totalRecords, recordsPerPage } = paginacionActual;

    // Si no hay registros o solo una página, mostrar info mínima
    if (totalRecords === 0) {
        paginacionContainer.innerHTML = '';
        return;
    }

    const inicio = (currentPage - 1) * recordsPerPage + 1;
    const fin = Math.min(currentPage * recordsPerPage, totalRecords);

    let paginacionHTML = `
        <div class="pagination-info">
            Mostrando ${inicio} - ${fin} de ${totalRecords} registros
        </div>
    `;

    if (totalPages > 1) {
        paginacionHTML += `
            <div class="pagination-controls">
                <button class="btn-page" id="btnPaginaAnterior" ${currentPage === 1 ? 'disabled' : ''}>
                    ← Anterior
                </button>
                <div class="pagination-numbers">
        `;

        // Mostrar números de página
        const maxPagesToShow = 5;
        let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
        let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

        if (endPage - startPage < maxPagesToShow - 1) {
            startPage = Math.max(1, endPage - maxPagesToShow + 1);
        }

        if (startPage > 1) {
            paginacionHTML += `<button class="btn-page-num" data-page="1">1</button>`;
            if (startPage > 2) {
                paginacionHTML += `<span class="pagination-ellipsis">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === currentPage ? 'active' : '';
            paginacionHTML += `<button class="btn-page-num ${activeClass}" data-page="${i}">${i}</button>`;
        }

        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginacionHTML += `<span class="pagination-ellipsis">...</span>`;
            }
            paginacionHTML += `<button class="btn-page-num" data-page="${totalPages}">${totalPages}</button>`;
        }

        paginacionHTML += `
                </div>
                <button class="btn-page" id="btnPaginaSiguiente" ${currentPage === totalPages ? 'disabled' : ''}>
                    Siguiente →
                </button>
            </div>
        `;
    }

    paginacionContainer.innerHTML = paginacionHTML;

    // Agregar event listeners para los botones de paginación
    const btnAnterior = document.getElementById('btnPaginaAnterior');
    const btnSiguiente = document.getElementById('btnPaginaSiguiente');

    if (btnAnterior) {
        btnAnterior.addEventListener('click', () => {
            if (paginacionActual.currentPage > 1) {
                cargarExpedientes({}, paginacionActual.currentPage - 1);
            }
        });
    }

    if (btnSiguiente) {
        btnSiguiente.addEventListener('click', () => {
            if (paginacionActual.currentPage < paginacionActual.totalPages) {
                cargarExpedientes({}, paginacionActual.currentPage + 1);
            }
        });
    }

    // Event listeners para números de página
    document.querySelectorAll('.btn-page-num').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const pagina = parseInt(e.target.dataset.page);
            if (pagina !== paginacionActual.currentPage) {
                cargarExpedientes({}, pagina);
            }
        });
    });
}

function mostrarError(mensaje) {
    // TODO: Implementar toast/notificación
    alert(mensaje);
}

function mostrarMensajeExito(mensaje) {
    // TODO: Implementar toast/notificación
    alert(mensaje);
}

function cerrarSesion() {
    localStorage.removeItem('token');
    localStorage.removeItem('usuario');
    window.location.href = '/login.html';
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    // Mostrar nombre de usuario
    document.getElementById('userName').textContent = sesion.usuario.nombre_completo;

    // Cargar datos
    cargarExpedientes();
    cargarEstadisticas();

    // Cargar caché de motivos para formatear labels en la tabla
    _cargarCacheMotivos();

    // Cargar filtro de motivos desde catálogo
    cargarSelectCatalogo('filterMotivo', 'motivo_expediente', null, { incluirVacio: true, textoVacio: 'Todos' });

    // Event listeners
    document.getElementById('btnNuevo').addEventListener('click', () => {
        expedienteEditando = null;
        abrirModal();
    });

    document.getElementById('btnLogout').addEventListener('click', cerrarSesion);

    document.getElementById('btnFiltros').addEventListener('click', toggleFiltros);
    document.getElementById('btnAplicarFiltros').addEventListener('click', aplicarFiltros);
    document.getElementById('btnLimpiarFiltros').addEventListener('click', limpiarFiltros);

    document.getElementById('searchInput').addEventListener('input', (e) => {
        buscar(e.target.value);
    });

    // Delegación de eventos para la tabla (Editar / Eliminar)
    document.getElementById('expedientesTableBody').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');

        if (btnEdit) {
            const id = parseInt(btnEdit.dataset.id);
            editarExpediente(id);
        }

        if (btnDelete) {
            const id = parseInt(btnDelete.dataset.id);
            const numero = btnDelete.dataset.numero;
            eliminarExpediente(id, numero);
        }
    });

    // Verificar si hay ID en la URL (Deeplink desde Búsqueda)
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        cargarExpedienteIndividual(id);
    }
});

async function cargarExpedienteIndividual(id) {
    try {
        const sesion = verificarAutenticacion();
        if (!sesion) return;
        const idNum = Number(id);
        const response = await fetch(`${API_URL}/expedientes/${id}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        if (response.ok) {
            const result = await response.json();
            if (result.success) {
                const item = Array.isArray(result.data) ? result.data[0] : result.data;
                if (item) {
                    const idx = expedientes.findIndex(e => e.id === item.id);
                    if (idx >= 0) {
                        expedientes[idx] = item;
                    } else {
                        expedientes.push(item);
                    }
                    editarExpediente(Number.isNaN(idNum) ? item.id : idNum);
                }
            }
        }
    } catch (error) {
        console.error('Error cargando expediente individual:', error);
    }
}
