// public/js/intimaciones.js

const API_URL = '/api';
let intimaciones = [];
let intimacionEditando = null;

// Estado de paginación
let paginacionActual = {
    currentPage: 1,
    totalPages: 1,
    totalRecords: 0,
    recordsPerPage: 10
};
let filtrosActuales = {};
let estadisticasActuales = { total: 0, vigentes: 0, proximas_vencer: 0, vencidas: 0, cumplidas: 0 };

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

async function cargarIntimaciones(filtros = {}, pagina = 1) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    if (Object.keys(filtros).length > 0 || pagina === 1) {
        filtrosActuales = filtros;
    }

    try {
        const params = new URLSearchParams();
        if (filtrosActuales.tipo) params.append('tipo', filtrosActuales.tipo);
        if (filtrosActuales.estado) params.append('estado', filtrosActuales.estado);
        if (filtrosActuales.numero) params.append('numero', filtrosActuales.numero);
        if (filtrosActuales.fecha_desde) params.append('fecha_desde', filtrosActuales.fecha_desde);
        if (filtrosActuales.fecha_hasta) params.append('fecha_hasta', filtrosActuales.fecha_hasta);

        // Búsqueda desde el input principal
        const busqueda = document.getElementById('searchInput').value;
        if (busqueda) params.append('busqueda', busqueda);

        params.append('page', pagina);
        params.append('limit', paginacionActual.recordsPerPage);

        const response = await fetch(`${API_URL}/intimaciones?${params.toString()}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        // Si el token expiró o es inválido, redirigir al login
        if (response.status === 401) {
            alert('Tu sesión ha expirado. Por favor, inicia sesión nuevamente.');
            localStorage.removeItem('token');
            localStorage.removeItem('usuario');
            window.location.href = '/login.html';
            return;
        }

        if (!response.ok) throw new Error('Error al cargar datos');

        const data = await response.json();
        intimaciones = data.data;

        if (data.pagination) paginacionActual = data.pagination;
        if (data.stats) estadisticasActuales = data.stats;

        mostrarIntimaciones();
        mostrarPaginacion();
        actualizarEstadisticasVista();

    } catch (error) {
        console.error('Error:', error);
        alert('Error al cargar las intimaciones');
    }
}

function mostrarIntimaciones() {
    const tbody = document.getElementById('intimacionesTableBody');
    const table = document.getElementById('intimacionesTable');
    const emptyState = document.getElementById('emptyState');
    const loading = document.getElementById('loadingTable');

    loading.style.display = 'none';

    if (intimaciones.length === 0) {
        table.style.display = 'none';
        emptyState.style.display = 'block';
        return;
    }

    table.style.display = 'table';
    emptyState.style.display = 'none';
    tbody.innerHTML = '';

    intimaciones.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${formatearFecha(item.fecha)}</td>
            <td><span class="badge">${item.tipo.toUpperCase()}</span></td>
            <td>
                <div style="font-weight:bold">${item.nombre_apellido}</div>
                <div style="font-size:12px; color:#666">DNI: ${item.dni}</div>
            </td>
            <td>${item.direccion}</td>
            <td>
                ${item.plazo_dias} días
                <div style="font-size:11px; color:#888">Intimación #${item.numero_intimacion}</div>
                <div style="font-size:10px; color:${item.estado === 'vencida' ? '#dc3545' : item.estado === 'proxima_vencer' ? '#ff8c00' : '#28a745'}">
                    Vence: ${formatearFecha(item.fecha_vencimiento)}
                </div>
            </td>
            <td><span class="badge badge-${item.estado}">${item.estado.replace('_', ' ')}</span></td>
            <td>
                ${item.infraccion_realizada
                ? `<span class="badge badge-vencida">🚨 INFRACCIONADO</span>
                       <div style="font-size:11px; color:#666; margin-top:4px;">
                           ${item.numero_infraccion ? 'Nº ' + item.numero_infraccion : ''}
                           ${item.fecha_infraccion ? ' - ' + formatearFecha(item.fecha_infraccion) : ''}
                       </div>`
                : '<span style="color:#999">-</span>'
            }
            </td>
            <td>
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" data-id="${item.id}" title="Editar">✏️</button>
                    ${!item.dio_cumplimiento ?
                `<button class="btn-icon btn-next" data-id="${item.id}" title="Generar Siguiente Instancia" style="color: #4BA3D0;">➡️</button>`
                : ''}
                    ${item.estado === 'vencida' && !item.dio_cumplimiento ?
                `<button class="btn-icon btn-infraccion" data-id="${item.id}" title="Generar Infracción" style="color: #D32F2F;">🚨</button>`
                : ''}
                    <button class="btn-icon btn-delete" data-id="${item.id}" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function actualizarEstadisticasVista() {
    // Usar estadísticas del backend (calculadas automáticamente)
    document.getElementById('statTotal').textContent = paginacionActual.totalRecords;

    // Actualizar contadores si existen los elementos
    const statVencidas = document.getElementById('statVencidas');
    const statProximas = document.getElementById('statProximas');
    const statCumplidas = document.getElementById('statCumplidas');
    const statVigentes = document.getElementById('statVigentes');

    if (statVencidas) statVencidas.textContent = estadisticasActuales.vencidas;
    if (statProximas) statProximas.textContent = estadisticasActuales.proximas_vencer;
    if (statCumplidas) statCumplidas.textContent = estadisticasActuales.cumplidas;
    if (statVigentes) statVigentes.textContent = estadisticasActuales.vigentes;
}

// ============================================
// MODAL Y FORMULARIO
// ============================================

function abrirModal() {
    const modalHTML = `
        <div class="modal-overlay" id="modalOverlay">
            <div class="modal">
                <div class="modal-header">
                    <h2 id="modalTitle">${intimacionEditando ? 'Editar' : 'Nueva'} Intimación</h2>
                    <button class="btn-close" id="btnCerrarModal">×</button>
                </div>
                <form id="formIntimacion">
                    <div class="modal-body">
                        <div class="form-grid">
                            <!-- Campos Comunes -->
                            <div class="form-group-modal">
                                <label>Tipo *</label>
                                <select id="tipo" required onchange="cambiarTipoFormulario(this.value)">
                                    <option value="general">General</option>
                                    <option value="baldio">Terreno Baldío</option>
                                    <option value="vehiculo">Vehículo Abandonado</option>
                                </select>
                            </div>
                            <div class="form-group-modal">
                                <label>Fecha *</label>
                                <input type="date" id="fecha" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Nombre y Apellido *</label>
                                <input type="text" id="nombre_apellido" required>
                            </div>
                            <div class="form-group-modal">
                                <label>DNI *</label>
                                <input type="text" id="dni" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Dirección del problema *</label>
                                <input type="text" id="direccion" required>
                            </div>
                            <div class="form-group-modal">
                                <label>Barrio</label>
                                <select id="barrio_id">
                                    <option value="">-- Sin asignar --</option>
                                </select>
                            </div>
                            
                            <div class="form-group-modal">
                                <label>Plazo (días)</label>
                                <input type="number" id="plazo_dias" value="3">
                            </div>
                            <div class="form-group-modal">
                                <label>Nro. Intimación</label>
                                <select id="numero_intimacion">
                                    <option value="1">1ra</option>
                                    <option value="2">2da</option>
                                    <option value="3">3ra</option>
                                </select>
                            </div>

                            <div class="form-group-modal form-grid-full">
                                <label>Intimación por</label>
                                <input type="text" id="tipo_obstruccion" placeholder="Escombros, arena, etc.">
                            </div>

                            <!-- Campos de Infracción (para TODOS los tipos) -->
                            <div class="form-grid-full form-section">
                                <div class="form-section-title">Datos de Infracción (si aplica)</div>
                                <div class="form-grid">
                                    <div class="form-group-modal">
                                        <label>Infracción Realizada</label>
                                        <select id="infraccion_realizada">
                                            <option value="0">No</option>
                                            <option value="1">Sí</option>
                                        </select>
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Número Infracción</label>
                                        <input type="text" id="numero_infraccion">
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Fecha Infracción</label>
                                        <input type="date" id="fecha_infraccion">
                                    </div>
                                </div>
                            </div>

                            <!-- Campos Específicos: BALDÍOS -->
                            <div id="camposBaldio" class="form-grid-full hidden form-section">
                                <div class="form-section-title">Datos de Baldío</div>
                                <div class="form-grid">
                                    <div class="form-group-modal">
                                        <label>Propietario ubicado</label>
                                        <select id="propietario_no_ubicado">
                                            <option value="0">No</option>
                                            <option value="1">Sí</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <!-- Campos Específicos: VEHÍCULOS -->
                            <div id="camposVehiculo" class="form-grid-full hidden form-section">
                                <div class="form-section-title">Datos del Vehículo</div>
                                <div class="form-grid">
                                    <div class="form-group-modal">
                                        <label>Marca</label>
                                        <input type="text" id="marca">
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Modelo</label>
                                        <input type="text" id="modelo">
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Color</label>
                                        <input type="text" id="color">
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Dominio (Patente)</label>
                                        <input type="text" id="dominio">
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Lugar Depósito</label>
                                        <input type="text" id="lugar_deposito">
                                    </div>
                                    <div class="form-group-modal">
                                        <label>Fecha Retiro</label>
                                        <input type="date" id="fecha_retiro">
                                    </div>
                                </div>
                            </div>

                            <div class="form-group-modal form-grid-full">
                                <label>Observaciones</label>
                                <textarea id="observaciones"></textarea>
                            </div>
                            
                            <!-- Checkbox de cumplimiento (solo edición) -->
                            ${intimacionEditando ? `
                            <div class="form-group-modal form-grid-full" style="background:#f5f5f5; padding:10px; border-radius:8px;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                    <input type="checkbox" id="dio_cumplimiento" style="width:auto;">
                                    <strong>¿Dio cumplimiento?</strong> (Marcar para cerrar el caso)
                                </label>
                            </div>
                            ` : ''}

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
    cargarSelectBarrios('barrio_id', intimacionEditando?.barrio_id);

    // Event Listeners
    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('formIntimacion').addEventListener('submit', guardarIntimacion);

    // Inicializar fecha
    if (!intimacionEditando) {
        document.getElementById('fecha').valueAsDate = new Date();
    } else {
        cargarDatosFormulario();
    }
}

function cerrarModal() {
    const modal = document.getElementById('modalOverlay');
    if (modal) modal.remove();
    intimacionEditando = null;
}

function cambiarTipoFormulario(tipo) {
    const balDio = document.getElementById('camposBaldio');
    const vehiculo = document.getElementById('camposVehiculo');

    balDio.classList.add('hidden');
    vehiculo.classList.add('hidden');

    if (tipo === 'baldio') balDio.classList.remove('hidden');
    if (tipo === 'vehiculo') vehiculo.classList.remove('hidden');
}

async function guardarIntimacion(e) {
    e.preventDefault();
    const sesion = verificarAutenticacion();

    const formData = {
        tipo: document.getElementById('tipo').value,
        fecha: document.getElementById('fecha').value,
        nombre_apellido: document.getElementById('nombre_apellido').value,
        dni: document.getElementById('dni').value,
        direccion: document.getElementById('direccion').value,
        tipo_obstruccion: document.getElementById('tipo_obstruccion').value,
        plazo_dias: document.getElementById('plazo_dias').value,
        numero_intimacion: document.getElementById('numero_intimacion').value,
        observaciones: document.getElementById('observaciones').value,

        // Baldios
        infraccion_realizada: document.getElementById('infraccion_realizada')?.value === '1',
        propietario_no_ubicado: document.getElementById('propietario_no_ubicado')?.value === '1',
        numero_infraccion: document.getElementById('numero_infraccion')?.value,
        fecha_infraccion: document.getElementById('fecha_infraccion')?.value,

        // Vehiculos
        marca: document.getElementById('marca')?.value,
        modelo: document.getElementById('modelo')?.value,
        color: document.getElementById('color')?.value,
        dominio: document.getElementById('dominio')?.value,
        lugar_deposito: document.getElementById('lugar_deposito')?.value,
        fecha_retiro: document.getElementById('fecha_retiro')?.value,
        barrio_id: document.getElementById('barrio_id').value || null,
    };

    if (intimacionEditando) {
        const dioCumplimiento = document.getElementById('dio_cumplimiento')?.checked;
        if (dioCumplimiento) formData.dio_cumplimiento = true;
    }

    try {
        const url = intimacionEditando
            ? `${API_URL}/intimaciones/${intimacionEditando.id}`
            : `${API_URL}/intimaciones`;

        const method = intimacionEditando ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}`
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) throw new Error('Error al guardar');

        cerrarModal();
        cargarIntimaciones();
        alert('Guardado exitosamente');

    } catch (error) {
        console.error(error);
        alert('Error al guardar');
    }
}

function cargarDatosFormulario() {
    const i = intimacionEditando;
    document.getElementById('tipo').value = i.tipo;
    cambiarTipoFormulario(i.tipo); // Mostrar campos correspondientes

    document.getElementById('fecha').value = i.fecha.substring(0, 10);
    document.getElementById('nombre_apellido').value = i.nombre_apellido;
    document.getElementById('dni').value = i.dni;
    document.getElementById('direccion').value = i.direccion;
    document.getElementById('tipo_obstruccion').value = i.tipo_obstruccion || '';
    document.getElementById('plazo_dias').value = i.plazo_dias;
    document.getElementById('numero_intimacion').value = i.numero_intimacion;
    document.getElementById('observaciones').value = i.observaciones || '';

    // Campos Baldios
    if (i.tipo === 'baldio') {
        document.getElementById('infraccion_realizada').value = i.infraccion_realizada ? '1' : '0';
        document.getElementById('propietario_no_ubicado').value = i.propietario_no_ubicado ? '1' : '0';
        document.getElementById('numero_infraccion').value = i.numero_infraccion || '';
        if (i.fecha_infraccion) document.getElementById('fecha_infraccion').value = i.fecha_infraccion.substring(0, 10);
    }

    // Campos Vehiculos
    if (i.tipo === 'vehiculo') {
        document.getElementById('marca').value = i.marca || '';
        document.getElementById('modelo').value = i.modelo || '';
        document.getElementById('color').value = i.color || '';
        document.getElementById('dominio').value = i.dominio || '';
        document.getElementById('lugar_deposito').value = i.lugar_deposito || '';
        if (i.fecha_retiro) document.getElementById('fecha_retiro').value = i.fecha_retiro.substring(0, 10);
    }

    if (i.dio_cumplimiento) {
        document.getElementById('dio_cumplimiento').checked = true;
    }
}

// ============================================
// UTILIDADES
// ============================================

function formatearFecha(fecha) {
    if (!fecha) return '-';
    // Manejar formato ISO
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
            <button class="btn-page" ${currentPage === 1 ? 'disabled' : ''} onclick="cargarIntimaciones({}, ${currentPage - 1})">Anterior</button>
            <span class="btn-page-num active">${currentPage}</span>
            <button class="btn-page" ${currentPage === totalPages ? 'disabled' : ''} onclick="cargarIntimaciones({}, ${currentPage + 1})">Siguiente</button>
        </div>
    `;
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (sesion) document.getElementById('userName').textContent = sesion.usuario.nombre_completo;

    cargarIntimaciones();

    // Event Listeners Globales
    document.getElementById('btnNuevo').addEventListener('click', () => {
        intimacionEditando = null;
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
            tipo: document.getElementById('filterTipo').value,
            estado: document.getElementById('filterEstado').value,
            numero: document.getElementById('filterNumero').value,
            fecha_desde: document.getElementById('filterFechaDesde').value,
            fecha_hasta: document.getElementById('filterFechaHasta').value
        };
        cargarIntimaciones(filtros);
    });

    document.getElementById('btnLimpiarFiltros').addEventListener('click', () => {
        document.getElementById('filterTipo').value = '';
        document.getElementById('filterEstado').value = '';
        document.getElementById('filterNumero').value = '';
        document.getElementById('filterFechaDesde').value = '';
        document.getElementById('filterFechaHasta').value = '';
        cargarIntimaciones();
    });

    document.getElementById('searchInput').addEventListener('input', (e) => {
        // Debounce simple
        clearTimeout(window.searchTimeout);
        window.searchTimeout = setTimeout(() => {
            cargarIntimaciones();
        }, 500);
    });

    // Delegación tabla
    document.getElementById('intimacionesTableBody').addEventListener('click', (e) => {
        if (e.target.classList.contains('btn-edit') || e.target.closest('.btn-edit')) {
            const id = (e.target.dataset.id || e.target.closest('.btn-edit').dataset.id);
            intimacionEditando = intimaciones.find(i => i.id == id);
            abrirModal();
        }

        if (e.target.classList.contains('btn-delete') || e.target.closest('.btn-delete')) {
            const id = (e.target.dataset.id || e.target.closest('.btn-delete').dataset.id);
            if (confirm('¿Seguro de eliminar?')) {
                // llamar a api delete
                fetch(`${API_URL}/intimaciones/${id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${verificarAutenticacion().token}` }
                }).then(() => {
                    cargarIntimaciones();
                    alert('Eliminado');
                });
            }
        }

        if (e.target.classList.contains('btn-next') || e.target.closest('.btn-next')) {
            const id = (e.target.dataset.id || e.target.closest('.btn-next').dataset.id);
            const original = intimaciones.find(i => i.id == id);

            // Preparar nueva instancia
            intimacionEditando = null; // Es una NUEVA, no edición
            abrirModal();

            // Precargar datos del original
            document.getElementById('tipo').value = original.tipo;
            cambiarTipoFormulario(original.tipo);

            document.getElementById('fecha').valueAsDate = new Date(); // Fecha HOY
            document.getElementById('nombre_apellido').value = original.nombre_apellido;
            document.getElementById('dni').value = original.dni;
            document.getElementById('direccion').value = original.direccion;
            document.getElementById('tipo_obstruccion').value = original.tipo_obstruccion || '';
            document.getElementById('plazo_dias').value = original.plazo_dias; // Mismo plazo por defecto

            // Incrementar número
            let nextNum = (parseInt(original.numero_intimacion) || 1) + 1;
            if (nextNum > 3) nextNum = 3; // Tope en 3ra? O dejar libre. Por ahora tope visual del select.
            document.getElementById('numero_intimacion').value = nextNum;

            document.getElementById('observaciones').value = `Continuación de intimación #${original.id}. \n` + (original.observaciones || '');

            // Copiar datos específicos si existen
            if (original.tipo === 'baldio') {
                document.getElementById('infraccion_realizada').value = original.infraccion_realizada ? '1' : '0';
                document.getElementById('propietario_no_ubicado').value = original.propietario_no_ubicado ? '1' : '0';
            }
            if (original.tipo === 'vehiculo') {
                document.getElementById('marca').value = original.marca || '';
                document.getElementById('modelo').value = original.modelo || '';
                document.getElementById('color').value = original.color || '';
                document.getElementById('dominio').value = original.dominio || '';
                document.getElementById('lugar_deposito').value = original.lugar_deposito || '';
            }

            // Cambiar título del modal para que sea obvio
            document.getElementById('modalTitle').textContent = `Nueva Intimación (Instancia ${nextNum})`;
        }

        if (e.target.classList.contains('btn-infraccion') || e.target.closest('.btn-infraccion')) {
            const id = (e.target.dataset.id || e.target.closest('.btn-infraccion').dataset.id);
            const original = intimaciones.find(i => i.id == id);

            // Guardar datos en localStorage para usar en la pág de Infracciones
            const datosParaInfraccion = {
                origen: 'intimacion',
                intimacion_id: original.id,
                nombre_apellido: original.nombre_apellido,
                dni: original.dni,
                direccion: original.direccion,
                motivo: `Incumplimiento de Intimación #${original.numero_intimacion} (Vencida el ${formatearFecha(original.fecha_vencimiento)})`,
                observaciones: `Generada automáticamente desde Intimación #${original.id}.`
            };

            localStorage.setItem('datosNuevaInfraccion', JSON.stringify(datosParaInfraccion));

            // Redirigir
            window.location.href = 'infracciones.html';
        }
    });

    // Deep Link Check
    const urlParams = new URLSearchParams(window.location.search);
    const id = urlParams.get('id');
    if (id) {
        cargarIntimacionIndividual(id);
    }
});

async function cargarIntimacionIndividual(id) {
    try {
        const sesion = verificarAutenticacion();
        const response = await fetch(`${API_URL}/intimaciones/${id}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        if (response.ok) {
            const result = await response.json();
            if (result.success && result.data) {
                // Set globally for openModal to use
                intimacionEditando = result.data;
                setTimeout(() => abrirModal(), 500);
            }
        }
    } catch (e) {
        console.error('Error deep link:', e);
    }
}
