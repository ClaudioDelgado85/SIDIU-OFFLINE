// scripts/test-reclamos-search-endpoint.js
const API_URL = 'http://localhost:3000/api';

async function testBusqueda() {
    try {
        console.log('🔄 Autenticando...');
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'admin', password: 'admin123' })
        });
        const loginData = await loginRes.json();
        if (!loginData.success) throw new Error('Login fallido');
        const token = loginData.token;

        // Crear un reclamo específico para buscar
        const timestamp = Date.now();
        const descripcionUnica = `Falla electrica ${timestamp}`;

        console.log(`🔄 Creando reclamo único: ${descripcionUnica}`);
        await fetch(`${API_URL}/reclamos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                tipo_reclamo: 'alumbrado',
                descripcion: descripcionUnica,
                direccion_incidente: 'Calle Test 123',
                prioridad: 'baja'
            })
        });

        // Probar búsqueda
        console.log('🔄 Probando búsqueda...');
        const searchRes = await fetch(`${API_URL}/reclamos?busqueda=${timestamp}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const searchData = await searchRes.json();

        if (searchData.data.length > 0 && searchData.data[0].descripcion === descripcionUnica) {
            console.log('✅ Búsqueda EXITOSA. Se encontró el registro unico.');
            console.log(`Encontrado: ${searchData.data[0].numero_reclamo} - ${searchData.data[0].descripcion}`);
        } else {
            console.error('❌ Búsqueda FALLIDA. No se encontró el registro.');
            console.log('Datos recibidos:', searchData);
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testBusqueda();
