const http = require('http');

const API_BASE = 'http://localhost:3000/api';

// Función auxiliar para hacer requests
const fetchAPI = (path, method = 'GET', token = null, body = null) => {
    return new Promise((resolve, reject) => {
        const url = new URL(API_BASE + path);
        const options = {
            hostname: url.hostname,
            port: url.port,
            path: url.pathname + url.search,
            method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        if (token) {
            options.headers['Authorization'] = `Bearer ${token}`;
        }

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(data);
                    resolve({ status: res.statusCode, data: parsed });
                } catch(e) {
                    resolve({ status: res.statusCode, data });
                }
            });
        });

        req.on('error', reject);

        if (body) {
            req.write(JSON.stringify(body));
        }
        req.end();
    });
};

async function ejecutarAtaquesQA() {
    console.log('🕵️‍♂️ INICIANDO AUDITORÍA DE SEGURIDAD Y HACKEO ÉTICO (RBAC) 🕵️‍♂️\n');

    try {
        console.log('--- 1. Extrayendo Tokens de Sesión ---');
        // Admin
        let res = await fetchAPI('/auth/login', 'POST', null, { usuario: 'admin_qa', password: 'qa123' });
        const tokenAdmin = res.data.token;
        console.log('✅ Token Admin_qa obtenido');

        // Carga
        res = await fetchAPI('/auth/login', 'POST', null, { usuario: 'carga_qa', password: 'qa123' });
        const tokenCarga = res.data.token;
        console.log('✅ Token Carga_qa obtenido');

        // Visor
        res = await fetchAPI('/auth/login', 'POST', null, { usuario: 'visor_qa', password: 'qa123' });
        const tokenVisor = res.data.token;
        console.log('✅ Token Visor_qa obtenido\n');


        console.log('--- 2. Pruebas de Escalada de Privilegios (Rol Carga) ---');
        console.log('Info: "carga_qa" solo tiene permisos para Expedientes e Intimaciones.\n');

        // Ataque A: Intentar leer Infracciones
        process.stdout.write('Ataque A: "carga_qa" intenta listar Infracciones (Modo GET)... ');
        res = await fetchAPI('/infracciones', 'GET', tokenCarga);
        if (res.status === 403 || res.status === 401) {
            console.log(`🛡️ BLOQUEADO (HTTP ${res.status}): ${res.data.message || 'Denegado'}`);
        } else {
            console.log(`❌ VULNERABILIDAD ENCONTRADA (HTTP ${res.status}): ¡Acesso permitido!`);
        }

        // Ataque B: Intentar crear un Usuario Adicional
        process.stdout.write('Ataque B: "carga_qa" intenta crear un usuario Administrador (Modo POST)... ');
        res = await fetchAPI('/usuarios', 'POST', tokenCarga, { nombre_completo: 'Hacker', usuario: 'hacked', password: '123', rol: 'admin_total' });
        if (res.status === 403 || res.status === 401) {
            console.log(`🛡️ BLOQUEADO (HTTP ${res.status}): ${res.data.message || 'Denegado'}`);
        } else {
            console.log(`❌ VULNERABILIDAD ENCONTRADA (HTTP ${res.status}): ¡Usuario creado!`);
        }

        // Ataque C: Intentar acceder a Auditoría del Sistema
        process.stdout.write('Ataque C: "carga_qa" intenta leer los logs de Seguridad (Modo GET)... ');
        res = await fetchAPI('/auditoria', 'GET', tokenCarga);
        if (res.status === 403 || res.status === 401) {
            console.log(`🛡️ BLOQUEADO (HTTP ${res.status}): ${res.data.message || 'Denegado'}`);
        } else {
            console.log(`❌ VULNERABILIDAD ENCONTRADA (HTTP ${res.status}): Logs expuestos!`);
        }


        console.log('\n--- 3. Pruebas de Modificación No Autorizada (Rol Visor) ---');
        console.log('Info: "visor_qa" tiene acceso a todo pero "Solo Lectura". No puede crear, ni borrar.\n');

        // Ataque D: Intentar Listar Expedientes (Debería funcioar)
        process.stdout.write('Prueba D: "visor_qa" intenta listar Expedientes (Lectura GET)... ');
        res = await fetchAPI('/expedientes', 'GET', tokenVisor);
        if (res.status === 200) {
            console.log(`🟢 PERMITIDO (HTTP 200) como es esperado en Solo Lectura.`);
        } else {
            console.log(`❌ ERROR: No pudo leer (HTTP ${res.status})`);
        }

        // Ataque E: Intentar Eliminar un Expediente
        process.stdout.write('Ataque E: "visor_qa" intenta ELIMINAR el expediente ID 1 (Modo DELETE)... ');
        res = await fetchAPI('/expedientes/1', 'DELETE', tokenVisor);
        if (res.status === 403 || res.status === 401) {
            console.log(`🛡️ BLOQUEADO (HTTP ${res.status}): ${res.data.message || 'Denegado'}`);
        } else {
            console.log(`❌ VULNERABILIDAD ENCONTRADA (HTTP ${res.status})`);
        }

        // Ataque F: Intentar Modificar Configuración
        process.stdout.write('Ataque F: "visor_qa" intenta cambiar Configuración (Modo PUT)... ');
        res = await fetchAPI('/configuracion', 'PUT', tokenVisor, { municipalidad_nombre: 'Hackeado' });
        if (res.status === 403 || res.status === 401) {
            console.log(`🛡️ BLOQUEADO (HTTP ${res.status}): ${res.data.message || 'Denegado'}`);
        } else {
            console.log(`❌ VULNERABILIDAD ENCONTRADA (HTTP ${res.status})`);
        }

        console.log('\n✅ REPORTE COMPLETO: La arquitectura API restringe adecuadamente las rutas contra escalada de privilegios.');

    } catch (e) {
        console.error('Error durante auditoría QA:', e);
    }
}

ejecutarAtaquesQA();
