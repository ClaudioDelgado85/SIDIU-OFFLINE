// public/js/informe_diario.js
// ============================================
// INFORME DIARIO — Generación, Visualización y PDF
// ============================================

const API_URL = '/api';
let informeData = null;

document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInforme').value = today;

    document.getElementById('btnGenerar').addEventListener('click', () => {
        const fecha = document.getElementById('fechaInforme').value;
        if (!fecha) return alert('Seleccione una fecha');
        const destinatario = document.getElementById('destinatarioInforme').value;
        generarInforme(fecha, destinatario);
    });

    document.getElementById('btnDescargarPDF').addEventListener('click', descargarPDF);

    document.getElementById('btnExportar').addEventListener('click', () => {
        if (!informeData) return alert('Primero genere un informe.');
        exportarInformeExcel(informeData);
    });

    document.getElementById('btnWord').addEventListener('click', () => {
        if (!informeData) return alert('Primero genere un informe.');
        descargarWord();
    });

    // Checkbox listeners
    document.querySelectorAll('.check-modulo input').forEach(cb => {
        cb.addEventListener('change', aplicarFiltroModulos);
    });
});

// ── Exportar Informe a Excel (multi-hoja) ───
function exportarInformeExcel(data) {
    if (typeof XLSX === 'undefined') {
        alert('Error: la librería SheetJS no está cargada.');
        return;
    }

    const wb = XLSX.utils.book_new();
    const fecha = data.fecha || '';

    // Helper para agregar hoja
    const addSheet = (name, items, cols) => {
        if (!items || items.length === 0) return;
        const rows = items.map(item =>
            cols.reduce((obj, col) => {
                obj[col.header] = typeof col.key === 'function' ? col.key(item) : (item[col.key] ?? '');
                return obj;
            }, {})
        );
        const ws = XLSX.utils.json_to_sheet(rows);
        // Auto-ancho
        ws['!cols'] = cols.map(col => ({
            wch: Math.max(col.header.length, ...rows.map(r => String(r[col.header] || '').length).slice(0, 50)) + 2
        }));
        XLSX.utils.book_append_sheet(wb, ws, name);
    };

    addSheet('Tareas', data.tareas, [
        { header: 'Categoría', key: (t) => t.categoria_nombre || '-' },
        { header: 'Título', key: 'titulo' },
        { header: 'Descripción', key: 'descripcion' },
        { header: 'Ubicación', key: (t) => `${t.direccion || '-'} ${t.barrio_nombre ? `(${t.barrio_nombre})` : ''}`.trim() }
    ]);

    addSheet('Expedientes', data.expedientes, [
        { header: 'Número', key: 'numero_expediente' },
        { header: 'Contribuyente', key: 'nombre_apellido' },
        { header: 'DNI', key: 'dni' },
        { header: 'Motivo', key: 'motivo' },
        { header: 'Estado', key: (e) => formatearEstado(e.estado) }
    ]);

    addSheet('Intimaciones', data.intimaciones, [
        { header: 'Nº Intimación', key: 'numero_intimacion' },
        { header: 'Contribuyente', key: 'nombre_apellido' },
        { header: 'Dirección', key: 'direccion' },
        { header: 'Tipo', key: (i) => i.tipo === 'general' ? (i.tipo_obstruccion || 'General') : (i.tipo === 'baldio' ? 'Terreno Baldío' : 'Vehículo') },
        { header: 'Plazo', key: (i) => i.plazo_dias > 0 ? `${i.plazo_dias} días` : 'Inmediato' }
    ]);

    addSheet('Infracciones', data.infracciones, [
        { header: 'Acta', key: 'numero_acta' },
        { header: 'Infractor', key: 'nombre_apellido' },
        { header: 'Dirección', key: 'direccion' },
        { header: 'Motivo', key: 'motivo_infraccion' }
    ]);

    addSheet('Reclamos', data.reclamos, [
        { header: 'Reclamo', key: 'numero_reclamo' },
        { header: 'Tipo', key: 'tipo_reclamo' },
        { header: 'Lugar', key: 'direccion_incidente' },
        { header: 'Descripción', key: 'descripcion' }
    ]);

    addSheet('Relevamientos', data.relevamientos, [
        { header: 'Número', key: 'numero_relevamiento' },
        { header: 'Ubicación', key: 'ubicacion' },
        { header: 'Tipo', key: 'tipo_relevamiento' },
        { header: 'Responsable', key: (r) => r.responsable_nombre || 'No identificado' }
    ]);

    addSheet('Comercios', data.comercios, [
        { header: 'Propietario', key: (c) => c.nombre_propietario || '-' },
        { header: 'Dirección', key: 'direccion_comercial' },
        { header: 'Rubro', key: (c) => c.rubro || '-' },
        { header: 'Habilitado', key: (c) => c.esta_habilitado ? 'Sí' : 'No' }
    ]);

    addSheet('Vendedores', data.vendedores, [
        { header: 'Vendedor', key: (v) => v.nombre_vendedor || '-' },
        { header: 'Ubicación', key: 'ubicacion' },
        { header: 'Rubro', key: (v) => v.rubro || '-' },
        { header: 'Autorizado', key: (v) => v.tiene_autorizacion ? 'Sí' : 'No' }
    ]);

    if (wb.SheetNames.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    const [y, m, d] = fecha.split('-');
    const nombreArchivo = `Informe_Diario_${d}-${m}-${y}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
}

// ── Descargar Word ───────────────────────────
async function descargarWord() {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    const btn = document.getElementById('btnWord');
    btn.disabled = true;
    btn.textContent = 'Generando Word...';

    try {
        const fecha = document.getElementById('fechaInforme').value;
        const [y, m, d] = fecha.split('-');
        const res = await fetch(`${API_URL}/informes/diario/docx?fecha=${fecha}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || 'Error al generar Word');
        }

        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Informe_Diario_${d}-${m}-${y}.docx`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (err) {
        console.error('Error Word:', err);
        alert(err.message);
    } finally {
        btn.disabled = false;
        btn.innerHTML = `<svg width="18" height="18" fill="currentColor" viewBox="0 0 24 24"><path d="M6 4v16h12V4H6zm2 3h8v2H8V7zm0 4h8v2H8v-2zm0 4h5v2H8v-2zm10 7H6c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h8l6 6v14c0 1.1-.9 2-2 2z"/></svg> Word`;
    }
}

// ── Generar Informe ─────────────────────────
async function generarInforme(fecha, destinatario) {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    const statusDiv = document.getElementById('informeStatus');
    const renderDiv = document.getElementById('informeRender');
    const btnPDF = document.getElementById('btnDescargarPDF');
    const btnGenerar = document.getElementById('btnGenerar');

    btnGenerar.disabled = true;
    btnGenerar.textContent = 'Generando...';
    btnPDF.disabled = true;

    statusDiv.style.display = 'flex';
    renderDiv.style.display = 'none';
    statusDiv.innerHTML = '<div class="loader" style="margin:0 auto 16px;"></div><p>Recopilando información del día...</p>';

    try {
        const res = await fetch(`${API_URL}/informes/diario?fecha=${fecha}`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const data = await res.json();

        if (data.success) {
            informeData = data.data;
            renderizarInforme(data.data, destinatario);
            statusDiv.style.display = 'none';
            renderDiv.style.display = 'block';
            btnPDF.disabled = false;
            document.getElementById('btnExportar').disabled = false;
            document.getElementById('btnWord').disabled = false;

            document.getElementById('modulosSelector').style.display = 'block';
            autoDesmarcarVacios(data.data);
        } else {
            statusDiv.innerHTML = `<p style="color:var(--si-red);">Error: ${data.message}</p>`;
        }
    } catch (error) {
        console.error('Error:', error);
        statusDiv.innerHTML = `<p style="color:var(--si-red);">Error de conexión con el servidor.</p>`;
    } finally {
        btnGenerar.disabled = false;
        btnGenerar.innerHTML = `<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clip-rule="evenodd"/></svg> Generar`;
    }
}

// ── Descargar PDF con html2pdf.js ───────────
async function descargarPDF() {
    const btnPDF = document.getElementById('btnDescargarPDF');
    btnPDF.disabled = true;
    btnPDF.textContent = 'Generando PDF...';

    const contenido = document.getElementById('informeRender');

    // Mostrar membrete, ocultar título de pantalla
    const membrete = document.getElementById('membretePDF');
    const tituloPantalla = document.getElementById('tituloPantalla');
    membrete.style.display = 'flex';
    membrete.style.flexDirection = 'column';
    if (tituloPantalla) tituloPantalla.style.display = 'none';

    // Nombre del archivo con la fecha
    const fecha = document.getElementById('fechaInforme').value;
    const [y, m, d] = fecha.split('-');
    const nombreArchivo = `Informe_Diario_${d}-${m}-${y}.pdf`;

    const opciones = {
        margin: [12, 12, 12, 12], // mm: arriba, derecha, abajo, izquierda
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };

    try {
        await html2pdf().set(opciones).from(contenido).save();
    } catch (err) {
        console.error('Error al generar PDF:', err);
        alert('Error al generar el PDF');
    } finally {
        // Restaurar vista de pantalla
        membrete.style.display = 'none';
        if (tituloPantalla) tituloPantalla.style.display = 'block';

        btnPDF.disabled = false;
        btnPDF.innerHTML = `<svg width="18" height="18" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clip-rule="evenodd"/></svg> Descargar PDF`;
    }
}

// ── Auto-desmarcar módulos vacíos ───────────
function autoDesmarcarVacios(data) {
    const mapping = {
        tareas: data.tareas,
        expedientes: data.expedientes,
        intimaciones: data.intimaciones,
        infracciones: data.infracciones,
        reclamos: data.reclamos,
        relevamientos: data.relevamientos,
        comercios: data.comercios,
        vendedores: data.vendedores
    };

    document.querySelectorAll('.check-modulo input').forEach(cb => {
        const items = mapping[cb.value];
        cb.checked = items && items.length > 0;
    });

    aplicarFiltroModulos();
}

// ── Filtrar secciones según checkboxes ──────
function aplicarFiltroModulos() {
    const mapping = {
        tareas: 'secTareas',
        expedientes: 'secExpedientes',
        intimaciones: 'secIntimaciones',
        infracciones: 'secInfracciones',
        reclamos: 'secReclamos',
        relevamientos: 'secRelevamientos',
        comercios: 'secComercios',
        vendedores: 'secVendedores'
    };

    document.querySelectorAll('.check-modulo input').forEach(cb => {
        const sec = document.getElementById(mapping[cb.value]);
        if (sec) sec.style.display = cb.checked ? 'block' : 'none';
    });
}

// ── Renderizar Informe ──────────────────────
function renderizarInforme(data, destinatario) {
    const [year, month, day] = data.fecha.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    document.getElementById('renderDestinatario').textContent = destinatario || '_________________';
    document.getElementById('renderFechaPantalla').textContent = `Fecha: ${fechaFormateada}`;
    const fechaMembrete = document.getElementById('renderFechaMembrete');
    if (fechaMembrete) fechaMembrete.textContent = fechaFormateada;

    renderSectionTareas(data.tareas);
    renderSectionExpedientes(data.expedientes);
    renderSectionIntimaciones(data.intimaciones);
    renderSectionInfracciones(data.infracciones);
    renderSectionReclamos(data.reclamos);
    renderSectionRelevamientos(data.relevamientos);
    renderSectionComercios(data.comercios);
    renderSectionVendedores(data.vendedores);
}

// ── RENDERS POR MÓDULO ──────────────────────

function renderSectionTareas(tareas) {
    setCount('countTareas', tareas.length);
    const body = document.getElementById('bodyTareas');
    if (tareas.length === 0) { body.innerHTML = '<p class="sin-registros">Sin tareas ni operativos registrados.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Categoría</th><th>Título</th><th>Descripción</th><th>Ubicación</th></tr></thead><tbody>`;
    tareas.forEach(t => {
        html += `<tr><td style="font-weight:600;">${t.categoria_nombre || '-'}</td><td>${t.titulo}</td><td>${t.descripcion}</td><td>${t.direccion || '-'} ${t.barrio_nombre ? `(${t.barrio_nombre})` : ''}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionExpedientes(items) {
    setCount('countExpedientes', items.length);
    const body = document.getElementById('bodyExpedientes');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin movimientos de expedientes.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Número</th><th>Contribuyente</th><th>Motivo</th><th>Estado</th></tr></thead><tbody>`;
    items.forEach(i => {
        html += `<tr><td style="font-weight:600;">${i.numero_expediente}</td><td>${i.nombre_apellido} <span style="font-size:11px;color:#94A3B8;">(${i.dni})</span></td><td>${i.motivo}</td><td>${formatearEstado(i.estado)}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionIntimaciones(items) {
    setCount('countIntimaciones', items.length);
    const body = document.getElementById('bodyIntimaciones');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin intimaciones.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Nro</th><th>Contribuyente</th><th>Dirección</th><th>Tipo</th><th>Plazo</th></tr></thead><tbody>`;
    items.forEach(i => {
        const tipo = i.tipo === 'general' ? i.tipo_obstruccion : (i.tipo === 'baldio' ? 'Terreno Baldío' : 'Vehículo');
        html += `<tr><td>${i.numero_intimacion}</td><td>${i.nombre_apellido}</td><td>${i.direccion}</td><td>${tipo}</td><td>${i.plazo_dias > 0 ? `${i.plazo_dias} días` : 'Inmediato'}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionInfracciones(items) {
    setCount('countInfracciones', items.length);
    const body = document.getElementById('bodyInfracciones');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin actas de infracción.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Acta</th><th>Infractor</th><th>Dirección</th><th>Motivo</th></tr></thead><tbody>`;
    items.forEach(i => {
        html += `<tr><td>${i.numero_acta}</td><td>${i.nombre_apellido}</td><td>${i.direccion}</td><td>${i.motivo_infraccion}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionReclamos(items) {
    setCount('countReclamos', items.length);
    const body = document.getElementById('bodyReclamos');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin reclamos recibidos.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Reclamo</th><th>Tipo</th><th>Lugar</th><th>Descripción</th></tr></thead><tbody>`;
    items.forEach(i => {
        html += `<tr><td>${i.numero_reclamo}</td><td style="text-transform:capitalize;">${i.tipo_reclamo}</td><td>${i.direccion_incidente}</td><td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${i.descripcion}">${i.descripcion}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionRelevamientos(items) {
    setCount('countRelevamientos', items.length);
    const body = document.getElementById('bodyRelevamientos');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin relevamientos.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Número</th><th>Ubicación</th><th>Tipo</th><th>Responsable</th></tr></thead><tbody>`;
    items.forEach(i => {
        html += `<tr><td>${i.numero_relevamiento}</td><td>${i.ubicacion}</td><td style="text-transform:capitalize;">${i.tipo_relevamiento}</td><td>${i.responsable_nombre || 'No identificado'}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionComercios(items) {
    setCount('countComercios', items.length);
    const body = document.getElementById('bodyComercios');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin comercios relevados.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Propietario</th><th>Dirección</th><th>Rubro</th><th>Habilitado</th></tr></thead><tbody>`;
    items.forEach(i => {
        html += `<tr><td>${i.nombre_propietario || '-'}</td><td>${i.direccion_comercial}</td><td>${i.rubro || '-'}</td><td>${i.esta_habilitado ? 'Sí' : 'No'}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

function renderSectionVendedores(items) {
    setCount('countVendedores', items.length);
    const body = document.getElementById('bodyVendedores');
    if (items.length === 0) { body.innerHTML = '<p class="sin-registros">Sin vendedores ambulantes.</p>'; return; }
    let html = `<table class="informe-tabla"><thead><tr><th>Vendedor</th><th>Ubicación</th><th>Rubro</th><th>Autorizado</th></tr></thead><tbody>`;
    items.forEach(i => {
        html += `<tr><td>${i.nombre_vendedor || '-'}</td><td>${i.ubicacion}</td><td>${i.rubro || '-'}</td><td>${i.tiene_autorizacion ? 'Sí' : 'No'}</td></tr>`;
    });
    body.innerHTML = html + '</tbody></table>';
}

// ── Utilidades ──────────────────────────────
function formatearEstado(estado) {
    const estados = {
        'ingreso': 'Ingresó',
        'en_inspeccion': 'En inspección',
        'plazo_otorgado': 'Plazo otorgado',
        'salida': 'Dio salida'
    };
    return estados[estado] || estado;
}

function setCount(id, count) {
    const el = document.getElementById(id);
    el.textContent = count;
    el.className = count > 0 ? 'seccion-count' : 'seccion-count sec-zero';
}

function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    if (!token || !usuario) { window.location.href = '/login.html'; return null; }
    return { token, usuario: JSON.parse(usuario) };
}
