// ============================================
// NAVBAR GLOBAL — Navegación entre módulos
// Incluir este script en todas las páginas (excepto login)
// ============================================

(function () {
    const modulos = [
        { href: 'dashboard.html', icon: '🏠', label: 'Inicio' },
        { href: 'expedientes.html', icon: '📁', label: 'Expedientes' },
        { href: 'intimaciones.html', icon: '⚠️', label: 'Intimaciones' },
        { href: 'infracciones.html', icon: '🚨', label: 'Infracciones' },
        { href: 'reclamos.html', icon: '📢', label: 'Reclamos' },
        { href: 'relevamientos.html', icon: '📍', label: 'Relevamientos' },
        { href: 'busqueda.html', icon: '🔍', label: 'Búsqueda' },
        { href: 'catalogos.html', icon: '⚙️', label: 'Catálogos' }
    ];

    const paginaActual = window.location.pathname.split('/').pop() || 'dashboard.html';

    const nav = document.createElement('nav');
    nav.className = 'navbar-modulos';
    nav.innerHTML = modulos.map(m => {
        const activo = paginaActual === m.href;
        return `<a href="${m.href}" class="navbar-link${activo ? ' active' : ''}" title="${m.label}">
            <span class="navbar-icon">${m.icon}</span>
            <span class="navbar-label">${m.label}</span>
        </a>`;
    }).join('');

    // Insertar después del header
    const header = document.querySelector('.dashboard-header');
    if (header) {
        header.insertAdjacentElement('afterend', nav);
    }
})();
