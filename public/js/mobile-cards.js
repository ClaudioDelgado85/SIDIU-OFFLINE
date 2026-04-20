(function () {
    'use strict';

    const pageName = window.location.pathname.split('/').pop() || 'dashboard.html';
    const state = {
        config: null,
        cardsEl: null,
        hintEl: null,
        items: [],
        renderQueued: false
    };

    const helpers = {
        clean(value) {
            return String(value || '')
                .replace(/\s+/g, ' ')
                .replace(/\u00A0/g, ' ')
                .trim();
        },
        escape(value) {
            return helpers.clean(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;');
        },
        controlText(control) {
            if (!control) return '';
            if (control.tagName === 'SELECT') {
                return helpers.clean(control.options[control.selectedIndex]?.textContent || control.value);
            }
            if (control.type === 'checkbox') {
                return control.checked ? 'Si' : 'No';
            }
            return helpers.clean(control.value);
        },
        text(node) {
            if (!node) return '';
            if (node.matches && node.matches('input, select, textarea')) {
                return helpers.controlText(node);
            }

            const controls = node.querySelectorAll ? node.querySelectorAll('input, select, textarea') : [];
            if (controls.length) {
                return helpers.clean(Array.from(controls).map(helpers.controlText).filter(Boolean).join(' '));
            }

            return helpers.clean(node.textContent);
        },
        cell(row, index) {
            return row && row.cells ? row.cells[index] || null : null;
        },
        cellText(row, index) {
            return helpers.text(helpers.cell(row, index));
        },
        findText(row, selector) {
            return helpers.text(row ? row.querySelector(selector) : null);
        },
        fieldValue(row, fieldName) {
            return helpers.controlText(row ? row.querySelector(`[data-field="${fieldName}"]`) : null);
        },
        checkboxStatus(row, fieldName, onText, offText) {
            const control = row ? row.querySelector(`[data-field="${fieldName}"]`) : null;
            return control && control.checked ? onText : offText;
        },
        field(label, value) {
            const cleanValue = helpers.clean(value);
            if (!cleanValue || cleanValue === '-' || cleanValue === '—') return null;
            return { label, value: cleanValue };
        },
        compact(fields) {
            return fields.filter(Boolean);
        },
        badgeText(row) {
            return helpers.findText(
                row,
                '.estado-badge, .rol-badge, .badge-accion, .type-badge, .estado-toggle, .estado-activo, .estado-inactivo'
            );
        },
        accentFromText(value) {
            const raw = helpers.clean(value).toLowerCase();
            if (!raw) return 'info';
            if (/(activo|habilitado|autorizado|cumplida|cumplido|resuelto|salida|ingres|pagaron|pagado|vigente)/.test(raw)) {
                return 'success';
            }
            if (/(vencida|inactivo|anulado|urgente|alta|eliminar|desactivar|no habilitado|no autorizado)/.test(raw)) {
                return 'danger';
            }
            if (/(plazo|proxima|pendiente|proceso|media|vencer|warning)/.test(raw)) {
                return 'warning';
            }
            return 'info';
        }
    };

    const configs = {
        'expedientes.html': {
            tableSelector: '#expedientesTable',
            tbodySelector: '#expedientesTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: ['#searchInput'],
            filterSelectors: ['#filterEstado', '#filterFechaDesde', '#filterFechaHasta', '#filterMotivo'],
            paginationSelectors: ['#paginacionContainer'],
            hintTitle: 'Resultados en formato movil',
            hintText: 'Busca un expediente o aplica filtros para ver las tarjetas.',
            buildCard(row) {
                const numero = helpers.findText(row, '.celda-numero') || helpers.cellText(row, 0);
                const nombre = helpers.findText(row, '.celda-nombre');
                const dni = helpers.findText(row, '.celda-sub').replace(/^DNI:?\s*/i, '');
                const estado = helpers.badgeText(row) || helpers.cellText(row, 4);

                return {
                    eyebrow: 'Expediente',
                    title: numero || 'Sin numero',
                    subtitle: helpers.clean([nombre, dni ? `DNI ${dni}` : ''].filter(Boolean).join(' · ')),
                    badge: estado,
                    accent: helpers.accentFromText(estado || row.getAttribute('data-estado')),
                    summary: helpers.compact([
                        helpers.field('Fecha', helpers.cellText(row, 1)),
                        helpers.field('Motivo', helpers.cellText(row, 3))
                    ]),
                    details: helpers.compact([
                        helpers.field('Numero', numero),
                        helpers.field('Nombre', nombre),
                        helpers.field('DNI', dni),
                        helpers.field('Fecha', helpers.cellText(row, 1)),
                        helpers.field('Motivo', helpers.cellText(row, 3)),
                        helpers.field('Estado', estado)
                    ])
                };
            }
        },
        'intimaciones.html': {
            tableSelector: '#intimacionesTable',
            tbodySelector: '#intimacionesTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: ['#searchInput'],
            filterSelectors: ['#filterTipo', '#filterEstado', '#filterNumero', '#filterFechaDesde', '#filterFechaHasta'],
            paginationSelectors: ['#paginacionContainer'],
            hintTitle: 'Consulta movil de intimaciones',
            hintText: 'Usa la busqueda o los filtros para cargar las cards.',
            buildCard(row) {
                const nombre = helpers.findText(row, '.celda-nombre');
                const dni = helpers.findText(row, '.celda-sub').replace(/^DNI:?\s*/i, '');
                const direccion = helpers.cellText(row, 3);
                const tipo = helpers.cellText(row, 1);
                const estado = helpers.badgeText(row) || helpers.cellText(row, 7);

                return {
                    eyebrow: 'Intimacion',
                    title: nombre || 'Sin nombre',
                    subtitle: helpers.clean([direccion, dni ? `DNI ${dni}` : ''].filter(Boolean).join(' · ')),
                    badge: estado,
                    accent: helpers.accentFromText(estado || row.getAttribute('data-estado')),
                    summary: helpers.compact([
                        helpers.field('Tipo', tipo),
                        helpers.field('Nro', helpers.cellText(row, 4)),
                        helpers.field('Dias', helpers.cellText(row, 5)),
                        helpers.field('Vence', helpers.cellText(row, 6))
                    ]),
                    details: helpers.compact([
                        helpers.field('Nombre', nombre),
                        helpers.field('DNI', dni),
                        helpers.field('Direccion', direccion),
                        helpers.field('Tipo', tipo),
                        helpers.field('Numero intimacion', helpers.cellText(row, 4)),
                        helpers.field('Plazo', helpers.cellText(row, 5)),
                        helpers.field('Vence', helpers.cellText(row, 6)),
                        helpers.field('Estado', estado)
                    ])
                };
            }
        },
        'infracciones.html': {
            tableSelector: '#infraccionesTable',
            tbodySelector: '#infraccionesTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: ['#searchInput'],
            filterSelectors: ['#filterFechaDesde', '#filterFechaHasta'],
            paginationSelectors: ['#paginacionContainer'],
            hintTitle: 'Consulta movil de infracciones',
            hintText: 'Busca por acta, nombre o fecha para ver resultados en cards.',
            buildCard(row) {
                const numero = helpers.findText(row, '.celda-numero') || helpers.cellText(row, 1);
                const nombre = helpers.findText(row, '.celda-nombre');
                const dni = helpers.findText(row, '.celda-sub').replace(/^DNI:?\s*/i, '');

                return {
                    eyebrow: 'Infraccion',
                    title: numero || 'Acta sin numero',
                    subtitle: helpers.clean([nombre, dni ? `DNI ${dni}` : ''].filter(Boolean).join(' · ')),
                    badge: helpers.cellText(row, 0),
                    accent: 'danger',
                    summary: helpers.compact([
                        helpers.field('Motivo', helpers.cellText(row, 4)),
                        helpers.field('Direccion', helpers.cellText(row, 3))
                    ]),
                    details: helpers.compact([
                        helpers.field('Fecha', helpers.cellText(row, 0)),
                        helpers.field('Numero acta', numero),
                        helpers.field('Nombre', nombre),
                        helpers.field('DNI', dni),
                        helpers.field('Direccion', helpers.cellText(row, 3)),
                        helpers.field('Motivo', helpers.cellText(row, 4))
                    ])
                };
            }
        },
        'reclamos.html': {
            tableSelector: '#reclamosTable',
            tbodySelector: '#reclamosTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: ['#searchInput'],
            filterSelectors: ['#filterTipo', '#filterEstado', '#filterPrioridad', '#filterFechaDesde', '#filterFechaHasta'],
            paginationSelectors: ['#pagination'],
            hintTitle: 'Consulta movil de reclamos',
            hintText: 'Busca o filtra reclamos para mostrar las tarjetas.',
            buildCard(row) {
                const numero = helpers.findText(row, '.celda-numero') || helpers.cellText(row, 0);
                const prioridad = helpers.cellText(row, 6);
                const estado = helpers.badgeText(row) || helpers.cellText(row, 7);

                return {
                    eyebrow: 'Reclamo',
                    title: numero || 'Sin numero',
                    subtitle: helpers.cellText(row, 3),
                    badge: estado,
                    accent: helpers.accentFromText(`${estado} ${prioridad}`),
                    summary: helpers.compact([
                        helpers.field('Tipo', helpers.cellText(row, 2)),
                        helpers.field('Prioridad', prioridad),
                        helpers.field('Denunciado', helpers.cellText(row, 4)),
                        helpers.field('Fecha', helpers.cellText(row, 1))
                    ]),
                    details: helpers.compact([
                        helpers.field('Numero', numero),
                        helpers.field('Fecha', helpers.cellText(row, 1)),
                        helpers.field('Tipo', helpers.cellText(row, 2)),
                        helpers.field('Direccion', helpers.cellText(row, 3)),
                        helpers.field('Denunciado', helpers.cellText(row, 4)),
                        helpers.field('Prioridad', prioridad),
                        helpers.field('Estado', estado)
                    ])
                };
            }
        },
        'relevamientos.html': {
            tableSelector: '#relevamientosTable',
            tbodySelector: '#relevamientosTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: ['#searchInput'],
            filterSelectors: ['#filterTipo', '#filterZona', '#filterFechaDesde', '#filterFechaHasta'],
            paginationSelectors: ['#paginacionContainer'],
            hintTitle: 'Consulta movil de relevamientos',
            hintText: 'Busca o aplica filtros para ver las cards del relevamiento.',
            buildCard(row) {
                const tipo = helpers.badgeText(row) || helpers.cellText(row, 2);
                return {
                    eyebrow: 'Relevamiento',
                    title: helpers.findText(row, '.celda-numero') || helpers.cellText(row, 0),
                    subtitle: helpers.cellText(row, 3),
                    badge: tipo,
                    accent: helpers.accentFromText(tipo),
                    summary: helpers.compact([
                        helpers.field('Fecha', helpers.cellText(row, 1)),
                        helpers.field('Zona', helpers.cellText(row, 4)),
                        helpers.field('Responsable', helpers.cellText(row, 5))
                    ]),
                    details: helpers.compact([
                        helpers.field('Numero', helpers.cellText(row, 0)),
                        helpers.field('Fecha', helpers.cellText(row, 1)),
                        helpers.field('Tipo', tipo),
                        helpers.field('Ubicacion', helpers.cellText(row, 3)),
                        helpers.field('Zona', helpers.cellText(row, 4)),
                        helpers.field('Responsable', helpers.cellText(row, 5))
                    ])
                };
            }
        },
        'comercios.html': {
            tableSelector: '#tabla-comercios',
            tbodySelector: '#tabla-body',
            rowSelector: '#tabla-body tr[data-id]:not(.fila-nueva)',
            loadingSelector: '#loadingTable',
            searchSelectors: ['#filtro-busqueda'],
            filterSelectors: ['#filtro-habilitado', '#filtro-barrio', '#filtro-desde', '#filtro-hasta'],
            paginationSelectors: [],
            hintTitle: 'Consulta movil de comercios',
            hintText: 'Filtra o busca un comercio para ver las tarjetas de consulta.',
            buildCard(row) {
                const habilitado = helpers.checkboxStatus(row, 'esta_habilitado', 'Habilitado', 'No habilitado');
                return {
                    eyebrow: 'Comercio',
                    title: helpers.fieldValue(row, 'nombre_propietario') || 'Sin propietario',
                    subtitle: helpers.clean([
                        helpers.fieldValue(row, 'rubro'),
                        helpers.fieldValue(row, 'dni_propietario') ? `DNI ${helpers.fieldValue(row, 'dni_propietario')}` : ''
                    ].filter(Boolean).join(' · ')),
                    badge: habilitado,
                    accent: helpers.accentFromText(habilitado),
                    summary: helpers.compact([
                        helpers.field('Direccion', helpers.fieldValue(row, 'direccion_comercial')),
                        helpers.field('Reempadronar', helpers.checkboxStatus(row, 'necesita_reempadronamiento', 'Si', 'No'))
                    ]),
                    details: helpers.compact([
                        helpers.field('Fecha', helpers.fieldValue(row, 'fecha_relevamiento')),
                        helpers.field('Propietario', helpers.fieldValue(row, 'nombre_propietario')),
                        helpers.field('DNI', helpers.fieldValue(row, 'dni_propietario')),
                        helpers.field('Direccion comercial', helpers.fieldValue(row, 'direccion_comercial')),
                        helpers.field('Rubro', helpers.fieldValue(row, 'rubro')),
                        helpers.field('Habilitado', habilitado),
                        helpers.field('Resolucion', helpers.fieldValue(row, 'numero_resolucion')),
                        helpers.field('Reempadronamiento', helpers.checkboxStatus(row, 'necesita_reempadronamiento', 'Si', 'No')),
                        helpers.field('Barrio', helpers.fieldValue(row, 'barrio_id')),
                        helpers.field('Observaciones', helpers.fieldValue(row, 'observaciones'))
                    ])
                };
            }
        },
        'vendedores.html': {
            tableSelector: '#tabla-vendedores',
            tbodySelector: '#tabla-body',
            rowSelector: '#tabla-body tr[data-id]:not(.fila-nueva)',
            loadingSelector: '#loadingTable',
            searchSelectors: ['#filtro-busqueda'],
            filterSelectors: ['#filtro-autorizacion', '#filtro-canon', '#filtro-barrio', '#filtro-desde', '#filtro-hasta'],
            paginationSelectors: [],
            hintTitle: 'Consulta movil de vendedores',
            hintText: 'Busca o aplica filtros para cargar las cards de vendedores.',
            buildCard(row) {
                const autorizado = helpers.checkboxStatus(row, 'tiene_autorizacion', 'Autorizado', 'No autorizado');
                return {
                    eyebrow: 'Vendedor',
                    title: helpers.fieldValue(row, 'nombre_vendedor') || 'Sin nombre',
                    subtitle: helpers.clean([
                        helpers.fieldValue(row, 'rubro'),
                        helpers.fieldValue(row, 'ubicacion')
                    ].filter(Boolean).join(' · ')),
                    badge: autorizado,
                    accent: helpers.accentFromText(autorizado),
                    summary: helpers.compact([
                        helpers.field('Canon', helpers.checkboxStatus(row, 'pago_canon', 'Pago', 'Pendiente')),
                        helpers.field('DNI', helpers.fieldValue(row, 'dni_vendedor')),
                        helpers.field('Barrio', helpers.fieldValue(row, 'barrio_id'))
                    ]),
                    details: helpers.compact([
                        helpers.field('Fecha', helpers.fieldValue(row, 'fecha_relevamiento')),
                        helpers.field('Nombre', helpers.fieldValue(row, 'nombre_vendedor')),
                        helpers.field('DNI', helpers.fieldValue(row, 'dni_vendedor')),
                        helpers.field('Ubicacion', helpers.fieldValue(row, 'ubicacion')),
                        helpers.field('Rubro', helpers.fieldValue(row, 'rubro')),
                        helpers.field('Autorizacion', autorizado),
                        helpers.field('Pago canon', helpers.checkboxStatus(row, 'pago_canon', 'Si', 'No')),
                        helpers.field('Numero recibo', helpers.fieldValue(row, 'numero_recibo')),
                        helpers.field('Vencimiento canon', helpers.fieldValue(row, 'fecha_vencimiento_canon')),
                        helpers.field('Observaciones', helpers.fieldValue(row, 'observaciones'))
                    ])
                };
            }
        },
        'tareas_diarias.html': {
            tableSelector: '#tareasTable',
            tbodySelector: '#tareasTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: ['#filterFecha'],
            filterSelectors: [],
            paginationSelectors: [],
            hintTitle: 'Consulta movil de tareas',
            hintText: 'Selecciona una fecha para ver las tareas en cards.',
            buildCard(row) {
                return {
                    eyebrow: 'Tarea diaria',
                    title: helpers.findText(row, '.celda-nombre') || helpers.cellText(row, 1),
                    subtitle: helpers.cellText(row, 0),
                    badge: helpers.clean(document.getElementById('filterFecha')?.value || ''),
                    accent: 'info',
                    summary: helpers.compact([
                        helpers.field('Descripcion', helpers.cellText(row, 2)),
                        helpers.field('Direccion', helpers.cellText(row, 3)),
                        helpers.field('Barrio', helpers.cellText(row, 4))
                    ]),
                    details: helpers.compact([
                        helpers.field('Fecha', document.getElementById('filterFecha')?.value || ''),
                        helpers.field('Categoria', helpers.cellText(row, 0)),
                        helpers.field('Titulo', helpers.cellText(row, 1)),
                        helpers.field('Descripcion', helpers.cellText(row, 2)),
                        helpers.field('Direccion', helpers.cellText(row, 3)),
                        helpers.field('Barrio', helpers.cellText(row, 4))
                    ])
                };
            }
        },
        'catalogos.html': {
            tableSelector: '#catTable',
            tbodySelector: '#catTableBody',
            loadingSelector: '#loadingCat',
            emptySelector: '#emptyCat',
            searchSelectors: [],
            filterSelectors: [],
            paginationSelectors: [],
            showByDefault: true,
            hintTitle: 'Catalogos en formato movil',
            hintText: 'Selecciona una categoria para ver sus opciones como tarjetas.',
            buildCard(row) {
                const estado = helpers.cellText(row, 3);
                return {
                    eyebrow: helpers.clean(document.getElementById('catTitle')?.textContent || 'Catalogo'),
                    title: helpers.cellText(row, 2),
                    subtitle: helpers.cellText(row, 1),
                    badge: estado,
                    accent: helpers.accentFromText(estado),
                    summary: helpers.compact([
                        helpers.field('Orden', helpers.cellText(row, 0))
                    ]),
                    details: helpers.compact([
                        helpers.field('Orden', helpers.cellText(row, 0)),
                        helpers.field('Valor interno', helpers.cellText(row, 1)),
                        helpers.field('Etiqueta', helpers.cellText(row, 2)),
                        helpers.field('Estado', estado)
                    ])
                };
            }
        },
        'usuarios.html': {
            tableSelector: '#usuariosTable',
            tbodySelector: '#usuariosTableBody',
            loadingSelector: '#loadingTable',
            searchSelectors: [],
            filterSelectors: [],
            paginationSelectors: [],
            showByDefault: true,
            hintTitle: 'Usuarios en formato movil',
            hintText: 'Los usuarios activos se muestran como tarjetas de consulta.',
            buildCard(row) {
                const rol = helpers.badgeText(row) || helpers.cellText(row, 2);
                return {
                    eyebrow: 'Usuario',
                    title: helpers.findText(row, '.celda-nombre') || helpers.cellText(row, 0),
                    subtitle: helpers.findText(row, '.celda-sub') || helpers.cellText(row, 1),
                    badge: rol,
                    accent: helpers.accentFromText(helpers.cellText(row, 3)),
                    summary: helpers.compact([
                        helpers.field('Estado', helpers.cellText(row, 3))
                    ]),
                    details: helpers.compact([
                        helpers.field('Nombre', helpers.findText(row, '.celda-nombre') || helpers.cellText(row, 0)),
                        helpers.field('Email', helpers.findText(row, '.celda-sub')),
                        helpers.field('Usuario', helpers.cellText(row, 1)),
                        helpers.field('Rol', rol),
                        helpers.field('Estado', helpers.cellText(row, 3))
                    ])
                };
            }
        },
        'auditoria.html': {
            tableSelector: '#auditTable',
            tbodySelector: '#auditTableBody',
            loadingSelector: '#loadingTable',
            emptySelector: '#emptyState',
            searchSelectors: [],
            filterSelectors: ['#filterUsuario', '#filterModulo', '#filterAccion', '#filterFechaDesde', '#filterFechaHasta'],
            paginationSelectors: ['#paginacion'],
            showByDefault: true,
            hintTitle: 'Auditoria en formato movil',
            hintText: 'Aplica filtros para reducir el historial y consultarlo en cards.',
            buildCard(row) {
                const accion = helpers.badgeText(row) || helpers.cellText(row, 2);
                return {
                    eyebrow: 'Auditoria',
                    title: helpers.cellText(row, 4),
                    subtitle: helpers.clean([helpers.cellText(row, 1), helpers.cellText(row, 0)].filter(Boolean).join(' · ')),
                    badge: accion,
                    accent: helpers.accentFromText(accion),
                    summary: helpers.compact([
                        helpers.field('Modulo', helpers.cellText(row, 3)),
                        helpers.field('IP', helpers.cellText(row, 5))
                    ]),
                    details: helpers.compact([
                        helpers.field('Fecha', helpers.cellText(row, 0)),
                        helpers.field('Usuario', helpers.cellText(row, 1)),
                        helpers.field('Accion', accion),
                        helpers.field('Modulo', helpers.cellText(row, 3)),
                        helpers.field('Descripcion', helpers.cellText(row, 4)),
                        helpers.field('IP', helpers.cellText(row, 5))
                    ])
                };
            }
        }
    };

    function ensureCardElements() {
        const table = document.querySelector(state.config.tableSelector);
        const container = table?.closest('.table-container');
        if (!container) return false;

        let cards = document.getElementById('mobileCardsContainer');
        if (!cards) {
            cards = document.createElement('div');
            cards.id = 'mobileCardsContainer';
            cards.className = 'mobile-cards-container';
            container.appendChild(cards);
        }

        let hint = document.getElementById('mobileCardsHint');
        if (!hint) {
            hint = document.createElement('div');
            hint.id = 'mobileCardsHint';
            hint.className = 'mobile-results-hint';
            container.insertBefore(hint, cards);
        }

        state.cardsEl = cards;
        state.hintEl = hint;
        return true;
    }

    function ensureDetailOverlay() {
        let overlay = document.getElementById('mobileDetailOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'mobileDetailOverlay';
        overlay.className = 'mobile-detail-overlay';
        overlay.innerHTML = `
            <div class="mobile-detail-sheet" role="dialog" aria-modal="true" aria-labelledby="mobileDetailTitle">
                <button type="button" class="mobile-detail-close" id="btnCloseMobileDetail" aria-label="Cerrar detalle">×</button>
                <div class="mobile-detail-head" id="mobileDetailHead"></div>
                <div class="mobile-detail-list" id="mobileDetailList"></div>
            </div>
        `;

        overlay.addEventListener('click', (event) => {
            if (event.target === overlay) {
                closeDetail();
            }
        });

        overlay.querySelector('#btnCloseMobileDetail').addEventListener('click', closeDetail);
        document.body.appendChild(overlay);
        return overlay;
    }

    function hasValue(selector) {
        const element = document.querySelector(selector);
        if (!element) return false;
        if (element.type === 'checkbox' || element.type === 'radio') return element.checked;
        return Boolean(helpers.clean(element.value ?? element.textContent));
    }

    function isMobile() {
        return window.matchMedia('(max-width: 768px)').matches;
    }

    function elementVisible(selector) {
        const element = document.querySelector(selector);
        if (!element) return false;
        return window.getComputedStyle(element).display !== 'none' && !element.hidden;
    }

    function getRows() {
        const selector = state.config.rowSelector || `${state.config.tbodySelector} tr`;
        return Array.from(document.querySelectorAll(selector)).filter((row) => !row.classList.contains('fila-nueva'));
    }

    function hasActiveFilters() {
        if (state.config.showByDefault) return true;
        const selectors = [...(state.config.searchSelectors || []), ...(state.config.filterSelectors || [])];
        return selectors.some(hasValue);
    }

    function setHintVisible(visible) {
        if (!state.hintEl) return;
        if (!visible) {
            state.hintEl.style.display = 'none';
            return;
        }

        state.hintEl.innerHTML = `
            <strong>${helpers.escape(state.config.hintTitle || 'Consulta movil')}</strong>
            <span>${helpers.escape(state.config.hintText || 'Aplica una busqueda o un filtro para ver resultados.')}</span>
        `;
        state.hintEl.style.display = 'block';
    }

    function setCardsVisible(visible) {
        if (!state.cardsEl) return;
        state.cardsEl.style.display = visible ? 'grid' : 'none';
    }

    function setPaginationForcedVisibility(visible) {
        (state.config.paginationSelectors || []).forEach((selector) => {
            document.querySelectorAll(selector).forEach((element) => {
                element.classList.toggle('mobile-hidden-by-cards', !visible);
            });
        });
    }

    function renderCardMarkup(item, index) {
        const badge = item.badge
            ? `<span class="mobile-card-badge">${helpers.escape(item.badge)}</span>`
            : '';
        const summary = (item.summary || []).slice(0, 4).map((field) => `
            <div class="mobile-card-field">
                <span class="mobile-card-field-label">${helpers.escape(field.label)}</span>
                <span class="mobile-card-field-value">${helpers.escape(field.value)}</span>
            </div>
        `).join('');

        return `
            <button type="button" class="mobile-card is-${helpers.escape(item.accent || 'info')}" data-card-index="${index}">
                <div class="mobile-card-top">
                    <div>
                        <p class="mobile-card-eyebrow">${helpers.escape(item.eyebrow || '')}</p>
                        <h3 class="mobile-card-title">${helpers.escape(item.title || 'Sin titulo')}</h3>
                        ${item.subtitle ? `<p class="mobile-card-subtitle">${helpers.escape(item.subtitle)}</p>` : ''}
                    </div>
                    ${badge}
                </div>
                <div class="mobile-card-summary">${summary}</div>
                <div class="mobile-card-cta">Ver detalle</div>
            </button>
        `;
    }

    function openDetail(item) {
        if (!item) return;
        const overlay = ensureDetailOverlay();
        const head = overlay.querySelector('#mobileDetailHead');
        const list = overlay.querySelector('#mobileDetailList');
        const badge = item.badge ? `<span class="mobile-card-badge">${helpers.escape(item.badge)}</span>` : '';

        head.innerHTML = `
            <p class="mobile-card-eyebrow">${helpers.escape(item.eyebrow || '')}</p>
            <h3 class="mobile-card-title" id="mobileDetailTitle">${helpers.escape(item.title || 'Detalle')}</h3>
            ${item.subtitle ? `<p class="mobile-card-subtitle">${helpers.escape(item.subtitle)}</p>` : ''}
            ${badge}
        `;

        list.innerHTML = (item.details || item.summary || []).map((field) => `
            <div class="mobile-detail-row">
                <span class="mobile-detail-label">${helpers.escape(field.label)}</span>
                <span class="mobile-detail-value">${helpers.escape(field.value)}</span>
            </div>
        `).join('');

        overlay.classList.add('is-open');
        document.body.classList.add('mobile-detail-open');
    }

    function closeDetail() {
        const overlay = document.getElementById('mobileDetailOverlay');
        if (!overlay) return;
        overlay.classList.remove('is-open');
        document.body.classList.remove('mobile-detail-open');
    }

    function render() {
        if (!isMobile()) {
            setHintVisible(false);
            setCardsVisible(false);
            setPaginationForcedVisibility(true);
            closeDetail();
            return;
        }

        const loadingVisible = state.config.loadingSelector ? elementVisible(state.config.loadingSelector) : false;
        const emptyVisible = state.config.emptySelector ? elementVisible(state.config.emptySelector) : false;
        const filtersActive = hasActiveFilters();

        if (loadingVisible) {
            setHintVisible(false);
            setCardsVisible(false);
            setPaginationForcedVisibility(false);
            return;
        }

        const rows = getRows();
        if (!filtersActive) {
            state.items = [];
            state.cardsEl.innerHTML = '';
            setCardsVisible(false);
            setHintVisible(true);
            setPaginationForcedVisibility(false);
            return;
        }

        if (emptyVisible || !rows.length) {
            state.items = [];
            state.cardsEl.innerHTML = '';
            setCardsVisible(false);
            setHintVisible(false);
            setPaginationForcedVisibility(false);
            return;
        }

        state.items = rows.map((row) => state.config.buildCard(row)).filter(Boolean);
        state.cardsEl.innerHTML = state.items.map(renderCardMarkup).join('');
        setHintVisible(false);
        setCardsVisible(Boolean(state.items.length));
        setPaginationForcedVisibility(Boolean(state.items.length));
    }

    function queueRender() {
        if (state.renderQueued) return;
        state.renderQueued = true;
        window.requestAnimationFrame(() => {
            state.renderQueued = false;
            render();
        });
    }

    function bindObservers() {
        const tbody = document.querySelector(state.config.tbodySelector);
        if (!tbody) return;

        const observer = new MutationObserver(queueRender);
        observer.observe(tbody, { childList: true, subtree: true });

        tbody.addEventListener('input', queueRender, true);
        tbody.addEventListener('change', queueRender, true);

        [...(state.config.searchSelectors || []), ...(state.config.filterSelectors || [])].forEach((selector) => {
            const element = document.querySelector(selector);
            if (!element) return;
            element.addEventListener('input', queueRender);
            element.addEventListener('change', queueRender);
        });

        if (state.cardsEl) {
            state.cardsEl.addEventListener('click', (event) => {
                const card = event.target.closest('[data-card-index]');
                if (!card) return;
                openDetail(state.items[Number(card.dataset.cardIndex)]);
            });
        }
    }

    function init() {
        state.config = configs[pageName];
        if (!state.config) return;
        if (!ensureCardElements()) return;

        bindObservers();
        queueRender();

        window.addEventListener('resize', queueRender);
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeDetail();
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
