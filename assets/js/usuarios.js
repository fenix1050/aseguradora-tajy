// ============================================
// USUARIOS.JS - Administración de Usuarios (Solo Admin)
// ============================================
// Este módulo maneja:
// - CRUD de usuarios
// - Cambio de roles
// NO maneja DOM ni UI directamente

import { getClienteSupabase } from './supabase.js';
import { getUsuarioActual } from './auth.js';

// ============================================
// VERIFICACIÓN DE PERMISOS
// ============================================

function verificarPermisoAdmin() {
    const usuarioActual = getUsuarioActual();
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        return { permitido: false, error: 'No tienes permisos para esta acción' };
    }
    return { permitido: true };
}

// ============================================
// CARGAR USUARIOS
// ============================================

/**
 * Carga todos los usuarios
 * @returns {Object} { success, data, error }
 */
export async function cargarUsuarios() {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no está inicializado' };
    }

    const permiso = verificarPermisoAdmin();
    if (!permiso.permitido) {
        return { success: false, error: permiso.error };
    }

    try {
        const { data, error } = await clienteSupabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        console.log(`✅ ${data?.length || 0} usuarios cargados`);
        return { success: true, data: data || [] };
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// CREAR USUARIO
// ============================================

/**
 * Crea un nuevo usuario
 * @param {Object} datos - { email, password, nombre, rol }
 * @returns {Object} { success, data, error }
 */
export async function crearUsuario(datos) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'No hay conexión con la base de datos' };
    }

    const permiso = verificarPermisoAdmin();
    if (!permiso.permitido) {
        return { success: false, error: permiso.error };
    }

    try {
        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await clienteSupabase.auth.signUp({
            email: datos.email,
            password: datos.password,
            options: {
                data: {
                    nombre_completo: datos.nombre
                }
            }
        });

        if (authError) throw authError;

        // Insertar en la tabla usuarios
        const { error: dbError } = await clienteSupabase
            .from('usuarios')
            .insert([{
                email: datos.email,
                nombre_completo: datos.nombre,
                rol: datos.rol
            }]);

        if (dbError) throw dbError;

        console.log('✅ Usuario creado:', datos.email);
        return { success: true, data: authData };
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.message.includes('already registered')) {
            return { success: false, error: 'Este email ya está registrado' };
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// CAMBIAR ROL
// ============================================

/**
 * Cambia el rol de un usuario
 * @param {string} userId - ID del usuario
 * @param {string} rolActual - Rol actual ('admin' o 'tramitador')
 * @returns {Object} { success, nuevoRol, error }
 */
export async function cambiarRolUsuario(userId, rolActual) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'No hay conexión con la base de datos' };
    }

    const permiso = verificarPermisoAdmin();
    if (!permiso.permitido) {
        return { success: false, error: permiso.error };
    }

    const nuevoRol = rolActual === 'admin' ? 'tramitador' : 'admin';

    try {
        const { error } = await clienteSupabase
            .from('usuarios')
            .update({ rol: nuevoRol })
            .eq('id', userId);

        if (error) throw error;

        console.log(`✅ Rol actualizado a ${nuevoRol}`);
        return { success: true, nuevoRol };
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ELIMINAR USUARIO
// ============================================

/**
 * Elimina un usuario
 * @param {string} userId - ID del usuario
 * @returns {Object} { success, error }
 */
export async function eliminarUsuario(userId) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'No hay conexión con la base de datos' };
    }

    const permiso = verificarPermisoAdmin();
    if (!permiso.permitido) {
        return { success: false, error: permiso.error };
    }

    try {
        const { error } = await clienteSupabase
            .from('usuarios')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        console.log('✅ Usuario eliminado');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// VERIFICAR SI ES USUARIO ACTUAL
// ============================================

/**
 * Verifica si un email es el del usuario actual
 * @param {string} email - Email a verificar
 * @returns {boolean}
 */
export function esUsuarioActual(email) {
    const usuarioActual = getUsuarioActual();
    return usuarioActual && usuarioActual.email === email;
}
