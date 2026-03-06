// public/js/export-utils.js
// ============================================
// UTILIDAD DE EXPORTACIÓN A EXCEL
// Usa SheetJS (xlsx) desde CDN
// ============================================

/**
 * Exporta datos a un archivo Excel (.xlsx)
 * @param {Array<Object>} datos - Array de objetos con los datos
 * @param {Array<Object>} columnas - Definición de columnas [{header: 'Nombre', key: 'nombre'}]
 * @param {string} nombreArchivo - Nombre del archivo sin extensión
 * @param {string} nombreHoja - Nombre de la hoja de cálculo
 */
function exportarExcel(datos, columnas, nombreArchivo, nombreHoja = 'Datos') {
    if (!datos || datos.length === 0) {
        alert('No hay datos para exportar.');
        return;
    }

    // Verificar que XLSX esté cargado
    if (typeof XLSX === 'undefined') {
        alert('Error: la librería de exportación no se cargó correctamente.');
        return;
    }

    // Construir filas con las columnas definidas
    const headers = columnas.map(c => c.header);
    const rows = datos.map(item =>
        columnas.map(c => {
            let val = typeof c.key === 'function' ? c.key(item) : item[c.key];
            // Formatear valores especiales
            if (val === null || val === undefined) return '';
            if (typeof val === 'boolean') return val ? 'Sí' : 'No';
            return val;
        })
    );

    // Crear worksheet
    const wsData = [headers, ...rows];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Ajustar ancho de columnas automáticamente
    const colWidths = headers.map((h, i) => {
        const maxContent = Math.max(
            h.length,
            ...rows.map(r => String(r[i] || '').length)
        );
        return { wch: Math.min(maxContent + 2, 50) };
    });
    ws['!cols'] = colWidths;

    // Crear workbook y descargar
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, nombreHoja);

    const fecha = new Date().toISOString().substring(0, 10);
    XLSX.writeFile(wb, `${nombreArchivo}_${fecha}.xlsx`);
}

/**
 * Genera el HTML del botón de exportar (consistente en todos los módulos)
 * @param {string} id - ID del botón
 * @returns {string} HTML del botón
 */
function getBotonExportarHTML(id = 'btnExportar') {
    return `<button class="btn-export" id="${id}" title="Exportar a Excel">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
        </svg>
        Exportar
    </button>`;
}
