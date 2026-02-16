// public/js/busqueda.js
const API_URL = '/api';
let searchTimeout;

// ============================================
// CONFIGURACIÓN DE COLUMNAS
// ============================================
const COLUMNAS = [
    { tipo: 'expediente', icon: '📁', label: 'Expedientes', page: 'expedientes.html' },
    { tipo: 'intimacion', icon: '⚠️', label: 'Intimaciones', page: 'intimaciones.html' },
    { tipo: 'infraccion', icon: '🚨', label: 'Infracciones', page: 'infracciones.html' },
    { tipo: 'reclamo', icon: '📢', label: 'Reclamos', page: 'reclamos.html' },
    { tipo: 'relevamiento', icon: '🗺️', label: 'Relevamientos', page: 'relevamientos.html' }
];

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
    }

    document.getElementById('btnLogout').addEventListener('click', () => {
        localStorage.clear();
        window.location.href = '/login.html';
    });

    // Evento de búsqueda con debounce
    const input = document.getElementById('globalSearch');
    input.addEventListener('input', (e) => {
        const query = e.target.value.trim();

        clearTimeout(searchTimeout);

        if (query.length >= 3) {
            searchTimeout = setTimeout(() => realizarBusqueda(query, sesion.token), 400);
        } else {
            document.getElementById('resultsContainer').style.display = 'none';
            document.getElementById('searchSummary').style.display = 'none';
            document.getElementById('emptyState').style.display = 'none';
        }
    });
});

// ============================================
// BUSCAR
// ============================================
async function realizarBusqueda(query, token) {
    const loader = document.getElementById('loadingResults');
    const container = document.getElementById('resultsContainer');
    const emptyState = document.getElementById('emptyState');
    const summary = document.getElementById('searchSummary');

    loader.style.display = 'flex';
    container.style.display = 'none';
    emptyState.style.display = 'none';
    summary.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/busqueda/global?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.data.length > 0) {
            renderizarColumnas(data.data, query);
        } else {
            emptyState.style.display = 'block';
        }

    } catch (error) {
        console.error('Error en búsqueda:', error);
    } finally {
        loader.style.display = 'none';
    }
}

// ============================================
// RENDERIZAR COLUMNAS
// ============================================
function renderizarColumnas(resultados, query) {
    const container = document.getElementById('resultsContainer');
    const summary = document.getElementById('searchSummary');

    // Agrupar resultados por tipo
    const agrupados = {};
    COLUMNAS.forEach(col => { agrupados[col.tipo] = []; });

    resultados.forEach(item => {
        if (agrupados[item.tipo]) {
            agrupados[item.tipo].push(item);
        }
    });

    // Mostrar resumen
    const total = resultados.length;
    summary.innerHTML = `Se encontraron <strong>${total}</strong> registro${total !== 1 ? 's' : ''} para "<strong>${escapeHtml(query)}</strong>"`;
    summary.style.display = 'block';

    // Generar columnas
    let html = '';

    COLUMNAS.forEach(col => {
        const items = agrupados[col.tipo];
        const count = items.length;

        html += `
        <div class="result-column col-${col.tipo}">
            <div class="column-header">
                <span><span class="col-icon">${col.icon}</span> ${col.label}</span>
                <span class="col-count">${count}</span>
            </div>
            <div class="column-body">
        `;

        if (count === 0) {
            html += `<div class="column-empty">Sin registros</div>`;
        } else {
            items.forEach(item => {
                const fecha = formatearFecha(item.fecha);
                const estadoClass = 'status-' + (item.estado || '').replace(/\s+/g, '_').toLowerCase();

                html += `
                <div class="result-card">
                    <div class="card-date">${fecha}</div>
                    <div class="card-title">
                        <a href="${item.link}">${item.titulo}</a>
                    </div>
                    <div class="card-desc">${item.descripcion || '-'}</div>
                    <div class="card-footer">
                        <span class="card-status ${estadoClass}">${item.estado || 'N/A'}</span>
                        <a href="${item.link}" class="card-link">Ver detalle →</a>
                    </div>
                </div>
                `;
            });
        }

        html += `
            </div>
        </div>
        `;
    });

    container.innerHTML = html;
    container.style.display = 'grid';
}

// ============================================
// UTILIDADES
// ============================================
function formatearFecha(fecha) {
    if (!fecha) return '-';
    const d = new Date(fecha);
    return d.toLocaleDateString('es-AR', {
        day: '2-digit', month: 'short', year: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}
