// scripts/test-auth-intimaciones.js
const API_URL = 'http://localhost:3000/api';

async function testAuth() {
    try {
        console.log('1. Intentando login con admin/admin123...');

        const loginRes = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario: 'admin', password: 'admin123' })
        });

        const loginData = await loginRes.json();

        if (loginData.success) {
            console.log('✅ Login exitoso');
            const token = loginData.token;
            console.log('Token recibido:', token.substring(0, 20) + '...');

            console.log('\n2. Intentando acceder a /intimaciones con el token...');

            const intimacionesRes = await fetch(`${API_URL}/intimaciones`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (intimacionesRes.ok) {
                const data = await intimacionesRes.json();
                console.log('✅ Acceso a Intimaciones exitoso');
                console.log('Datos recibidos:', data);
            } else {
                console.error('❌ Error accediendo a Intimaciones:', intimacionesRes.status);
            }

        } else {
            console.error('❌ Login fallido:', loginData);
        }

    } catch (error) {
        console.error('❌ Error en la prueba:', error);
    }
}

testAuth();
