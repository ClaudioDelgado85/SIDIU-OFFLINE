// public/js/tareas_diarias.js
// ============================================
// TAREAS DIARIAS — CRUD con Panel Lateral
// ============================================

let tareas = [];
let categorias = [];
let barrios = [];
const API_URL = '/api';

document.addEventListener('DOMContentLoaded', async () => {
    const today = new Date().toISOString().split('T')[0];
    const filterFecha = document.getElementById('filterFecha');
    filterFecha.value = today;

    await cargarFiltros();

    filterFecha.addEventListener('change', () => cargarTareas(filterFecha.value));
    document.getElementById('btnNuevo').addEventListener('click', abrirPanelNuevo);

    await cargarTareas(today);
});

// ── Cargar Catálogos y Barrios ──────────────
async function cargarFiltros() {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const [resCat, resBar] = await Promise.all([
            fetch(`${API_URL}/catalogos?categoria=tipo_tarea_diaria`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            }),
            fetch(`${API_URL}/barrios`, {
                headers: { 'Authorization': `Bearer ${sesion.token}` }
            })
        ]);

        const dataCat = await resCat.json();
        const dataBar = await resBar.json();

        if (dataCat.success) categorias = dataCat.data;
        if (dataBar.success) barrios = dataBar.data;
    } catch (error) {
        console.error('Error al cargar filtros:', error);
    }
}

// ── Cargar Tareas ───────────────────────────
async function cargarTareas(fecha) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    mostrarCargando(true);

    try {
        const res = await fetch(`${API_URL}/tareas-diarias?fecha=${fecha}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const data = await res.json();

        if (data.success) {
            tareas = data.data;
            renderizarTabla();
        } else {
            alert('Error al cargar tareas: ' + data.message);
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    } finally {
        mostrarCargando(false);
    }
}

// ── Renderizar Tabla ────────────────────────
function renderizarTabla() {
    const tbody = document.getElementById('tareasTableBody');
    const tabla = document.getElementById('tareasTable');
    const vacio = document.getElementById('emptyState');

    tbody.innerHTML = '';

    if (tareas.length === 0) {
        tabla.style.display = 'none';
        vacio.style.display = 'flex';
        return;
    }

    tabla.style.display = 'table';
    vacio.style.display = 'none';

    tareas.forEach(tarea => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><span class="celda-tag">${tarea.categoria_nombre || '-'}</span></td>
            <td><div class="celda-nombre">${tarea.titulo}</div></td>
            <td><div class="celda-tag" style="max-width:220px;" title="${tarea.descripcion}">${tarea.descripcion}</div></td>
            <td>${tarea.direccion || '<span class="celda-sub">—</span>'}</td>
            <td>${tarea.barrio_nombre || '<span class="celda-sub">—</span>'}</td>
            <td>
                <div class="action-buttons" style="display:flex; gap:4px;">
                    <button class="btn-icon btn-edit" onclick="editarTarea(${tarea.id})" title="Editar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    </button>
                    <button class="btn-icon btn-delete" onclick="eliminarTarea(${tarea.id})" title="Eliminar">
                        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function mostrarCargando(isLoading) {
    document.getElementById('loadingTable').style.display = isLoading ? 'flex' : 'none';
    if (isLoading) {
        document.getElementById('tareasTable').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
    }
}

// ============================================
// PANEL LATERAL (Crear/Editar)
// ============================================

function crearPanel() {
    let existing = document.getElementById('panelTarea');
    if (existing) existing.remove();

    const catOptions = categorias.map(c => `<option value="${c.id}">${c.label}</option>`).join('');
    const barOptions = barrios.map(b => `<option value="${b.id}">${b.nombre}</option>`).join('');

    // Overlay
    const overlay = document.createElement('div');
    overlay.className = 'panel-overlay';
    overlay.id = 'panelOverlay';
    overlay.addEventListener('click', cerrarPanel);

    // Panel
    const panel = document.createElement('div');
    panel.className = 'panel-lateral';
    panel.id = 'panelTarea';

    panel.innerHTML = `
        <form id="formTarea">
            <div class="panel-header">
                <h2 id="panelTitle">Nueva Tarea</h2>
                <button type="button" class="btn-close-panel" onclick="cerrarPanel()">✕</button>
            </div>
            <div class="panel-body">
                <input type="hidden" id="tareaId">

                <div class="form-grid">
                    <div class="form-group-modal">
                        <label>Fecha *</label>
                        <input type="date" id="tareaFecha" required>
                    </div>
                    <div class="form-group-modal">
                        <label>Categoría *</label>
                        <select id="tareaCat" required>
                            <option value="">Seleccione...</option>
                            ${catOptions}
                        </select>
                    </div>
                </div>

                <div class="form-grid" style="margin-top: 16px;">
                    <div class="form-group-modal">
                        <label>Barrio</label>
                        <select id="tareaBarrio">
                            <option value="">Seleccione...</option>
                            ${barOptions}
                        </select>
                    </div>
                    <div class="form-group-modal">
                        <label>Dirección / Ubicación</label>
                        <input type="text" id="tareaDireccion" maxlength="250" placeholder="Ej: Av. San Martín 1200">
                    </div>
                </div>

                <div class="form-group-modal form-grid-full" style="margin-top: 16px;">
                    <label>Título / Breve resumen *</label>
                    <input type="text" id="tareaTitulo" required maxlength="250" placeholder="¿Qué se hizo?">
                </div>

                <div class="form-group-modal form-grid-full" style="margin-top: 16px;">
                    <label>Descripción detallada *</label>
                    <textarea id="tareaDesc" rows="5" required placeholder="Describa la actividad realizada..."></textarea>
                </div>
            </div>
            <div class="panel-footer">
                <button type="button" class="btn-text" onclick="cerrarPanel()">Cancelar</button>
                <button type="submit" class="btn-primary" id="btnGuardar">Guardar</button>
            </div>
        </form>
    `;

    document.body.appendChild(overlay);
    document.body.appendChild(panel);

    document.getElementById('formTarea').addEventListener('submit', guardarTarea);
}

function abrirPanelNuevo() {
    crearPanel();
    document.getElementById('panelTitle').textContent = 'Nueva Tarea Diaria';
    document.getElementById('tareaFecha').value = document.getElementById('filterFecha').value;
}

function editarTarea(id) {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;

    crearPanel();
    document.getElementById('panelTitle').textContent = 'Editar Tarea';

    document.getElementById('tareaId').value = tarea.id;
    document.getElementById('tareaFecha').value = new Date(tarea.fecha).toISOString().split('T')[0];
    document.getElementById('tareaCat').value = tarea.categoria_id;
    document.getElementById('tareaBarrio').value = tarea.barrio_id || '';
    document.getElementById('tareaTitulo').value = tarea.titulo;
    document.getElementById('tareaDireccion').value = tarea.direccion || '';
    document.getElementById('tareaDesc').value = tarea.descripcion;
}

function cerrarPanel() {
    const panel = document.getElementById('panelTarea');
    const overlay = document.getElementById('panelOverlay');

    if (panel) {
        panel.classList.add('cerrando');
        setTimeout(() => { panel.remove(); }, 200);
    }
    if (overlay) overlay.remove();
}

// ── Guardar (Crear / Editar) ────────────────
async function guardarTarea(e) {
    e.preventDefault();
    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = 'Guardando...';

    const sesion = verificarAutenticacion();
    if (!sesion) return;

    const id = document.getElementById('tareaId').value;
    const isEdit = !!id;

    const body = {
        fecha: document.getElementById('tareaFecha').value,
        categoria_id: document.getElementById('tareaCat').value,
        barrio_id: document.getElementById('tareaBarrio').value || null,
        titulo: document.getElementById('tareaTitulo').value,
        direccion: document.getElementById('tareaDireccion').value,
        descripcion: document.getElementById('tareaDesc').value
    };

    try {
        const url = isEdit ? `${API_URL}/tareas-diarias/${id}` : `${API_URL}/tareas-diarias`;
        const method = isEdit ? 'PUT' : 'POST';

        const req = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sesion.token}`
            },
            body: JSON.stringify(body)
        });

        const res = await req.json();

        if (res.success) {
            cerrarPanel();
            const filtroActual = document.getElementById('filterFecha').value;
            if (body.fecha !== filtroActual) {
                document.getElementById('filterFecha').value = body.fecha;
            }
            await cargarTareas(body.fecha);
        } else {
            alert('Error: ' + res.message);
        }
    } catch (err) {
        console.error(err);
        alert('Error al guardar');
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = 'Guardar';
    }
}

// ── Eliminar ────────────────────────────────
async function eliminarTarea(id) {
    if (!confirm('¿Estás seguro de eliminar esta tarea?')) return;

    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const req = await fetch(`${API_URL}/tareas-diarias/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const res = await req.json();

        if (res.success) {
            cargarTareas(document.getElementById('filterFecha').value);
        } else {
            alert('Error: ' + res.message);
        }
    } catch (err) {
        console.error(err);
        alert('Error de conexión');
    }
}

// ── Autenticación ───────────────────────────
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
