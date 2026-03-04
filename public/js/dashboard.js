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
            titulo: '3ª Intimación',
            subtitulo: 'Vencidas',
            accion: 'Labrar acta de infracción',
            color: 'esc-red',
            icono: svgFire
        }
    ];

    const tipoLabels = {
        general: '📋 General',
        baldio: '🏗️ Baldíos',
        vehiculo: '🚗 Vehículos'
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

    let html = `<table class="dash-table"><thead><tr>
        <th>Nro</th><th>Tipo</th><th>Dirección</th><th>Prioridad</th><th>Días</th>
    </tr></thead><tbody>`;

    items.forEach(r => {
        const prioClass = `p-${r.prioridad}`;
        const prioLabel = r.prioridad.charAt(0).toUpperCase() + r.prioridad.slice(1);

        html += `<tr onclick="window.location.href='reclamos.html'">
            <td style="font-weight:700;">${r.numero_reclamo}</td>
            <td style="text-transform:capitalize;">${r.tipo_reclamo}</td>
            <td style="max-width:180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.direccion_incidente}">${r.direccion_incidente}</td>
            <td><span class="badge-prioridad ${prioClass}">${prioLabel}</span></td>
            <td><span class="badge-dias badge-warning">${r.dias_sin_resolver} d</span></td>
        </tr>`;
    });

    container.innerHTML = html + '</tbody></table>';
}
