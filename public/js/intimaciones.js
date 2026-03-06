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
        tr.setAttribute('data-estado', item.estado);
        tr.innerHTML = `
            <td>${formatearFecha(item.fecha)}</td>
            <td><span class="celda-tag">${item.tipo.toUpperCase()}</span></td>
            <td>
                <div class="celda-nombre">${item.nombre_apellido}</div>
                <div class="celda-sub">DNI: ${item.dni}</div>
            </td>
            <td>${item.direccion}</td>
            <td style="text-align:center"><span class="celda-numero">#${item.numero_intimacion}</span></td>
            <td style="text-align:center">${item.plazo_dias}d</td>
            <td>
                <span style="color:${item.estado === 'vencida' ? 'var(--si-red)' : item.estado === 'proxima_vencer' ? 'var(--si-amber)' : 'var(--si-green)'}; font-weight:500">
                    ${formatearFecha(item.fecha_vencimiento)}
                </span>
            </td>
            <td><span class="estado-badge estado-${item.estado}">${item.estado.replace('_', ' ')}</span></td>
            <td class="col-extra">
                ${item.infraccion_realizada
                ? `<span class="estado-badge estado-vencida">🚨 INFRACCIONADO</span>
                       <div style="font-size:11px; color:var(--si-text-muted); margin-top:4px;">
                           ${item.numero_infraccion ? 'Nº ' + item.numero_infraccion : ''}
                           ${item.fecha_infraccion ? ' - ' + formatearFecha(item.fecha_infraccion) : ''}
                       </div>`
                : '<span style="color:var(--si-text-muted)">-</span>'
            }
            </td>
            <td class="col-extra">
                <div class="action-buttons">
                    <button class="btn-icon btn-edit" data-id="${item.id}" title="Editar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none;">
                            <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                        </svg>
                    </button>
                    ${!item.dio_cumplimiento ?
                `<button class="btn-icon btn-next" data-id="${item.id}" title="Generar Siguiente Instancia">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none;">
                            <path fill-rule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clip-rule="evenodd"/>
                        </svg>
                    </button>`
                : ''}
                    ${item.estado === 'vencida' && !item.dio_cumplimiento ?
                `<button class="btn-icon btn-infraccion" data-id="${item.id}" title="Generar Infracción">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none;">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>`
                : ''}
                    <button class="btn-icon btn-delete" data-id="${item.id}" title="Eliminar">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none;">
                            <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </button>
                </div>
            </td>
            <td class="col-toggle"></td>
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
        <div class="panel-overlay" id="modalOverlay">
            <div class="panel-lateral" id="panelLateral">
                <div class="panel-header">
                    <h2 id="modalTitle">${intimacionEditando ? 'Editar' : 'Nueva'} Intimación</h2>
                    <button class="btn-close-panel" id="btnCerrarModal">×</button>
                </div>
                <form id="formIntimacion">
                    <div class="panel-body">
                        <div class="form-grid">
                            <!-- Campos Comunes -->
                            <div class="form-group-modal">
                                <label>Tipo *</label>
                                <select id="tipo" required onchange="cambiarTipoFormulario(this.value)">
                                    <option value="">-- Cargando... --</option>
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
                                <select id="tipo_obstruccion">
                                    <option value="">-- Cargando... --</option>
                                </select>
                            </div>
                            <div class="form-group-modal form-grid-full" id="grupoIntimacionPorDetalle" style="display:none">
                                <label>Detalle (especifique)</label>
                                <input type="text" id="tipo_obstruccion_detalle" placeholder="Describa el motivo de la intimación">
                            </div>

                            <!-- Campos de Infracción -->
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
                            
                            ${intimacionEditando ? `
                            <div class="form-group-modal form-grid-full" style="background:var(--si-surface); padding:10px; border-radius:8px;">
                                <label style="display:flex; align-items:center; gap:8px; cursor:pointer;">
                                    <input type="checkbox" id="dio_cumplimiento" style="width:auto;">
                                    <strong>¿Dio cumplimiento?</strong> (Marcar para cerrar el caso)
                                </label>
                            </div>
                            ` : ''}

                        </div>
                    </div>
                    <div class="panel-footer">
                        <button type="button" class="btn-text" id="btnCancelarModal">Cancelar</button>
                        <button type="submit" class="btn-primary">Guardar</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    cargarSelectBarrios('barrio_id', intimacionEditando?.barrio_id);

    cargarSelectCatalogo('tipo', 'tipo_intimacion', intimacionEditando?.tipo || 'general', { incluirVacio: false }).then(() => {
        if (intimacionEditando) cambiarTipoFormulario(intimacionEditando.tipo);
    });
    cargarSelectCatalogo('tipo_obstruccion', 'intimacion_por', null, { incluirVacio: true, textoVacio: '-- Seleccionar --' }).then(() => {
        if (intimacionEditando) {
            _setTipoObstruccionDesdeEdicion(intimacionEditando.tipo_obstruccion);
        }
    });

    document.getElementById('tipo_obstruccion').addEventListener('change', (e) => {
        const grupoDetalle = document.getElementById('grupoIntimacionPorDetalle');
        if (grupoDetalle) {
            grupoDetalle.style.display = e.target.value === 'otros' ? '' : 'none';
        }
    });

    document.getElementById('btnCerrarModal').addEventListener('click', cerrarModal);
    document.getElementById('btnCancelarModal').addEventListener('click', cerrarModal);
    document.getElementById('formIntimacion').addEventListener('submit', guardarIntimacion);

    // Validación: si marca Infracción Realizada = Sí, número es obligatorio
    const selInfraccion = document.getElementById('infraccion_realizada');
    if (selInfraccion) {
        selInfraccion.addEventListener('change', (e) => {
            const numInput = document.getElementById('numero_infraccion');
            const label = numInput?.closest('.form-group-modal')?.querySelector('label');
            if (e.target.value === '1') {
                numInput.required = true;
                numInput.style.borderColor = 'var(--si-amber)';
                if (label) label.innerHTML = 'Número Infracción <span style="color:var(--si-red)">*</span>';
            } else {
                numInput.required = false;
                numInput.style.borderColor = '';
                if (label) label.textContent = 'Número Infracción';
            }
        });
    }
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') cerrarModal();
    });

    if (!intimacionEditando) {
        document.getElementById('fecha').valueAsDate = new Date();
    } else {
        cargarDatosFormulario();
    }
}

function cerrarModal() {
    const panel = document.getElementById('panelLateral');
    const overlay = document.getElementById('modalOverlay');
    if (panel) {
        panel.classList.add('cerrando');
        setTimeout(() => { if (overlay) overlay.remove(); }, 200);
    }
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

    // Calcular valor final de tipo_obstruccion (con lógica "Otros")
    const tipoObstruccionSelect = document.getElementById('tipo_obstruccion').value;
    const tipoObstruccionDetalle = document.getElementById('tipo_obstruccion_detalle')?.value || '';
    const tipoObstruccionFinal = tipoObstruccionSelect === 'otros' ? `Otros: ${tipoObstruccionDetalle} ` : tipoObstruccionSelect;

    const formData = {
        tipo: document.getElementById('tipo').value,
        fecha: document.getElementById('fecha').value,
        nombre_apellido: document.getElementById('nombre_apellido').value,
        dni: document.getElementById('dni').value,
        direccion: document.getElementById('direccion').value,
        tipo_obstruccion: tipoObstruccionFinal,
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

    // Validación frontend: si infraccion_realizada = true, numero_infraccion es obligatorio
    if (formData.infraccion_realizada && (!formData.numero_infraccion || formData.numero_infraccion.trim() === '')) {
        alert('Debe ingresar el número de infracción cuando marca "Infracción Realizada".');
        document.getElementById('numero_infraccion')?.focus();
        return;
    }

    if (intimacionEditando) {
        const dioCumplimiento = document.getElementById('dio_cumplimiento')?.checked;
        if (dioCumplimiento) formData.dio_cumplimiento = true;
    }

    try {
        const url = intimacionEditando
            ? `${API_URL} /intimaciones/${intimacionEditando.id} `
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
    // tipo_obstruccion se carga en el callback de cargarSelectCatalogo via _setTipoObstruccionDesdeEdicion
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

// Helper: setear el valor de tipo_obstruccion al editar (maneja valor de catálogo o "Otros: xxx")
function _setTipoObstruccionDesdeEdicion(valor) {
    if (!valor) return;

    const select = document.getElementById('tipo_obstruccion');
    if (!select) return;

    // Verificar si el valor coincide con alguna opción del select
    const opciones = Array.from(select.options).map(o => o.value);

    if (valor.startsWith('Otros:') || valor.startsWith('otros:')) {
        // Es un valor "Otros" con detalle
        select.value = 'otros';
        const detalle = valor.substring(6).trim();
        const inputDetalle = document.getElementById('tipo_obstruccion_detalle');
        if (inputDetalle) inputDetalle.value = detalle;
        const grupoDetalle = document.getElementById('grupoIntimacionPorDetalle');
        if (grupoDetalle) grupoDetalle.style.display = '';
    } else if (opciones.includes(valor)) {
        // Valor directo del catálogo
        select.value = valor;
    } else {
        // Valor antiguo que no está en el catálogo → tratarlo como "Otros"
        select.value = 'otros';
        const inputDetalle = document.getElementById('tipo_obstruccion_detalle');
        if (inputDetalle) inputDetalle.value = valor;
        const grupoDetalle = document.getElementById('grupoIntimacionPorDetalle');
        if (grupoDetalle) grupoDetalle.style.display = '';
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

    // Cargar filtro tipo desde catálogo
    cargarSelectCatalogo('filterTipo', 'tipo_intimacion', null, { incluirVacio: true, textoVacio: 'Todos' });

    // Toggle columnas extra (Infracción + Acciones)
    document.getElementById('btnToggleCols').addEventListener('click', () => {
        const table = document.getElementById('intimacionesTable');
        table.classList.toggle('show-extra');
        document.getElementById('toggleIcon').textContent = table.classList.contains('show-extra') ? '−' : '＋';
    });

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

    document.getElementById('btnExportar').addEventListener('click', () => {
        const fmtFecha = (f) => {
            if (!f) return '-';
            const d = new Date(f);
            return d.toLocaleDateString('es-AR');
        };
        const fmtEstado = (e) => {
            if (!e) return '-';
            return e.charAt(0).toUpperCase() + e.slice(1).replace(/_/g, ' ');
        };
        exportarExcel(intimaciones, [
            { header: 'Fecha', key: (i) => fmtFecha(i.fecha) },
            { header: 'Tipo', key: 'tipo' },
            { header: 'Nombre y Apellido', key: 'nombre_apellido' },
            { header: 'DNI', key: 'dni' },
            { header: 'Dirección', key: 'direccion' },
            { header: 'Nº Intimación', key: 'numero_intimacion' },
            { header: 'Plazo (días)', key: 'plazo_dias' },
            { header: 'Fecha Vencimiento', key: (i) => fmtFecha(i.fecha_vencimiento) },
            { header: 'Estado', key: (i) => fmtEstado(i.estado) },
            { header: 'Infracción', key: (i) => i.infraccion_realizada ? 'Sí' : 'No' },
            { header: 'Nº Infracción', key: 'numero_infraccion' },
            { header: 'Observaciones', key: 'observaciones' }
        ], 'Intimaciones', 'Intimaciones');
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
            _setTipoObstruccionDesdeEdicion(original.tipo_obstruccion);
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
