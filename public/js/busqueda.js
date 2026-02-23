// public/js/busqueda.js — Ficha del Contribuyente (Rediseño cronológico)
(function () {
    'use strict';

    const API_URL = '/api';
    let searchTimeout;
    let allResults = [];
    let activeFilter = null;

    // ============================================
    // TIPOS DE REGISTRO (configuración)
    // ============================================
    const TIPOS = {
        expediente: { icon: '📁', label: 'Expedientes', labelSingular: 'Expediente' },
        intimacion: { icon: '⚠️', label: 'Intimaciones', labelSingular: 'Intimación' },
        infraccion: { icon: '🚨', label: 'Infracciones', labelSingular: 'Infracción' },
        reclamo: { icon: '📢', label: 'Reclamos', labelSingular: 'Reclamo' },
        relevamiento: { icon: '🗺️', label: 'Relevamientos', labelSingular: 'Relevamiento' },
        comercio: { icon: '🏪', label: 'Comercios', labelSingular: 'Comercio' },
        vendedor_ambulante: { icon: '🛒', label: 'Vendedores', labelSingular: 'Vendedor' }
    };

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
        if (!sesion) return;

        document.getElementById('userName').textContent = sesion.usuario.nombre_completo;

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
                ocultarResultados();
            }
        });
    });

    // ============================================
    // OCULTAR RESULTADOS
    // ============================================
    function ocultarResultados() {
        document.getElementById('resultsTimeline').style.display = 'none';
        document.getElementById('searchSummary').style.display = 'none';
        document.getElementById('emptyState').style.display = 'none';
        document.getElementById('fichaContribuyente').style.display = 'none';
        document.getElementById('tipoChips').style.display = 'none';
    }

    // ============================================
    // BUSCAR
    // ============================================
    async function realizarBusqueda(query, token) {
        const loader = document.getElementById('loadingResults');
        const emptyState = document.getElementById('emptyState');

        loader.style.display = 'flex';
        ocultarResultados();

        try {
            const response = await fetch(`${API_URL}/busqueda/global?q=${encodeURIComponent(query)}`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await response.json();

            if (data.success && data.data.length > 0) {
                allResults = data.data;
                activeFilter = null;
                renderizarFicha(data.data, query);
                renderizarChips(data.data);
                renderizarTimeline(data.data, query);
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
    // FICHA DEL CONTRIBUYENTE
    // ============================================
    function renderizarFicha(resultados, query) {
        const fichaEl = document.getElementById('fichaContribuyente');
        const avatarEl = document.getElementById('fichaAvatar');
        const nombreEl = document.getElementById('fichaNombre');
        const dniEl = document.getElementById('fichaDni');
        const resumenEl = document.getElementById('fichaResumen');

        // Buscar el nombre y DNI más frecuente entre los resultados
        const nombres = {};
        const dnis = {};

        resultados.forEach(r => {
            if (r.nombre) {
                const n = r.nombre.trim().toUpperCase();
                nombres[n] = (nombres[n] || 0) + 1;
            }
            if (r.dni) {
                const d = r.dni.trim();
                dnis[d] = (dnis[d] || 0) + 1;
            }
        });

        const nombreTop = Object.entries(nombres).sort((a, b) => b[1] - a[1])[0];
        const dniTop = Object.entries(dnis).sort((a, b) => b[1] - a[1])[0];

        const nombre = nombreTop ? nombreTop[0] : null;
        const dni = dniTop ? dniTop[0] : null;

        if (nombre || dni) {
            // Generar iniciales para avatar
            const iniciales = nombre
                ? nombre.split(/\s+/).filter(Boolean).map(p => p[0]).slice(0, 2).join('')
                : '?';

            avatarEl.textContent = iniciales;
            nombreEl.textContent = nombre || 'Sin nombre registrado';
            dniEl.textContent = dni ? `DNI: ${dni}` : '';

            // Badges de resumen por tipo
            const conteo = {};
            resultados.forEach(r => {
                conteo[r.tipo] = (conteo[r.tipo] || 0) + 1;
            });

            let badgesHtml = '';
            Object.entries(conteo).forEach(([tipo, count]) => {
                const cfg = TIPOS[tipo] || { icon: '📄', label: tipo };
                badgesHtml += `<span class="ficha-badge ficha-badge-${tipo}">${cfg.icon} ${count} ${count === 1 ? cfg.labelSingular : cfg.label}</span>`;
            });
            resumenEl.innerHTML = badgesHtml;

            fichaEl.style.display = 'flex';
        } else {
            fichaEl.style.display = 'none';
        }
    }

    // ============================================
    // CHIPS DE FILTRO POR TIPO
    // ============================================
    function renderizarChips(resultados) {
        const container = document.getElementById('tipoChips');

        const conteo = {};
        resultados.forEach(r => {
            conteo[r.tipo] = (conteo[r.tipo] || 0) + 1;
        });

        let html = `<button class="tipo-chip active" data-tipo="todos">Todos <span class="chip-count">${resultados.length}</span></button>`;

        Object.entries(conteo).forEach(([tipo, count]) => {
            const cfg = TIPOS[tipo] || { icon: '📄', label: tipo };
            html += `<button class="tipo-chip" data-tipo="${tipo}">${cfg.icon} ${cfg.label} <span class="chip-count">${count}</span></button>`;
        });

        container.innerHTML = html;
        container.style.display = 'flex';

        // Click en chips
        container.querySelectorAll('.tipo-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                container.querySelectorAll('.tipo-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');

                const tipo = chip.dataset.tipo;
                if (tipo === 'todos') {
                    activeFilter = null;
                    renderizarTimeline(allResults);
                } else {
                    activeFilter = tipo;
                    renderizarTimeline(allResults.filter(r => r.tipo === tipo));
                }
            });
        });
    }

    // ============================================
    // RENDERIZAR TIMELINE
    // ============================================
    function renderizarTimeline(resultados, query) {
        const container = document.getElementById('resultsTimeline');
        const summary = document.getElementById('searchSummary');

        // Resumen
        const total = resultados.length;
        if (query) {
            summary.innerHTML = `Se encontraron <strong>${total}</strong> registro${total !== 1 ? 's' : ''} para "<strong>${escapeHtml(query)}</strong>"`;
        } else {
            summary.innerHTML = `Mostrando <strong>${total}</strong> registro${total !== 1 ? 's' : ''}`;
        }
        summary.style.display = 'block';

        if (total === 0) {
            container.innerHTML = '<div class="column-empty">No hay registros de este tipo</div>';
            container.style.display = 'block';
            return;
        }

        // Los resultados ya vienen ordenados por fecha desc del backend
        let html = '';
        resultados.forEach(item => {
            const fecha = formatearFecha(item.fecha);
            const estadoClass = 'status-' + (item.estado || '').replace(/\s+/g, '_').toLowerCase();
            const cfg = TIPOS[item.tipo] || { icon: '📄', label: item.tipo };

            html += `
            <div class="timeline-row">
                <div class="tl-fecha">${fecha}</div>
                <div class="tl-tipo">
                    <span class="tl-tipo-badge tl-badge-${item.tipo}">${cfg.icon} ${cfg.labelSingular}</span>
                </div>
                <div class="tl-info">
                    <div class="tl-titulo"><a href="${item.link}">${escapeHtml(item.titulo)}</a></div>
                    <div class="tl-desc">${escapeHtml(item.descripcion || '')}</div>
                </div>
                <div>
                    <span class="tl-estado ${estadoClass}">${item.estado || 'N/A'}</span>
                </div>
                <div>
                    <a href="${item.link}" class="tl-link">Ver detalle →</a>
                </div>
            </div>`;
        });

        container.innerHTML = html;
        container.style.display = 'flex';
    }

    // ============================================
    // UTILIDADES
    // ============================================
    function formatearFecha(fecha) {
        if (!fecha) return '—';
        const d = new Date(fecha);
        return d.toLocaleDateString('es-AR', {
            day: '2-digit', month: 'short', year: 'numeric'
        });
    }

    function escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

})();
