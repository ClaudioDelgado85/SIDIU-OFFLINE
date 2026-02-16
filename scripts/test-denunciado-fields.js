// scripts/test-denunciado-fields.js
const API_URL = 'http://localhost:3000/api';

async function testDenunciadoFields() {
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

        console.log('🔄 Creando reclamo CON datos del denunciado...');
        const nuevoReclamo = {
            tipo_reclamo: 'baldio',
            descripcion: 'Terreno baldío con maleza alta y basura acumulada',
            direccion_incidente: 'Av. Paraguay 500',
            prioridad: 'alta',
            vecino_nombre: 'María García',
            vecino_telefono: '3718-445566',
            denunciado_nombre: 'Juan Propietario',
            denunciado_dni: '12345678',
            denunciado_direccion: 'Calle Sarmiento 123'
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
        if (!createData.success) throw new Error('Error al crear: ' + createData.message);
        console.log(`✅ Reclamo creado: ${createData.data.numero_reclamo}`);

        // Verificar que los datos se guardaron correctamente
        console.log('🔄 Verificando datos guardados...');
        const getRes = await fetch(`${API_URL}/reclamos?busqueda=${createData.data.numero_reclamo}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const getData = await getRes.json();

        if (getData.data.length > 0) {
            const r = getData.data[0];
            console.log('\n📋 Datos del reclamo guardado:');
            console.log(`  Número: ${r.numero_reclamo}`);
            console.log(`  Denunciado Nombre: ${r.denunciado_nombre || '(vacío)'}`);
            console.log(`  Denunciado DNI: ${r.denunciado_dni || '(vacío)'}`);
            console.log(`  Denunciado Dirección: ${r.denunciado_direccion || '(vacío)'}`);

            if (r.denunciado_nombre === 'Juan Propietario' && r.denunciado_dni === '12345678') {
                console.log('\n✅ ÉXITO: Los campos del denunciado se guardaron correctamente');
            } else {
                console.log('\n❌ ERROR: Los campos del denunciado NO se guardaron');
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

testDenunciadoFields();
