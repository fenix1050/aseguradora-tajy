// ============================================
// AUTH.JS - Login, Logout, Roles, Sesión
// ============================================

import { getClienteSupabase } from './supabase.js';

// ============================================
// ESTADO DEL USUARIO
// ============================================

let usuarioActual = null;
let cachedUserId = null; // Cache en memoria para el userId
let perfilCargado = false; // Flag para evitar reintentos de carga de perfil
let perfilError = null; // Almacena el error de perfil (si existe)

// ============================================
// GETTERS Y SETTERS
// ============================================

export function getUsuarioActual() {
    return usuarioActual;
}

export function setUsuarioActual(usuario) {
    usuarioActual = usuario;
}

/**
 * Retorna el error de perfil (si existe)
 * Se usa para mostrar alerta al usuario en app.js
 */
export function getPerfilError() {
    return perfilError;
}

/**
 * Obtiene el UUID del usuario autenticado desde Supabase Auth
 * Esta es la fuente única de verdad para RLS
 * Utiliza cache en memoria para evitar llamadas repetidas
 * @returns {Promise<string|null>} UUID del usuario o null si no hay sesión
 */
export async function getUserId() {
    // Si ya tenemos el userId en cache, retornarlo inmediatamente
    if (cachedUserId) {
        return cachedUserId;
    }

    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) return null;

    try {
        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (user && user.id) {
            cachedUserId = user.id; // Cachear el userId
            return cachedUserId;
        }
        return null;
    } catch (e) {
        console.error('Error obteniendo user ID:', e);
        return null;
    }
}

/**
 * Limpia el cache del userId
 * Debe llamarse cuando el usuario cierra sesión
 */
export function clearUserIdCache() {
    cachedUserId = null;
}

/**
 * Resetea el estado de perfil
 * Permite reintentar la carga de perfil en un nuevo login
 */
function resetPerfilState() {
    perfilCargado = false;
    perfilError = null;
    usuarioActual = null;
}

// ============================================
// VERIFICACIÓN DE SESIÓN
// ============================================

/**
 * Verifica que exista una sesión válida en Supabase Auth
 * @returns {Promise<Object|null>} Objeto {user} si hay sesión, null si no
 */
async function validarSesionAuth() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        console.warn('⚠️ Supabase no inicializado');
        return null;
    }

    try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error || !session) {
            console.log('❌ No hay sesión activa en Supabase Auth');
            return null;
        }

        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (!user) {
            console.log('❌ No se pudo obtener usuario de Supabase Auth');
            return null;
        }

        return { user };
    } catch (e) {
        console.error('Error validando sesión de auth:', e);
        return null;
    }
}

/**
 * Carga el perfil del usuario desde la tabla usuarios
 * Solo se intenta UNA vez para evitar loops infinitos
 * @param {Object} user - Usuario de Supabase Auth
 * @returns {Promise<boolean>} true si se cargó el perfil, false si hay error
 */
async function cargarPerfilUsuario(user) {
    // Si ya intentamos cargar el perfil, no reintentar
    if (perfilCargado) {
        if (perfilError) {
            console.error('⚠️ Error anterior de perfil no resuelto:', perfilError);
            return false;
        }
        return true;
    }

    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        return false;
    }

    try {
        const { data: perfil, error: perfilErrorObj } = await clienteSupabase
            .from('usuarios')
            .select('nombre_completo, rol')
            .eq('email', user.email)
            .maybeSingle();

        // Marcar que intentamos cargar el perfil (independientemente del resultado)
        perfilCargado = true;

        if (perfilErrorObj) {
            console.error('❌ Error al obtener perfil:', perfilErrorObj);
            perfilError = perfilErrorObj;
            return false;
        }

        if (!perfil) {
            const err = `No se encontró perfil para el usuario: ${user.email}`;
            console.error('❌', err);
            perfilError = new Error(err);
            return false;
        }

        // Perfil cargado exitosamente
        usuarioActual = {
            email: user.email,
            nombre: perfil.nombre_completo,
            rol: perfil.rol
        };
        console.log('✅ Usuario actual configurado:', usuarioActual);
        perfilError = null; // Limpiar error anterior
        return true;
    } catch (error) {
        console.error('Exception al cargar perfil:', error);
        perfilCargado = true;
        perfilError = error;
        return false;
    }
}

/**
 * Verifica sesión y carga perfil.
 * REGLA CLAVE:
 * - Redirige a login.html SOLO si no hay sesión válida en Auth
 * - Errores de perfil NO causan redirección, solo alerta
 */
export async function verificarSesion() {
    // Paso 1: Validar que existe sesión en Supabase Auth
    const authData = await validarSesionAuth();
    if (!authData) {
        // No hay sesión válida -> redirigir a login
        if (window.location.pathname.split('/').pop() !== 'login.html') {
            window.location.href = 'login.html';
        }
        return false;
    }

    // Paso 2: Cargar perfil (solo una vez)
    const perfilOk = await cargarPerfilUsuario(authData.user);
    if (!perfilOk) {
        // Error de perfil, pero hay sesión válida
        // Mostrar error pero NO redirigir
        console.error('⚠️ El perfil no se pudo cargar, pero hay sesión activa');
        return false;
    }

    // Paso 3: Todo OK, actualizar UI
    actualizarHeaderUsuario();
    return true;
}

// ============================================
// ACTUALIZAR HEADER
// ============================================

export function actualizarHeaderUsuario() {
    const nombreElement = document.getElementById('userName');
    const roleElement = document.getElementById('userRole');

    if (nombreElement && usuarioActual) {
        nombreElement.textContent = usuarioActual.nombre;
    }

    if (roleElement && usuarioActual) {
        const rolTexto = usuarioActual.rol === 'admin' ? 'Administrador' : 'Tramitador de Siniestros';
        roleElement.textContent = rolTexto;
    }

    // Mostrar pestaña de administración solo para admins
    const tabAdmin = document.getElementById('tabAdmin');
    if (tabAdmin && usuarioActual && usuarioActual.rol === 'admin') {
        tabAdmin.style.display = 'block';
    }
}

// ============================================
// CERRAR SESIÓN
// ============================================

export async function cerrarSesion() {
    const clienteSupabase = getClienteSupabase();

    if (clienteSupabase) {
        await clienteSupabase.auth.signOut();
    }
    localStorage.removeItem('userSession');
    localStorage.removeItem('userProfile');
    resetPerfilState(); // Limpiar estado de perfil
    clearUserIdCache(); // Limpiar cache del userId
    if (window.location.pathname.split('/').pop() !== 'login.html') {
        window.location.href = 'login.html';
    }
}

// ============================================
// HELPERS DE PERMISOS
// ============================================

export function esAdmin() {
    return usuarioActual && usuarioActual.rol === 'admin';
}

export function tienePermiso(permisoRequerido) {
    if (!usuarioActual) return false;

    // Admin tiene todos los permisos
    if (usuarioActual.rol === 'admin') return true;

    // Tramitador tiene permisos básicos
    const permisosTramitador = ['ver_siniestros', 'crear_siniestros', 'editar_siniestros', 'enviar_mensajes', 'generar_reportes'];
    return permisosTramitador.includes(permisoRequerido);
}
