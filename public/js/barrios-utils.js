// ============================================
// UTILIDAD: Cargar Barrios desde API
// Incluir este script en todas las páginas que usen formularios
// ============================================

async function cargarSelectBarrios(selectId, valorSeleccionado) {
    const select = document.getElementById(selectId);
    if (!select) return;

    try {
        const sesion = JSON.parse(localStorage.getItem('sesion'));
        if (!sesion) return;

        const response = await fetch('/api/barrios', {
            headers: { 'Authorization': `Bearer ${sesion.token}` }
        });

        const result = await response.json();
        if (!result.success) return;

        // Mantener la opción por defecto
        result.data.forEach(barrio => {
            const option = document.createElement('option');
            option.value = barrio.id;
            option.textContent = barrio.nombre;
            if (valorSeleccionado && parseInt(valorSeleccionado) === barrio.id) {
                option.selected = true;
            }
            select.appendChild(option);
        });

    } catch (error) {
        console.error('Error al cargar barrios:', error);
    }
}
