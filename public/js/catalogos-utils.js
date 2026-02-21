// ============================================
// UTILIDAD: Cargar opciones dinámicas desde API de Catálogos
// Incluir en páginas que usen formularios con selects dinámicos
// ============================================

/**
 * Carga opciones en un <select> desde la API de catálogos.
 * @param {string} selectId - ID del elemento <select> en el DOM
 * @param {string} categoria - Categoría del catálogo (ej: 'tipo_intimacion')
 * @param {string} [valorSeleccionado] - Valor a pre-seleccionar
 * @param {object} [opciones] - Opciones adicionales
 * @param {boolean} [opciones.incluirVacio=true] - Si incluir opción vacía "-- Seleccionar --"
 * @param {string} [opciones.textoVacio] - Texto de la opción vacía
 */
async function cargarSelectCatalogo(selectId, categoria, valorSeleccionado, opciones = {}) {
    const select = document.getElementById(selectId);
    if (!select) return;

    const {
        incluirVacio = true,
        textoVacio = '-- Seleccionar --'
    } = opciones;

    try {
        const token = localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`/api/catalogos?categoria=${encodeURIComponent(categoria)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        if (!result.success) return;

        // Limpiar opciones existentes (excepto la primera si es placeholder)
        select.innerHTML = '';

        // Agregar opción vacía si se requiere
        if (incluirVacio) {
            const optVacia = document.createElement('option');
            optVacia.value = '';
            optVacia.textContent = textoVacio;
            select.appendChild(optVacia);
        }

        // Agregar opciones del catálogo
        result.data.forEach(item => {
            const option = document.createElement('option');
            option.value = item.valor;
            option.textContent = item.label;
            if (valorSeleccionado && valorSeleccionado === item.valor) {
                option.selected = true;
            }
            select.appendChild(option);
        });

    } catch (error) {
        console.error(`Error al cargar catálogo "${categoria}":`, error);
    }
}

/**
 * Obtiene los datos de un catálogo como array (para uso programático).
 * @param {string} categoria - Categoría del catálogo
 * @returns {Promise<Array>} Array de {valor, label}
 */
async function obtenerCatalogo(categoria) {
    try {
        const token = localStorage.getItem('token');
        if (!token) return [];

        const response = await fetch(`/api/catalogos?categoria=${encodeURIComponent(categoria)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const result = await response.json();
        return result.success ? result.data : [];
    } catch (error) {
        console.error(`Error al obtener catálogo "${categoria}":`, error);
        return [];
    }
}
