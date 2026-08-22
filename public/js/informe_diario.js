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

    // Sincronización en vivo: editar el destinatario actualiza el documento ya renderizado
    document.getElementById('destinatarioInforme').addEventListener('input', (e) => {
        document.getElementById('renderDestinatario').textContent = e.target.value || '_________________';
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
        { header: 'Tipo', key: (i) => i.tipo_obstruccion_label || i.tipo_label || i.tipo },
        { header: 'Rubro', key: (i) => i.rubro_comercial_label || '' },
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
        const destinatario = document.getElementById('destinatarioInforme').value;
        const [y, m, d] = fecha.split('-');
        // Destinatario editado viaja por query string (R6); el servidor lo
        // sanea y aplica el default si llega vacío.
        const res = await fetch(`${API_URL}/informes/diario/docx?fecha=${fecha}&destinatario=${encodeURIComponent(destinatario || '')}`, {
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
        margin: [18, 14, 18, 14], // mm: alineado con @page del CSS de impresión (arriba, derecha, abajo, izquierda)
        filename: nombreArchivo,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        // Evitar cortes de página dentro de ítems de lista, encabezados
        // de sección y el bloque de firma. [R7]
        pagebreak: {
            mode: ['avoid-all', 'css', 'legacy'],
            avoid: ['.informe-lista-formal li', '.informe-seccion-header', '.informe-firma']
        }
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

// ── Render narrativo formal (fuente: data.seccionesNarrativas) ──

/**
 * Escapa caracteres especiales de HTML en texto provisto por el servidor
 * antes de interpolarlo en plantillas de marcado. [R3]
 */
function escaparHtml(str) {
    return String(str === null || str === undefined ? '' : str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

/** Primera letra en mayúscula (para componer ids DOM a partir de una clave). */
function capitalizarPrimera(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
}

// Alias de sufijos DOM donde la clave del servicio difiere del id legado:
// el módulo 'actas' del servicio vive en las secciones 'Infracciones' del DOM.
const SUFIJOS_DOM = { actas: 'Infracciones' };

// Sufijos DOM de los 8 módulos, para limpiar cuerpos entre consultas:
// como las secciones sin registros ya no se renderizan, sin esta limpieza
// un contenedor conservaría los registros de la fecha anterior.
const SUFIJOS_MODULOS = [
    'Tareas', 'Expedientes', 'Intimaciones', 'Infracciones',
    'Reclamos', 'Relevamientos', 'Comercios', 'Vendedores'
];

/** Vacía cuerpos y contadores de las 8 secciones antes de renderizar la
 * consulta actual: sin esta limpieza, un módulo que pasa a cero conservaría
 * registros y contador de la fecha anterior. */
function limpiarCuerposSecciones() {
    SUFIJOS_MODULOS.forEach((sufijo) => {
        const cuerpo = document.getElementById(`body${sufijo}`);
        if (cuerpo) cuerpo.innerHTML = '';
        const contador = document.getElementById(`count${sufijo}`);
        if (contador) contador.textContent = '';
    });
}

/**
 * Render genérico de UNA sección narrativa: título y contador desde la API,
 * párrafo resumen + lista ordenada de items cuando hay registros, o leyenda
 * formal vacía (textoVacio) cuando no los hay. Todo texto interpolado pasa
 * por escaparHtml. [R5]
 */
function renderSeccionNarrativa(sec) {
    if (!sec) return;
    const sufijo = SUFIJOS_DOM[sec.clave] || capitalizarPrimera(sec.clave);

    const tituloEl = document.querySelector(`#sec${sufijo} h3`);
    if (tituloEl) tituloEl.textContent = sec.titulo;

    setCount(`count${sufijo}`, sec.totalSeccion);

    const body = document.getElementById(`body${sufijo}`);
    if (!body) return;

    if (sec.totalSeccion > 0 && Array.isArray(sec.items)) {
        const items = sec.items.map(item => `<li>${escaparHtml(item)}</li>`).join('');
        body.innerHTML =
            `<p class="informe-parrafo-resumen">${escaparHtml(sec.parrafoResumen)}</p>` +
            `<ol class="informe-lista-formal">${items}</ol>`;
    } else {
        body.innerHTML = `<p class="sin-registros">${escaparHtml(sec.textoVacio || '')}</p>`;
    }
}

/**
 * Completa los bloques formales del documento (introducción, resumen
 * ejecutivo, cierre y firma) una única vez desde la fuente narrativa.
 */
function renderizarBloquesFormales(narrativa) {
    document.getElementById('renderIntroduccion').textContent = narrativa.introduccion || '';

    const lineasResumen = document.getElementById('lineasResumen');
    lineasResumen.innerHTML = (narrativa.lineasResumen || []).map(linea =>
        `<li>${escaparHtml(linea.etiqueta)}: ${Number(linea.cantidad) || 0}</li>`
    ).join('');
    document.getElementById('fraseTotalGeneral').textContent = narrativa.fraseTotalGeneral || '';

    document.getElementById('renderCierre').textContent = narrativa.cierre || '';

    const firma = narrativa.firma || {};
    document.getElementById('firmaLinea').textContent = firma.linea || '';
    document.getElementById('firmaAclaracion').textContent = firma.aclaracion || '';
    document.getElementById('firmaCargo').textContent = firma.cargo || '';
    document.getElementById('firmaLugarFecha').textContent = firma.lugarFecha || '';
}

/** Fecha ISO YYYY-MM-DD → DD/MM/YYYY (respaldo si falta la fuente narrativa). */
function formatearFechaDesdeIso(fecha) {
    const partes = String(fecha || '').split('-');
    return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : '';
}

// ── Renderizar Informe ──────────────────────
function renderizarInforme(data, destinatario) {
    const narrativa = data.seccionesNarrativas || null;
    const fechaFormateada = (narrativa && narrativa.fechaFormateada) ||
        formatearFechaDesdeIso(data.fecha);

    document.getElementById('renderDestinatario').textContent = destinatario || '_________________';
    document.getElementById('renderFechaPantalla').textContent = `Fecha: ${fechaFormateada}`;
    const fechaMembrete = document.getElementById('renderFechaMembrete');
    if (fechaMembrete) fechaMembrete.textContent = fechaFormateada;

    const avisoPrevio = document.getElementById('avisoSinSecciones');
    if (avisoPrevio) avisoPrevio.remove();

    // Limpiar SIEMPRE antes de cualquier salida (render o aviso de error):
    // nunca debe convivir contenido de la consulta anterior con la actual. [R5]
    limpiarCuerposSecciones();

    // Sin fuente narrativa no hay render silencioso: aviso visible en el
    // contenedor del informe. [R5]
    if (!narrativa || !Array.isArray(narrativa.secciones)) {
        mostrarAvisoSinSecciones();
        return;
    }

    renderizarBloquesFormales(narrativa);

    // Los 8 módulos comparten el mismo render genérico; títulos y textos
    // provienen de la API (R5) y SUFIJOS_DOM resuelve el alias actas → Infracciones.
    narrativa.secciones.forEach(renderSeccionNarrativa);
}

/** Aviso visible cuando la respuesta no incluye seccionesNarrativas. */
function mostrarAvisoSinSecciones() {
    const contenedor = document.getElementById('informeRender');
    if (!contenedor || document.getElementById('avisoSinSecciones')) return;
    const aviso = document.createElement('p');
    aviso.id = 'avisoSinSecciones';
    aviso.style.color = 'var(--si-red)';
    aviso.textContent = 'No se pudieron cargar las secciones del informe.';
    contenedor.insertBefore(aviso, contenedor.firstChild);
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
