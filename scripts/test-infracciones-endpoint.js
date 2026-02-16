// scripts/test-infracciones-endpoint.js
const API_URL = 'http://localhost:3000/api';

async function testEndpoint() {
    try {
        // 1. Login para obtener token
        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'admin', password: 'admin123' })
        });

        const loginData = await loginRes.json();
        if (!loginData.success) throw new Error('Login fallido');

        const token = loginData.token;

        // 2. Probar endpoint infracciones
        const res = await fetch(`${API_URL}/infracciones?limit=1`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            console.log('✅ Endpoint /api/infracciones respondiendo correctamente (200 OK)');
            const data = await res.json();
            console.log(`Registros encontrados: ${data.data.length}`);
        } else {
            console.error(`❌ Endpoint falló con status: ${res.status}`);
            const err = await res.text();
            console.error(err);
        }
    } catch (error) {
        console.error('❌ Error de conexión:', error.message);
    }
}

testEndpoint();
