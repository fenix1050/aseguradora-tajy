// ============================================
// AUTH.JS - Login, Logout, Roles, Sesión
// ============================================

import { getClienteSupabase } from './supabase.js';

// ============================================
// ESTADO DEL USUARIO
// ============================================

let usuarioActual = null;

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
 * Obtiene el UUID del usuario autenticado desde Supabase Auth
 * Esta es la fuente única de verdad para RLS
 * @returns {Promise<string|null>} UUID del usuario o null si no hay sesión
 */
export async function getUserId() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) return null;

    try {
        const { data: { user } } = await clienteSupabase.auth.getUser();
        return user ? user.id : null;
    } catch (e) {
        console.error('Error obteniendo user ID:', e);
        return null;
    }
}

// ============================================
// VERIFICACIÓN DE SESIÓN
// ============================================

export async function verificarSesion() {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        console.warn('⚠️ Supabase no inicializado, saltando verificación de sesión');
        return false;
    }

    try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error || !session) {
            console.log('❌ No hay sesión activa, redirigiendo al login');
            window.location.href = 'login.html';
            return false;
        }

        // Obtener información del usuario
        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (!user) {
            console.log('❌ No se pudo obtener usuario, redirigiendo al login');
            window.location.href = 'login.html';
            return false;
        }

        // Obtener perfil del usuario desde la tabla usuarios
        try {
            const { data: perfil, error: perfilError } = await clienteSupabase
                .from('usuarios')
                .select('nombre_completo, rol')
                .eq('email', user.email)
                .single();

            console.log('📊 Perfil obtenido de la base de datos:', perfil);
            console.log('❌ Error al obtener perfil:', perfilError);

            if (!perfilError && perfil) {
                usuarioActual = {
                    email: user.email,
                    nombre: perfil.nombre_completo,
                    rol: perfil.rol
                };
                console.log('✅ Usuario actual configurado:', usuarioActual);
            } else {
                console.warn('⚠️ No se encontró perfil, usando valores por defecto');
                // Si no hay perfil, usar email como nombre
                usuarioActual = {
                    email: user.email,
                    nombre: user.email.split('@')[0],
                    rol: 'tramitador'
                };
            }
        } catch (e) {
            console.error('❌ Error en catch al obtener perfil:', e);
            // Si no existe la tabla usuarios, usar email
            usuarioActual = {
                email: user.email,
                nombre: user.email.split('@')[0],
                rol: 'tramitador'
            };
        }

        // Actualizar header con nombre del usuario
        actualizarHeaderUsuario();

        return true;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        window.location.href = 'login.html';
        return false;
    }
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
    usuarioActual = null;
    window.location.href = 'login.html';
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
