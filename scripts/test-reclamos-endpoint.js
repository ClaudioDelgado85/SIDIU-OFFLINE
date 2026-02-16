// scripts/test-reclamos-endpoint.js
const API_URL = 'http://localhost:3000/api';

async function testReclamos() {
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

        console.log('✅ Auntenticado. Token obtenido.');

        console.log('🔄 Creando reclamo de prueba...');
        const nuevoReclamo = {
            tipo_reclamo: 'alumbrado',
            descripcion: 'Lámpara quemada en esquina',
            direccion_incidente: 'Av. San Martín 1200',
            prioridad: 'alta',
            vecino_nombre: 'Juan Test'
        };

        const createRes = await fetch(`${API_URL}/reclamos`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(nuevoReclamo)
        });

        const createData = await createRes.json();
        if (!createData.success) throw new Error('Error al crear reclamo: ' + createData.message);
        console.log(`✅ Reclamo creado: ID ${createData.data.id}, Nro: ${createData.data.numero_reclamo}`);

        console.log('🔄 Listando reclamos...');
        const listRes = await fetch(`${API_URL}/reclamos?limit=5`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const listData = await listRes.json();
        console.log(`✅ Listado obtenido: ${listData.data.length} registros`);

        console.log('🔄 Actualizando estado a "en_proceso"...');
        const updateRes = await fetch(`${API_URL}/reclamos/${createData.data.id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ estado: 'en_proceso', observaciones_resolucion: 'Cuadrilla asignada' })
        });
        const updateData = await updateRes.json();
        if (updateData.success) console.log('✅ Estado actualizado correctamente');

    } catch (error) {
        console.error('❌ Error en prueba:', error.message);
    }
}

testReclamos();
