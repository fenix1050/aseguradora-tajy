// ============================================
// SUPABASE.JS - Inicialización y verificación de conexión
// ============================================

// ============================================
// ESTADO GLOBAL DEL CLIENTE
// ============================================

let clienteSupabase = null;

// ============================================
// CONFIGURACIÓN
// ============================================

function getConfig() {
    if (window.config && window.config.url && window.config.key) {
        return window.config;
    }
    // NO hay fallback - debe fallar explícitamente
    return null;
}

// ============================================
// INICIALIZACIÓN
// ============================================

export async function inicializarSupabase() {
    try {
        const config = getConfig();

        if (!config) {
            console.error('⚠️ ERROR: config.js no está cargado o es inválido');
            return { success: false, error: 'Error de configuración. Contacte al administrador.' };
        }

        console.log('✅ Configuración validada correctamente');

        const { createClient } = window.supabase;
        clienteSupabase = createClient(config.url, config.key);

        // Verificar conexión con query de prueba
        const { data, error } = await clienteSupabase.from('siniestros').select('count');

        if (error) {
            console.error('Error al conectar con Supabase:', error);
            return { success: false, error: 'Error al conectar: ' + error.message };
        }

        console.log('✅ Conectado exitosamente a Supabase');
        return { success: true, cliente: clienteSupabase };
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        return { success: false, error: 'Error al inicializar: ' + error.message };
    }
}

// ============================================
// GETTERS
// ============================================

export function getClienteSupabase() {
    return clienteSupabase;
}

export function setClienteSupabase(cliente) {
    clienteSupabase = cliente;
}

// ============================================
// VERIFICACIÓN DE CONEXIÓN
// ============================================

export async function verificarConexion() {
    if (!clienteSupabase) {
        return false;
    }

    try {
        const { error } = await clienteSupabase.from('siniestros').select('count');
        return !error;
    } catch (e) {
        return false;
    }
}
