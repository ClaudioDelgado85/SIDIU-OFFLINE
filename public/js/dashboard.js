// public/js/dashboard.js
// ============================================
// DASHBOARD — Centro de Operaciones
// ============================================

const API_URL = '/api';

function verificarAutenticacion() {
    const token = localStorage.getItem('token');
    const usuario = localStorage.getItem('usuario');
    if (!token || !usuario) { window.location.href = '/login.html'; return null; }
    return { token, usuario: JSON.parse(usuario) };
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (sesion) {
        document.getElementById('userName').textContent = sesion.usuario.nombre_completo;
    }

    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });

    cargarDashboard();
});

async function cargarDashboard() {
    const sesion = verificarAutenticacion();
    if (!sesion) return;

    try {
        const res = await fetch(`${API_URL}/dashboard/resumen`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });
        const data = await res.json();

        if (data.success) {
            actualizarKPIs(data.data.kpis);
            renderEscalamiento(data.data.escalamiento);
            renderAccionInmediata(data.data.tablas.accion_inmediata);
            renderReclamos(data.data.tablas.reclamos_prioridad);
        }
    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

// ── KPIs ────────────────────────────────────
function actualizarKPIs(kpis) {
    document.getElementById('kpiIntVencidas').textContent = kpis.intimaciones_vencidas;
    document.getElementById('kpiIntProximas').textContent = kpis.intimaciones_proximas;
    document.getElementById('kpiExpPlazo').textContent = kpis.expedientes_plazo;
    document.getElementById('kpiRecPendientes').textContent = kpis.reclamos_pendientes;

    const subRec = document.getElementById('kpiRecProceso');
    if (kpis.reclamos_proceso > 0) {
        subRec.textContent = `+ ${kpis.reclamos_proceso} en gestión`;
    }
}

// ── Tarjetas de Escalamiento ────────────────
function renderEscalamiento(rawData) {
    const container = document.getElementById('escalamientoCards');

    // Agrupar datos: { 1: { general: 3, baldio: 2, vehiculo: 1 }, 2: {...}, 3+: {...} }
    const niveles = { 1: {}, 2: {}, 3: {} };

    (rawData || []).forEach(row => {
        const nivel = row.numero_intimacion >= 3 ? 3 : row.numero_intimacion;
        const tipo = row.tipo || 'general';
        niveles[nivel][tipo] = (niveles[nivel][tipo] || 0) + row.total;
    });

    const svgAlert = '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/></svg>';
    const svgClock = '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>';
    const svgFire = '<svg width="22" height="22" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.879 16.121A3 3 0 1012.015 11L11 14H9c0 .768.293 1.536.879 2.121z"/></svg>';

    const config = [
        {
            nivel: 1,
            titulo: '1ª Intimación',
            subtitulo: 'Vencidas',
            accion: 'Generar 2ª intimación',
            color: 'esc-amber',
            icono: svgAlert
        },
        {
            nivel: 2,
            titulo: '2ª Intimación',
            subtitulo: 'Vencidas',
            accion: 'Generar 3ª intimación',
            color: 'esc-orange',
            icono: svgClock
        },
        {
            nivel: 3,
            titulo: '3ª o más Intimaciones',
            subtitulo: 'Vencidas',
            accion: 'Labrar acta de infracción',
            color: 'esc-red',
            icono: svgFire
        }
    ];

    const iconBase = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" style="margin-right:4px; vertical-align:-2px; opacity:0.7;">';

    const tipoLabels = {
        general: `${iconBase}<path stroke-linecap="round" stroke-linejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg> General`,
        baldio: `${iconBase}<path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Baldíos`,
        vehiculo: `${iconBase}<path stroke-linecap="round" stroke-linejoin="round" d="M8 7h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2V9a2 2 0 012-2zm-3 8a2 2 0 100 4 2 2 0 000-4zm14 0a2 2 0 100 4 2 2 0 000-4z"/></svg> Vehículos`
    };

    let html = '';

    config.forEach(c => {
        const datos = niveles[c.nivel];
        const total = Object.values(datos).reduce((s, v) => s + v, 0);

        // Desglose por tipo
        let desglose = '';
        ['baldio', 'vehiculo', 'general'].forEach(tipo => {
            if (datos[tipo]) {
                desglose += `<div class="esc-tipo"><span class="esc-tipo-label">${tipoLabels[tipo]}</span><span class="esc-tipo-count">${datos[tipo]}</span></div>`;
            }
        });

        if (!desglose) {
            desglose = '<div class="esc-tipo" style="color:var(--si-text-muted);font-style:italic;">Sin vencidas</div>';
        }

        html += `
        <div class="esc-card ${c.color}" onclick="window.location.href='intimaciones.html'">
            <div class="esc-header">
                <div class="esc-icon-wrap">${c.icono}</div>
                <div>
                    <div class="esc-titulo">${c.titulo}</div>
                    <div class="esc-subtitulo">${c.subtitulo}</div>
                </div>
                <div class="esc-total">${total}</div>
            </div>
            <div class="esc-desglose">${desglose}</div>
            <div class="esc-accion">${total > 0 ? '→ ' + c.accion : ''}</div>
        </div>`;
    });

    container.innerHTML = html;
}

// ── Reclamos ────────────────────────────────
function renderReclamos(items) {
    const container = document.getElementById('panelReclamos');

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="dash-empty">
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p>Sin reclamos pendientes — Todo al día</p>
        </div>`;
        return;
    }

    let htmlTable = `<table class="dash-table mobile-hidden-by-cards"><thead><tr>
        <th>Nro</th><th>Tipo</th><th>Dirección</th><th>Prioridad</th><th>Días</th>
    </tr></thead><tbody>`;

    let htmlCards = `<div class="mobile-cards-container dashboard-mobile-reclamos">`;

    items.forEach(r => {
        const prioClass = `p-${r.prioridad}`;
        const prioLabel = r.prioridad.charAt(0).toUpperCase() + r.prioridad.slice(1);
        
        // Fila de tabla para escritorio
        htmlTable += `<tr onclick="window.location.href='reclamos.html'">
            <td style="font-weight:700;">${r.numero_reclamo}</td>
            <td style="text-transform:capitalize;">${r.tipo_reclamo}</td>
            <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.direccion_incidente}">${r.direccion_incidente}</td>
            <td><span class="badge-prioridad ${prioClass}">${prioLabel}</span></td>
            <td><span class="badge-dias badge-warning">${r.dias_sin_resolver} d</span></td>
        </tr>`;

        // Tarjeta para móvil
        let isClass = 'is-info';
        if(r.prioridad === 'alta') isClass = 'is-danger';
        else if(r.prioridad === 'media') isClass = 'is-warning';

        htmlCards += `
        <div class="mobile-card ${isClass}" onclick="window.location.href='reclamos.html'">
            <div class="mobile-card-top">
                <div>
                    <h3 class="mobile-card-title" style="text-transform:capitalize;">${r.tipo_reclamo}</h3>
                    <p class="mobile-card-subtitle">${r.direccion_incidente}</p>
                </div>
                <span class="badge-prioridad ${prioClass}" style="font-size:0.7rem; padding:4px 8px;">${prioLabel}</span>
            </div>
            <div class="mobile-card-summary">
                <div class="mobile-card-field">
                    <span class="mobile-card-field-label">Nro. Reclamo</span>
                    <span class="mobile-card-field-value">${r.numero_reclamo}</span>
                </div>
                <div class="mobile-card-field">
                    <span class="mobile-card-field-label">Días sin resolver</span>
                    <span class="mobile-card-field-value" style="color:#d97706; font-weight:700;">${r.dias_sin_resolver} días</span>
                </div>
            </div>
        </div>`;
    });

    htmlTable += '</tbody></table>';
    htmlCards += '</div>';

    container.innerHTML = htmlTable + htmlCards;
}

// ── Acción Inmediata ────────────────────────
function formatearFecha(fecha) {
    if (!fecha) return '-';
    const fechaStr = String(fecha).substring(0, 10);
    const parts = fechaStr.split('-');
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

function renderAccionInmediata(items) {
    const container = document.getElementById('panelAccionInmediata');

    if (!items || items.length === 0) {
        container.innerHTML = `<div class="dash-empty">
            <svg width="40" height="40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            <p>✅ Sin casos críticos — ningún caso con 4+ intimaciones tiene su última acta vencida</p>
        </div>`;
        return;
    }

    let htmlTable = `<table class="dash-table tabla-accion mobile-hidden-by-cards"><thead><tr>
        <th>Caso</th><th>Contribuyente</th><th>Dirección</th><th>Actas</th><th>Última acta</th><th>Vencimiento</th><th>Tipo</th>
    </tr></thead><tbody>`;

    let htmlCards = `<div class="mobile-cards-container dashboard-mobile-reclamos">`;

    items.forEach(r => {
        const tipoLabel = (r.tipo || 'general').charAt(0).toUpperCase() + (r.tipo || 'general').slice(1);
        const vencimiento = formatearFecha(r.fecha_vencimiento);

        // Fila de tabla para escritorio
        htmlTable += `<tr class="row-danger">
            <td style="font-weight:700;">#${r.grupo_id}</td>
            <td>${r.nombre_apellido}</td>
            <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.direccion}">${r.direccion}</td>
            <td><span class="badge-actas badge-danger">${r.total_instancias}</span></td>
            <td>#${r.ultima_instancia}</td>
            <td class="col-vencido">${vencimiento}</td>
            <td style="text-transform:capitalize;">${tipoLabel}</td>
        </tr>`;

        // Tarjeta para móvil
        htmlCards += `
        <div class="mobile-card is-danger">
            <div class="mobile-card-top">
                <div>
                    <h3 class="mobile-card-title">${r.nombre_apellido}</h3>
                    <p class="mobile-card-subtitle">${r.direccion}</p>
                </div>
                <span class="badge-actas badge-danger">${r.total_instancias} actas</span>
            </div>
            <div class="mobile-card-summary">
                <div class="mobile-card-field">
                    <span class="mobile-card-field-label">Caso</span>
                    <span class="mobile-card-field-value">#${r.grupo_id}</span>
                </div>
                <div class="mobile-card-field">
                    <span class="mobile-card-field-label">Última acta</span>
                    <span class="mobile-card-field-value">#${r.ultima_instancia} — ${tipoLabel}</span>
                </div>
                <div class="mobile-card-field">
                    <span class="mobile-card-field-label">Vencimiento</span>
                    <span class="mobile-card-field-value" style="color:var(--cl-naranja); font-weight:700;">${vencimiento}</span>
                </div>
            </div>
        </div>`;
    });

    htmlTable += '</tbody></table>';
    htmlCards += '</div>';

    container.innerHTML = htmlTable + htmlCards;
}
