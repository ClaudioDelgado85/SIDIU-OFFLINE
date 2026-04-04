// ============================================
// CATÁLOGOS — Página de administración
// ============================================

const API_URL = '/api';
let categoriaActual = null;
let opcionEditando = null;

// Mapa de nombres legibles para las categorías
const CATEGORIAS_LABELS = {
    'tipo_intimacion': '📋 Tipo Intimación',
    'intimacion_por': '📌 Intimación Por',
    'motivo_expediente': '📁 Motivo Expediente',
    'tipo_tarea_diaria': '📝 Tipo Tarea Diaria',
    'barrios': '🏘️ Barrios'
};

// ============================================
// AUTENTICACIÓN
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
// CARGAR CATEGORÍAS (TABS)
// ============================================

async function cargarCategorias() {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const response = await fetch(`${API_URL}/catalogos/categorias`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const result = await response.json();

        const tabsContainer = document.getElementById('catTabs');
        tabsContainer.innerHTML = '';

        if (result.success && result.data.length > 0) {
            result.data.forEach(cat => {
                const btn = document.createElement('button');
                btn.className = 'cat-tab';
                btn.dataset.categoria = cat.categoria;
                btn.innerHTML = `${CATEGORIAS_LABELS[cat.categoria] || cat.categoria} <span class="tab-count">${cat.activos}</span>`;
                btn.addEventListener('click', () => seleccionarCategoria(cat.categoria));
                tabsContainer.appendChild(btn);
            });
        }

        // Tab de Barrios (usa API separada)
        const btnBarrios = document.createElement('button');
        btnBarrios.className = 'cat-tab';
        btnBarrios.dataset.categoria = 'barrios';
        btnBarrios.innerHTML = `${CATEGORIAS_LABELS['barrios']} <span class="tab-count">…</span>`;
        btnBarrios.addEventListener('click', () => seleccionarCategoria('barrios'));
        tabsContainer.appendChild(btnBarrios);

        // Cargar conteo de barrios
        try {
            const respBarrios = await fetch(`${API_URL}/barrios`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const dataBarrios = await respBarrios.json();
            if (dataBarrios.success) {
                btnBarrios.querySelector('.tab-count').textContent = dataBarrios.data.length;
            }
        } catch (e) { /* ok */ }

        // Seleccionar primera categoría por defecto
        if (result.data.length > 0) {
            seleccionarCategoria(result.data[0].categoria);
        }

    } catch (error) {
        console.error('Error cargando categorías:', error);
    }
}

// ============================================
// SELECCIONAR CATEGORÍA
// ============================================

function seleccionarCategoria(categoria) {
    categoriaActual = categoria;

    // Actualizar tabs activos
    document.querySelectorAll('.cat-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.categoria === categoria);
    });

    // Actualizar título
    document.getElementById('catTitle').textContent = CATEGORIAS_LABELS[categoria] || categoria;

    // Mostrar botón nueva opción
    document.getElementById('btnNuevaOpcion').style.display = '';

    // Cargar opciones
    if (categoria === 'barrios') {
        cargarBarrios();
    } else {
        cargarOpciones(categoria);
    }
}

// ============================================
// CARGAR OPCIONES DE CATÁLOGO
// ============================================

async function cargarOpciones(categoria) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    document.getElementById('loadingCat').style.display = '';
    document.getElementById('catTable').style.display = 'none';
    document.getElementById('emptyCat').style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/catalogos/admin/${categoria}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const result = await response.json();

        document.getElementById('loadingCat').style.display = 'none';

        if (!result.success || result.data.length === 0) {
            document.getElementById('emptyCat').style.display = '';
            return;
        }

        const tbody = document.getElementById('catTableBody');
        tbody.innerHTML = '';
        document.getElementById('catTable').style.display = 'table';

        result.data.forEach(item => {
            const tr = document.createElement('tr');
            tr.style.opacity = item.activo ? '1' : '0.5';
            tr.innerHTML = `
                <td>${item.orden}</td>
                <td><span class="valor-interno">${item.valor}</span></td>
                <td>${item.label}</td>
                <td>
                    <span class="${item.activo ? 'estado-activo' : 'estado-inactivo'}">
                        ${item.activo ? '● Activo' : '○ Inactivo'}
                    </span>
                </td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" data-id="${item.id}" data-label="${item.label}" data-orden="${item.orden}" title="Editar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                        </button>
                        ${item.activo ? `
                        <button class="btn-icon btn-delete" data-id="${item.id}" title="Desactivar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                        ` : `
                        <button class="btn-icon btn-reactivar" data-id="${item.id}" title="Reactivar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none">
                                <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                        `}
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        document.getElementById('loadingCat').style.display = 'none';
        console.error('Error cargando opciones:', error);
    }
}

// ============================================
// CARGAR BARRIOS (API separada)
// ============================================

async function cargarBarrios() {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    document.getElementById('loadingCat').style.display = '';
    document.getElementById('catTable').style.display = 'none';
    document.getElementById('emptyCat').style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/barrios`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const result = await response.json();

        document.getElementById('loadingCat').style.display = 'none';

        if (!result.success || result.data.length === 0) {
            document.getElementById('emptyCat').style.display = '';
            return;
        }

        const tbody = document.getElementById('catTableBody');
        tbody.innerHTML = '';
        document.getElementById('catTable').style.display = 'table';

        result.data.forEach((barrio, i) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${i + 1}</td>
                <td><span class="valor-interno">${barrio.id}</span></td>
                <td>${barrio.nombre}</td>
                <td><span class="estado-activo">● Activo</span></td>
                <td>
                    <div class="action-buttons">
                        <button class="btn-icon btn-edit" data-id="${barrio.id}" data-label="${barrio.nombre}" data-orden="${i + 1}" title="Editar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none">
                                <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z"/>
                            </svg>
                        </button>
                        <button class="btn-icon btn-delete" data-id="${barrio.id}" title="Eliminar">
                            <svg width="16" height="16" fill="currentColor" viewBox="0 0 20 20" style="pointer-events:none">
                                <path fill-rule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"/>
                            </svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });

    } catch (error) {
        document.getElementById('loadingCat').style.display = 'none';
        console.error('Error cargando barrios:', error);
    }
}

// ============================================
// MODAL: CREAR / EDITAR
// ============================================

function abrirModalOpcion(editData = null) {
    opcionEditando = editData;

    const esBarrio = categoriaActual === 'barrios';
    const titulo = editData ? 'Editar opción' : 'Nueva opción';

    const modalHTML = `
        <div class="cat-modal-overlay" id="catModalOverlay">
            <div class="cat-modal">
                <div class="cat-modal-header">
                    <h3>${titulo}</h3>
                    <button class="btn-close" id="btnCerrarCatModal">×</button>
                </div>
                <form id="formOpcion">
                    <div class="cat-modal-body">
                        <div class="form-group">
                            <label>Etiqueta (texto visible) *</label>
                            <input type="text" id="opcionLabel" required placeholder="Ej: Habilitación" value="${editData ? editData.label : ''}">
                        </div>
                        ${!editData && !esBarrio ? `
                        <div class="form-group">
                            <label>Valor interno (slug)</label>
                            <input type="text" id="opcionValor" placeholder="Se genera automáticamente">
                            <small style="color: #64748b;">Dejar vacío para autogenerar desde la etiqueta</small>
                        </div>
                        ` : ''}
                        ${!esBarrio ? `
                        <div class="form-group">
                            <label>Orden</label>
                            <input type="number" id="opcionOrden" min="0" value="${editData ? editData.orden : 0}" placeholder="0">
                        </div>
                        ` : ''}
                    </div>
                    <div class="cat-modal-footer">
                        <button type="button" class="btn-text" id="btnCancelarCatModal">Cancelar</button>
                        <button type="submit" class="btn-primary">${editData ? 'Guardar' : 'Crear'}</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHTML);

    document.getElementById('btnCerrarCatModal').addEventListener('click', cerrarModalOpcion);
    document.getElementById('btnCancelarCatModal').addEventListener('click', cerrarModalOpcion);
    document.getElementById('formOpcion').addEventListener('submit', guardarOpcion);
    document.getElementById('catModalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'catModalOverlay') cerrarModalOpcion();
    });
}

function cerrarModalOpcion() {
    const modal = document.getElementById('catModalOverlay');
    if (modal) modal.remove();
    opcionEditando = null;
}

async function guardarOpcion(e) {
    e.preventDefault();
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    const esBarrio = categoriaActual === 'barrios';
    const label = document.getElementById('opcionLabel').value.trim();

    try {
        if (esBarrio) {
            // Usar API de barrios
            const url = opcionEditando
                ? `${API_URL}/barrios/${opcionEditando.id}`
                : `${API_URL}/barrios`;
            const method = opcionEditando ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                },
                body: JSON.stringify({ nombre: label })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

        } else if (opcionEditando) {
            // Editar opción de catálogo
            const orden = document.getElementById('opcionOrden')?.value || 0;
            const response = await fetch(`${API_URL}/catalogos/${opcionEditando.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                },
                body: JSON.stringify({ label, orden: parseInt(orden) })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);

        } else {
            // Crear opción de catálogo
            const valor = document.getElementById('opcionValor')?.value.trim() || label;
            const orden = document.getElementById('opcionOrden')?.value || 0;

            const response = await fetch(`${API_URL}/catalogos`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${sesion.token}`
                },
                body: JSON.stringify({
                    categoria: categoriaActual,
                    valor,
                    label,
                    orden: parseInt(orden)
                })
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
        }

        cerrarModalOpcion();
        seleccionarCategoria(categoriaActual);
        alert(opcionEditando ? 'Opción actualizada' : 'Opción creada');

    } catch (error) {
        console.error('Error guardando:', error);
        alert(error.message || 'Error al guardar');
    }
}

// ============================================
// ACCIONES: DESACTIVAR / REACTIVAR / ELIMINAR
// ============================================

async function desactivarOpcion(id) {
    if (!confirm('¿Desactivar esta opción?')) return;

    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        if (categoriaActual === 'barrios') {
            const response = await fetch(`${API_URL}/barrios/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
        } else {
            const response = await fetch(`${API_URL}/catalogos/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            });
            const result = await response.json();
            if (!result.success) throw new Error(result.message);
        }

        seleccionarCategoria(categoriaActual);
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al desactivar');
    }
}

async function reactivarOpcion(id) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const response = await fetch(`${API_URL}/catalogos/${id}/reactivar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const result = await response.json();
        if (!result.success) throw new Error(result.message);

        seleccionarCategoria(categoriaActual);
    } catch (error) {
        console.error('Error:', error);
        alert(error.message || 'Error al reactivar');
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    document.getElementById('userName').textContent = sesion.usuario.nombre_completo;

    // Cargar categorías
    cargarCategorias();

    // Botón nueva opción
    document.getElementById('btnNuevaOpcion').addEventListener('click', () => {
        if (!categoriaActual) return;
        abrirModalOpcion(null);
    });

    // Logout
    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.removeItem('token');
        localStorage.removeItem('usuario');
        window.location.href = '/login.html';
    });

    // Delegación en tabla
    document.getElementById('catTableBody').addEventListener('click', (e) => {
        const btnEdit = e.target.closest('.btn-edit');
        const btnDelete = e.target.closest('.btn-delete');
        const btnReactivar = e.target.closest('.btn-reactivar');

        if (btnEdit) {
            const id = parseInt(btnEdit.dataset.id);
            const label = btnEdit.dataset.label;
            const orden = parseInt(btnEdit.dataset.orden || 0);
            abrirModalOpcion({ id, label, orden });
        }

        if (btnDelete) {
            const id = parseInt(btnDelete.dataset.id);
            desactivarOpcion(id);
        }

        if (btnReactivar) {
            const id = parseInt(btnReactivar.dataset.id);
            reactivarOpcion(id);
        }
    });
});
