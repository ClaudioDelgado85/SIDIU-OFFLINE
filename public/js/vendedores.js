// vendedores.js — Grilla editable tipo planilla para relevamientos de vendedores ambulantes
(function () {
    'use strict';

    const API_URL = '/api/vendedores';
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
        cargarVendedores();
        cargarEstadisticas();
        inicializarEventos();
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
                if (e.key === 'Enter') cargarVendedores();
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
    // ESTADÍSTICAS
    // ==========================================
    async function cargarEstadisticas() {
        try {
            const resp = await fetch(`${API_URL}/estadisticas`, { headers });
            const data = await resp.json();
            if (data.success) {
                const s = data.data;
                const el = (id) => document.getElementById(id);
                if (el('statTotal')) el('statTotal').textContent = s.total || 0;
                if (el('statAutorizados')) el('statAutorizados').textContent = s.autorizados || 0;
                if (el('statNoAutorizados')) el('statNoAutorizados').textContent = s.no_autorizados || 0;
                if (el('statPagaronCanon')) el('statPagaronCanon').textContent = s.pagaron_canon || 0;
                if (el('statCanonVencido')) el('statCanonVencido').textContent = s.canon_vencido || 0;
            }
        } catch (e) { console.error('Error estadísticas:', e); }
    }

    // ==========================================
    // CARGAR VENDEDORES
    // ==========================================
    window.cargarVendedores = async function () {
        try {
            const params = new URLSearchParams();
            const busqueda = document.getElementById('filtro-busqueda').value;
            const autorizacion = document.getElementById('filtro-autorizacion');
            const canon = document.getElementById('filtro-canon');
            const barrio = document.getElementById('filtro-barrio');
            const desde = document.getElementById('filtro-desde');
            const hasta = document.getElementById('filtro-hasta');

            if (autorizacion && autorizacion.value !== '') params.append('tiene_autorizacion', autorizacion.value);
            if (canon && canon.value !== '') params.append('pago_canon', canon.value);
            if (barrio && barrio.value) params.append('barrio_id', barrio.value);
            if (desde && desde.value) params.append('fecha_desde', desde.value);
            if (hasta && hasta.value) params.append('fecha_hasta', hasta.value);
            params.append('limit', '200');

            const resp = await fetch(`${API_URL}?${params}`, { headers });
            const data = await resp.json();

            if (data.success) {
                let registros = data.data;
                if (busqueda) {
                    const q = busqueda.toLowerCase();
                    registros = registros.filter(r =>
                        (r.nombre_vendedor || '').toLowerCase().includes(q) ||
                        (r.dni_vendedor || '').toLowerCase().includes(q) ||
                        (r.ubicacion || '').toLowerCase().includes(q) ||
                        (r.rubro || '').toLowerCase().includes(q)
                    );
                }
                renderizarTabla(registros);
            }
        } catch (e) { console.error('Error cargando vendedores:', e); }
    };

    window.limpiarFiltros = function () {
        document.getElementById('filtro-busqueda').value = '';
        const autorizacion = document.getElementById('filtro-autorizacion');
        const canon = document.getElementById('filtro-canon');
        const barrio = document.getElementById('filtro-barrio');
        const desde = document.getElementById('filtro-desde');
        const hasta = document.getElementById('filtro-hasta');
        if (autorizacion) autorizacion.value = '';
        if (canon) canon.value = '';
        if (barrio) barrio.value = '';
        if (desde) desde.value = '';
        if (hasta) hasta.value = '';
        cargarVendedores();
    };

    // ==========================================
    // RENDERIZAR TABLA
    // ==========================================
    function renderizarTabla(registros) {
        const tbody = document.getElementById('tabla-body');
        let html = '';
        registros.forEach(r => { html += crearFilaExistente(r); });
        html += crearFilaNueva();
        tbody.innerHTML = html;
        activarEventosFilas();
    }

    function crearFilaExistente(r) {
        const fechaVal = r.fecha_relevamiento ? r.fecha_relevamiento.split('T')[0] : '';
        const vencVal = r.fecha_vencimiento_canon ? r.fecha_vencimiento_canon.split('T')[0] : '';
        return `
        <tr data-id="${r.id}">
            <td><input type="date" class="celda-input" data-field="fecha_relevamiento" value="${fechaVal}"></td>
            <td><input type="text" class="celda-input" data-field="nombre_vendedor" value="${esc(r.nombre_vendedor)}" placeholder="Nombre"></td>
            <td><input type="text" class="celda-input" data-field="dni_vendedor" value="${esc(r.dni_vendedor)}" placeholder="DNI"></td>
            <td><input type="text" class="celda-input" data-field="ubicacion" value="${esc(r.ubicacion)}" placeholder="Ubicación"></td>
            <td><input type="text" class="celda-input" data-field="rubro" value="${esc(r.rubro)}" placeholder="Rubro"></td>
            <td><div class="celda-check"><input type="checkbox" data-field="tiene_autorizacion" ${r.tiene_autorizacion ? 'checked' : ''} title="Autorizado"></div></td>
            <td><div class="celda-check"><input type="checkbox" data-field="pago_canon" ${r.pago_canon ? 'checked' : ''} title="Pagó canon"></div></td>
            <td><input type="text" class="celda-input" data-field="numero_recibo" value="${esc(r.numero_recibo)}" placeholder="Recibo" ${!r.pago_canon ? 'disabled style="opacity:0.3"' : ''}></td>
            <td><input type="date" class="celda-input" data-field="fecha_vencimiento_canon" value="${vencVal}" ${!r.pago_canon ? 'disabled style="opacity:0.3"' : ''}></td>
            <td><select class="celda-select" data-field="barrio_id">${opcionesBarrios(r.barrio_id)}</select></td>
            <td><input type="text" class="celda-input" data-field="observaciones" value="${esc(r.observaciones)}" placeholder="Obs."></td>
            <td><div class="celda-acciones">
                <button class="btn-planilla btn-eliminar" onclick="eliminarVendedor(${r.id})" title="Eliminar">
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
            <td><input type="text" class="celda-input" data-field="nombre_vendedor" placeholder="Nombre del vendedor"></td>
            <td><input type="text" class="celda-input" data-field="dni_vendedor" placeholder="DNI"></td>
            <td><input type="text" class="celda-input" data-field="ubicacion" placeholder="Ubicación"></td>
            <td><input type="text" class="celda-input" data-field="rubro" placeholder="Rubro"></td>
            <td><div class="celda-check"><input type="checkbox" data-field="tiene_autorizacion" title="Autorizado"></div></td>
            <td><div class="celda-check"><input type="checkbox" data-field="pago_canon" title="Pagó canon"></div></td>
            <td><input type="text" class="celda-input" data-field="numero_recibo" placeholder="Nº recibo" disabled style="opacity:0.3"></td>
            <td><input type="date" class="celda-input" data-field="fecha_vencimiento_canon" disabled style="opacity:0.3"></td>
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
                guardarFilaExistente(this.closest('tr'));
            });
        });

        // Checkbox change en filas existentes
        tbody.querySelectorAll('tr[data-id]:not(.fila-nueva) input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', function () {
                const fila = this.closest('tr');
                if (this.dataset.field === 'pago_canon') {
                    const reciboInput = fila.querySelector('[data-field="numero_recibo"]');
                    const vencInput = fila.querySelector('[data-field="fecha_vencimiento_canon"]');
                    reciboInput.disabled = !this.checked;
                    reciboInput.style.opacity = this.checked ? '1' : '0.3';
                    vencInput.disabled = !this.checked;
                    vencInput.style.opacity = this.checked ? '1' : '0.3';
                    if (!this.checked) { reciboInput.value = ''; vencInput.value = ''; }
                }
                guardarFilaExistente(fila);
            });
        });

        // Fila nueva — checkbox canon toggle
        const filaNueva = tbody.querySelector('.fila-nueva');
        if (filaNueva) {
            const cbCanon = filaNueva.querySelector('[data-field="pago_canon"]');
            if (cbCanon) {
                cbCanon.addEventListener('change', function () {
                    const reciboInput = filaNueva.querySelector('[data-field="numero_recibo"]');
                    const vencInput = filaNueva.querySelector('[data-field="fecha_vencimiento_canon"]');
                    reciboInput.disabled = !this.checked;
                    reciboInput.style.opacity = this.checked ? '1' : '0.3';
                    vencInput.disabled = !this.checked;
                    vencInput.style.opacity = this.checked ? '1' : '0.3';
                });
            }

            // Enter → guardar fila nueva
            filaNueva.querySelectorAll('.celda-input, .celda-select').forEach(input => {
                input.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter') {
                        e.preventDefault();
                        guardarFilaNueva(filaNueva);
                    }
                });
            });

            // Auto-guardar al salir de la fila
            const ultimoInput = filaNueva.querySelector('[data-field="observaciones"]');
            if (ultimoInput) {
                ultimoInput.addEventListener('blur', function () {
                    const ubi = filaNueva.querySelector('[data-field="ubicacion"]').value.trim();
                    if (ubi) {
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
                const resp = await fetch(`${API_URL}/${id}`, { method: 'PUT', headers, body: JSON.stringify(datos) });
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
        }, 500);
    }

    // ==========================================
    // GUARDAR FILA NUEVA (POST)
    // ==========================================
    async function guardarFilaNueva(fila) {
        const datos = extraerDatosFila(fila);
        if (!datos.ubicacion) return;
        try {
            fila.classList.add('fila-guardando');
            const resp = await fetch(API_URL, { method: 'POST', headers, body: JSON.stringify(datos) });
            const data = await resp.json();
            fila.classList.remove('fila-guardando');
            if (data.success) {
                cargarVendedores();
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
    window.eliminarVendedor = async function (id) {
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
                    setTimeout(() => { fila.remove(); cargarEstadisticas(); }, 300);
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
            nombre_vendedor: val('nombre_vendedor'),
            dni_vendedor: val('dni_vendedor'),
            ubicacion: val('ubicacion'),
            rubro: val('rubro'),
            tiene_autorizacion: val('tiene_autorizacion'),
            pago_canon: val('pago_canon'),
            numero_recibo: val('numero_recibo'),
            fecha_vencimiento_canon: val('fecha_vencimiento_canon'),
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
