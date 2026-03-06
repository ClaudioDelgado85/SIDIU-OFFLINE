// comercios.js — Grilla editable tipo planilla para relevamientos de comercios
(function () {
    'use strict';

    const API_URL = '/api/comercios';
    const token = localStorage.getItem('token');
    let barrios = [];

    if (!token) { window.location.href = 'index.html'; return; }

    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` };

    // ==========================================
    // INICIALIZACIÓN
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
        cargarUsuario();
        cargarBarrios();
        cargarComercios();
        cargarEstadisticas();
        inicializarEventos();

        document.getElementById('btnExportar').addEventListener('click', async () => {
            try {
                const params = new URLSearchParams();
                params.append('limit', '9999');
                const resp = await fetch(`${API_URL}?${params}`, { headers });
                const data = await resp.json();
                if (data.success && data.data.length > 0) {
                    exportarExcel(data.data, [
                        { header: 'Fecha', key: (r) => r.fecha_relevamiento ? r.fecha_relevamiento.split('T')[0] : '' },
                        { header: 'Propietario', key: 'nombre_propietario' },
                        { header: 'DNI', key: 'dni_propietario' },
                        { header: 'Dirección Comercial', key: 'direccion_comercial' },
                        { header: 'Rubro', key: 'rubro' },
                        { header: 'Habilitado', key: (r) => r.esta_habilitado ? 'Sí' : 'No' },
                        { header: 'Nº Resolución', key: 'numero_resolucion' },
                        { header: 'Reempadronar', key: (r) => r.necesita_reempadronamiento ? 'Sí' : 'No' },
                        { header: 'Observaciones', key: 'observaciones' }
                    ], 'Comercios', 'Comercios');
                } else {
                    alert('No hay datos para exportar.');
                }
            } catch (e) {
                console.error('Error exportando:', e);
                alert('Error al exportar.');
            }
        });
    });

    function cargarUsuario() {
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            document.getElementById('userName').textContent = payload.usuario || payload.nombre || 'Usuario';
        } catch (e) {
            document.getElementById('userName').textContent = 'Usuario';
        }
        document.getElementById('btnLogout').addEventListener('click', () => {
            localStorage.removeItem('token');
            window.location.href = 'index.html';
        });
    }

    function inicializarEventos() {
        // Toggle panel de filtros
        const btnFiltros = document.getElementById('btnFiltros');
        const filtersPanel = document.getElementById('filtersPanel');
        if (btnFiltros && filtersPanel) {
            btnFiltros.addEventListener('click', () => {
                filtersPanel.style.display = filtersPanel.style.display === 'none' ? 'block' : 'none';
            });
        }

        // Búsqueda con Enter
        const busquedaInput = document.getElementById('filtro-busqueda');
        if (busquedaInput) {
            busquedaInput.addEventListener('keyup', (e) => {
                if (e.key === 'Enter') cargarComercios();
            });
        }
    }

    async function cargarBarrios() {
        try {
            const resp = await fetch('/api/barrios', { headers });
            const data = await resp.json();
            if (data.success) {
                barrios = data.data;
                const select = document.getElementById('filtro-barrio');
                barrios.forEach(b => {
                    const opt = document.createElement('option');
                    opt.value = b.id;
                    opt.textContent = b.nombre;
                    select.appendChild(opt);
                });
            }
        } catch (e) { console.error('Error cargando barrios:', e); }
    }

    // ==========================================
    // CARGAR ESTADÍSTICAS
    // ==========================================
    async function cargarEstadisticas() {
        try {
            const resp = await fetch(`${API_URL}/estadisticas`, { headers });
            const data = await resp.json();
            if (data.success) {
                const s = data.data;
                const el = (id) => document.getElementById(id);
                if (el('statTotal')) el('statTotal').textContent = s.total || 0;
                if (el('statHabilitados')) el('statHabilitados').textContent = s.habilitados || 0;
                if (el('statNoHabilitados')) el('statNoHabilitados').textContent = s.no_habilitados || 0;
                if (el('statReempadronamiento')) el('statReempadronamiento').textContent = s.necesitan_reempadronamiento || 0;
            }
        } catch (e) { console.error('Error estadísticas:', e); }
    }

    // ==========================================
    // CARGAR COMERCIOS
    // ==========================================
    window.cargarComercios = async function () {
        try {
            const params = new URLSearchParams();
            const busqueda = document.getElementById('filtro-busqueda').value;
            const habilitado = document.getElementById('filtro-habilitado');
            const barrio = document.getElementById('filtro-barrio');
            const desde = document.getElementById('filtro-desde');
            const hasta = document.getElementById('filtro-hasta');

            if (habilitado && habilitado.value !== '') params.append('esta_habilitado', habilitado.value);
            if (barrio && barrio.value) params.append('barrio_id', barrio.value);
            if (desde && desde.value) params.append('fecha_desde', desde.value);
            if (hasta && hasta.value) params.append('fecha_hasta', hasta.value);
            params.append('limit', '200');

            const resp = await fetch(`${API_URL}?${params}`, { headers });
            const data = await resp.json();

            if (data.success) {
                let registros = data.data;
                // Filtrado local por texto (nombre, dni, dirección)
                if (busqueda) {
                    const q = busqueda.toLowerCase();
                    registros = registros.filter(r =>
                        (r.nombre_propietario || '').toLowerCase().includes(q) ||
                        (r.dni_propietario || '').toLowerCase().includes(q) ||
                        (r.direccion_comercial || '').toLowerCase().includes(q) ||
                        (r.rubro || '').toLowerCase().includes(q)
                    );
                }
                renderizarTabla(registros);
            }
        } catch (e) { console.error('Error cargando comercios:', e); }
    };

    window.limpiarFiltros = function () {
        document.getElementById('filtro-busqueda').value = '';
        const habilitado = document.getElementById('filtro-habilitado');
        const barrio = document.getElementById('filtro-barrio');
        const desde = document.getElementById('filtro-desde');
        const hasta = document.getElementById('filtro-hasta');
        if (habilitado) habilitado.value = '';
        if (barrio) barrio.value = '';
        if (desde) desde.value = '';
        if (hasta) hasta.value = '';
        cargarComercios();
    };

    // ==========================================
    // RENDERIZAR TABLA
    // ==========================================
    function renderizarTabla(registros) {
        const tbody = document.getElementById('tabla-body');
        let html = '';

        // Filas existentes
        registros.forEach(r => {
            html += crearFilaExistente(r);
        });

        // Fila nueva (vacía)
        html += crearFilaNueva();

        tbody.innerHTML = html;

        // Activar eventos
        activarEventosFilas();
    }

    function crearFilaExistente(r) {
        const fechaVal = r.fecha_relevamiento ? r.fecha_relevamiento.split('T')[0] : '';
        return `
        <tr data-id="${r.id}">
            <td><input type="date" class="celda-input" data-field="fecha_relevamiento" value="${fechaVal}"></td>
            <td><input type="text" class="celda-input" data-field="nombre_propietario" value="${esc(r.nombre_propietario)}" placeholder="Nombre"></td>
            <td><input type="text" class="celda-input" data-field="dni_propietario" value="${esc(r.dni_propietario)}" placeholder="DNI"></td>
            <td><input type="text" class="celda-input" data-field="direccion_comercial" value="${esc(r.direccion_comercial)}" placeholder="Dirección"></td>
            <td><input type="text" class="celda-input" data-field="rubro" value="${esc(r.rubro)}" placeholder="Rubro"></td>
            <td><div class="celda-check"><input type="checkbox" data-field="esta_habilitado" ${r.esta_habilitado ? 'checked' : ''} title="Habilitado"></div></td>
            <td><input type="text" class="celda-input" data-field="numero_resolucion" value="${esc(r.numero_resolucion)}" placeholder="Resolución" ${!r.esta_habilitado ? 'disabled style="opacity:0.3"' : ''}></td>
            <td><div class="celda-check"><input type="checkbox" data-field="necesita_reempadronamiento" ${r.necesita_reempadronamiento ? 'checked' : ''} title="Reempadronamiento"></div></td>
            <td><select class="celda-select" data-field="barrio_id">${opcionesBarrios(r.barrio_id)}</select></td>
            <td><input type="text" class="celda-input" data-field="observaciones" value="${esc(r.observaciones)}" placeholder="Obs."></td>
            <td><div class="celda-acciones">
                <button class="btn-planilla btn-eliminar" onclick="eliminarComercio(${r.id})" title="Eliminar">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/></svg>
                </button>
            </div></td>
        </tr>`;
    }

    function crearFilaNueva() {
        const hoy = new Date().toISOString().split('T')[0];
        return `
        <tr class="fila-nueva" data-id="nuevo">
            <td><input type="date" class="celda-input" data-field="fecha_relevamiento" value="${hoy}"></td>
            <td><input type="text" class="celda-input" data-field="nombre_propietario" placeholder="Nombre del propietario"></td>
            <td><input type="text" class="celda-input" data-field="dni_propietario" placeholder="DNI"></td>
            <td><input type="text" class="celda-input" data-field="direccion_comercial" placeholder="Dirección comercial"></td>
            <td><input type="text" class="celda-input" data-field="rubro" placeholder="Rubro"></td>
            <td><div class="celda-check"><input type="checkbox" data-field="esta_habilitado" title="Habilitado"></div></td>
            <td><input type="text" class="celda-input" data-field="numero_resolucion" placeholder="Nº resolución" disabled style="opacity:0.3"></td>
            <td><div class="celda-check"><input type="checkbox" data-field="necesita_reempadronamiento" title="Reempadronamiento"></div></td>
            <td><select class="celda-select" data-field="barrio_id">${opcionesBarrios(null)}</select></td>
            <td><input type="text" class="celda-input" data-field="observaciones" placeholder="Observaciones"></td>
            <td></td>
        </tr>`;
    }

    // ==========================================
    // EVENTOS DE LA GRILLA
    // ==========================================
    function activarEventosFilas() {
        const tbody = document.getElementById('tabla-body');

        // Blur → guardar cambio en fila existente
        tbody.querySelectorAll('tr[data-id]:not(.fila-nueva) .celda-input, tr[data-id]:not(.fila-nueva) .celda-select').forEach(input => {
            input.addEventListener('blur', function () {
                const fila = this.closest('tr');
                guardarFilaExistente(fila);
            });
        });

        // Checkbox change → guardar y toggle condicional
        tbody.querySelectorAll('tr[data-id]:not(.fila-nueva) input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function () {
                const fila = this.closest('tr');
                // Toggle resolución si es habilitado
                if (this.dataset.field === 'esta_habilitado') {
                    const resInput = fila.querySelector('[data-field="numero_resolucion"]');
                    resInput.disabled = !this.checked;
                    resInput.style.opacity = this.checked ? '1' : '0.3';
                    if (!this.checked) resInput.value = '';
                }
                guardarFilaExistente(fila);
            });
        });

        // Fila nueva — checkbox habilitado toggle
        const filaNueva = tbody.querySelector('.fila-nueva');
        if (filaNueva) {
            const cbHab = filaNueva.querySelector('[data-field="esta_habilitado"]');
            if (cbHab) {
                cbHab.addEventListener('change', function () {
                    const resInput = filaNueva.querySelector('[data-field="numero_resolucion"]');
                    resInput.disabled = !this.checked;
                    resInput.style.opacity = this.checked ? '1' : '0.3';
                });
            }

            // Enter en la fila→ guardar nueva fila
            filaNueva.querySelectorAll('.celda-input, .celda-select').forEach(input => {
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        guardarFilaNueva(filaNueva);
                    }
                });
            });

            // Auto-guardar al salir de la fila con datos
            const ultimoInput = filaNueva.querySelector('[data-field="observaciones"]');
            if (ultimoInput) {
                ultimoInput.addEventListener('blur', function () {
                    const dir = filaNueva.querySelector('[data-field="direccion_comercial"]').value.trim();
                    if (dir) {
                        setTimeout(() => {
                            if (!filaNueva.contains(document.activeElement)) {
                                guardarFilaNueva(filaNueva);
                            }
                        }, 150);
                    }
                });
            }
        }
    }

    // ==========================================
    // GUARDAR FILA EXISTENTE (PUT)
    // ==========================================
    let saveTimeout = null;
    async function guardarFilaExistente(fila) {
        const id = fila.dataset.id;
        clearTimeout(saveTimeout);

        saveTimeout = setTimeout(async () => {
            const datos = extraerDatosFila(fila);
            try {
                fila.classList.add('fila-guardando');
                const resp = await fetch(`${API_URL}/${id}`, {
                    method: 'PUT',
                    headers,
                    body: JSON.stringify(datos)
                });
                const data = await resp.json();
                fila.classList.remove('fila-guardando');

                if (data.success) {
                    fila.classList.add('fila-guardada');
                    setTimeout(() => fila.classList.remove('fila-guardada'), 1500);
                    cargarEstadisticas();
                }
            } catch (e) {
                fila.classList.remove('fila-guardando');
                console.error('Error guardando:', e);
            }
        }, 500); // Debounce 500ms
    }

    // ==========================================
    // GUARDAR FILA NUEVA (POST)
    // ==========================================
    async function guardarFilaNueva(fila) {
        const datos = extraerDatosFila(fila);
        if (!datos.direccion_comercial) return; // Mínimo requerido

        try {
            fila.classList.add('fila-guardando');
            const resp = await fetch(API_URL, {
                method: 'POST',
                headers,
                body: JSON.stringify(datos)
            });
            const data = await resp.json();
            fila.classList.remove('fila-guardando');

            if (data.success) {
                cargarComercios();
                cargarEstadisticas();
            }
        } catch (e) {
            fila.classList.remove('fila-guardando');
            console.error('Error creando:', e);
        }
    }

    // ==========================================
    // ELIMINAR
    // ==========================================
    window.eliminarComercio = async function (id) {
        if (!confirm('¿Eliminar este registro?')) return;
        try {
            const resp = await fetch(`${API_URL}/${id}`, { method: 'DELETE', headers });
            const data = await resp.json();
            if (data.success) {
                const fila = document.querySelector(`tr[data-id="${id}"]`);
                if (fila) {
                    fila.style.transition = 'opacity 0.3s, transform 0.3s';
                    fila.style.opacity = '0';
                    fila.style.transform = 'translateX(20px)';
                    setTimeout(() => {
                        fila.remove();
                        cargarEstadisticas();
                    }, 300);
                }
            }
        } catch (e) { console.error('Error eliminando:', e); }
    };

    // ==========================================
    // UTILIDADES
    // ==========================================
    function extraerDatosFila(fila) {
        const val = (field) => {
            const el = fila.querySelector(`[data-field="${field}"]`);
            if (!el) return null;
            if (el.type === 'checkbox') return el.checked;
            return el.value.trim() || null;
        };

        return {
            fecha_relevamiento: val('fecha_relevamiento'),
            nombre_propietario: val('nombre_propietario'),
            dni_propietario: val('dni_propietario'),
            direccion_comercial: val('direccion_comercial'),
            rubro: val('rubro'),
            esta_habilitado: val('esta_habilitado'),
            numero_resolucion: val('numero_resolucion'),
            necesita_reempadronamiento: val('necesita_reempadronamiento'),
            barrio_id: val('barrio_id') || null,
            observaciones: val('observaciones')
        };
    }

    function opcionesBarrios(selectedId) {
        let html = '<option value="">—</option>';
        barrios.forEach(b => {
            html += `<option value="${b.id}" ${b.id == selectedId ? 'selected' : ''}>${b.nombre}</option>`;
        });
        return html;
    }

    function esc(val) {
        if (val === null || val === undefined) return '';
        return String(val).replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }

})();
