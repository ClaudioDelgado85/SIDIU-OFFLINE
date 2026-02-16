// public/js/dashboard.js
const API_URL = '/api';

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
    return { token, usuario: JSON.parse(usuario) };
}

document.addEventListener('DOMContentLoaded', () => {
    const sesion = verificarAutenticacion();
    if (sesion) {
        document.getElementById('userName').textContent = sesion.usuario.nombre_completo;
        // document.getElementById('userRole').textContent = sesion.usuario.rol;
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
        const response = await fetch(`${API_URL}/dashboard/resumen`, {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        const data = await response.json();

        if (data.success) {
            actualizarKPIs(data.data.kpis);
            renderizarGraficos(data.data.graficos);
            renderizarTablas(data.data.tablas);
        }

    } catch (error) {
        console.error('Error cargando dashboard:', error);
    }
}

function actualizarKPIs(kpis) {
    document.getElementById('kpiExpedientes').textContent = kpis.expedientes_mes;

    // Intimaciones
    document.getElementById('kpiIntimaciones').textContent = kpis.intimaciones_vencidas;
    document.getElementById('kpiIntimacionesProximas').textContent = kpis.intimaciones_proximas;

    // Reclamos
    document.getElementById('kpiReclamos').textContent = kpis.reclamos_pendientes;
    document.getElementById('kpiReclamosProceso').textContent = kpis.reclamos_proceso;

    document.getElementById('kpiInfracciones').textContent = kpis.infracciones_mes;
}

function renderizarGraficos(datos) {
    // 1. Reclamos por Tipo (Bar Chart)
    const ctxReclamos = document.getElementById('reclamosChart').getContext('2d');
    const tipos = datos.reclamos_tipo.map(d => d.tipo_reclamo.toUpperCase());
    const cantidades = datos.reclamos_tipo.map(d => d.total);

    new Chart(ctxReclamos, {
        type: 'bar',
        data: {
            labels: tipos,
            datasets: [{
                label: 'Cantidad',
                data: cantidades,
                backgroundColor: '#3b82f6',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // 2. Estado Intimaciones (Doughnut)
    const ctxIntimaciones = document.getElementById('intimacionesChart').getContext('2d');
    const estados = datos.intimaciones_estado.map(d => d.estado.toUpperCase());
    const totales = datos.intimaciones_estado.map(d => d.total);

    // Colores según estado
    const colorMap = {
        'VIGENTE': '#f59e0b',
        'CUMPLIDA': '#10b981',
        'VENCIDA': '#ef4444'
    };
    const backgroundColors = estados.map(e => colorMap[e] || '#cbd5e1');

    new Chart(ctxIntimaciones, {
        type: 'doughnut',
        data: {
            labels: estados,
            datasets: [{
                data: totales,
                backgroundColor: backgroundColors,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'right' }
            }
        }
    });
}

function renderizarTablas(tablas) {
    // 1. Vencimientos
    const tbodyVenc = document.querySelector('#tablaVencimientos tbody');
    tbodyVenc.innerHTML = tablas.vencimientos.map(item => `
        <tr onclick="window.location.href='intimaciones.html?id=${item.id}'" style="cursor:pointer">
            <td>${item.tipo.toUpperCase()}</td>
            <td>${item.nombre_apellido}</td>
            <td><span class="status-badge bg-danger">${item.dias_restantes} días</span></td>
        </tr>
    `).join('');

    // 2. Actividad Reciente (Reclamos)
    const tbodyAct = document.querySelector('#tablaActividad tbody');
    tbodyAct.innerHTML = tablas.recientes.map(item => `
        <tr onclick="window.location.href='reclamos.html?id=${item.id}'" style="cursor:pointer">
            <td>📢 Reclamo #${item.id}</td>
            <td>${item.descripcion.substring(0, 30)}...</td>
            <td>${new Date(item.fecha).toLocaleDateString()}</td>
        </tr>
    `).join('');
}
