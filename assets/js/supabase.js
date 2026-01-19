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
        clienteSupabase = createClient(config.url, config.key, {
            auth: {
                autoRefreshToken: true,
                persistSession: true,
                detectSessionInUrl: false
            }
        });

        // Listener para cambios en la autenticación
        clienteSupabase.auth.onAuthStateChange((event, session) => {
            console.log('🔐 Auth state changed:', event);

            if (event === 'TOKEN_REFRESHED') {
                console.log('✅ Token refrescado automáticamente');
            }

            if (event === 'SIGNED_OUT') {
                console.log('🚪 Sesión cerrada');
                window.location.href = 'login.html';
            }

            if (event === 'USER_DELETED') {
                console.log('❌ Usuario eliminado');
                window.location.href = 'login.html';
            }
        });

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

// ============================================
// MANEJO DE ERRORES DE SESIÓN
// ============================================

/**
 * Verifica si un error es por token expirado y maneja el refresco
 * @param {Object} error - Error de Supabase
 * @returns {Promise<boolean>} true si el error fue manejado, false si no
 */
export async function manejarErrorSesion(error) {
    if (!error) return false;

    // Códigos de error relacionados con autenticación
    const erroresAuth = [
        'invalid_token',
        'JWT expired',
        'Invalid Refresh Token',
        'PGRST301'
    ];

    const esErrorAuth = erroresAuth.some(codigo =>
        error.message?.includes(codigo) ||
        error.code?.includes(codigo) ||
        error.toString().includes(codigo)
    );

    if (esErrorAuth) {
        console.warn('⚠️ Token expirado detectado, intentando refrescar sesión...');

        try {
            const { data: { session }, error: refreshError } = await clienteSupabase.auth.refreshSession();

            if (refreshError || !session) {
                console.error('❌ No se pudo refrescar la sesión, redirigiendo al login');
                window.location.href = 'login.html';
                return true;
            }

            console.log('✅ Sesión refrescada exitosamente');
            return true;
        } catch (e) {
            console.error('Error al refrescar sesión:', e);
            window.location.href = 'login.html';
            return true;
        }
    }

    return false;
}
