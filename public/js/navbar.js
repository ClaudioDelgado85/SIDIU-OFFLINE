// ============================================
// NAVBAR GLOBAL — Navegación entre módulos
// Incluir este script en todas las páginas (excepto login)
// ============================================

(function () {
    const modulos = [
        {
            href: 'dashboard.html',
            label: 'Inicio',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1h-2z"/></svg>'
        },
        {
            href: 'expedientes.html',
            label: 'Expedientes',
            icon: '<svg viewBox="0 0 24 24"><path d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"/></svg>'
        },
        {
            href: 'intimaciones.html',
            label: 'Intimaciones',
            icon: '<svg viewBox="0 0 24 24"><path d="M12 9v2m0 4h.01M5.07 19h13.86c1.54 0 2.5-1.67 1.73-3L13.73 4c-.77-1.33-2.69-1.33-3.46 0L3.34 16c-.77 1.33.19 3 1.73 3z"/></svg>'
        },
        {
            href: 'infracciones.html',
            label: 'Infracciones',
            icon: '<svg viewBox="0 0 24 24"><path d="M9 12h6m-3-3v6m-7 4h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/><path d="M12 3v2m0 14v2M3 12h2m14 0h2"/></svg>'
        },
        {
            href: 'reclamos.html',
            label: 'Reclamos',
            icon: '<svg viewBox="0 0 24 24"><path d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6 3 3 0 000 6z"/><path d="M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"/></svg>'
        },
        {
            href: 'relevamientos.html',
            label: 'Relevamientos',
            icon: '<svg viewBox="0 0 24 24"><path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>'
        },
        {
            href: 'busqueda.html',
            label: 'Búsqueda',
            icon: '<svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>'
        },
        {
            href: 'catalogos.html',
            label: 'Catálogos',
            icon: '<svg viewBox="0 0 24 24"><path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.573-1.066z"/><circle cx="12" cy="12" r="3"/></svg>'
        }
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
