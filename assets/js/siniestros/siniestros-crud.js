// ============================================
// SINIESTROS-CRUD.JS - Operaciones CRUD
// ============================================
// Este módulo maneja:
// - Crear siniestros
// - Actualizar siniestros
// - Eliminar siniestros
// - Obtener siniestros por ID
// - Verificación de duplicados
// - Precarga de cache

import { getClienteSupabase } from '../supabase.js';
import { getUserId } from '../auth.js';
import { cacheManager } from '../utils.js';
import { invalidarCacheAsegurados } from './siniestros-search.js';

// ============================================
// HELPERS
// ============================================

/**
 * Invalida el cache de siniestros
 * Se llama cuando hay cambios (crear, editar, eliminar)
 */
export function invalidarCacheSiniestros() {
    cacheManager.invalidate('siniestros_');
}


// ============================================
// BÚSQUEDA POR ID
// ============================================

/**
 * Busca siniestro por ID con fallback a Supabase + cache
 * 1. Busca en array actual (página cargada)
 * 2. Busca en cache en memoria
 * 3. Fallback a Supabase si no encontrado
 * @param {number} id - ID del siniestro
 * @param {Array} siniestrosActuales - Array de siniestros cargados
 * @returns {Promise<Object|null>} Datos del siniestro o null
 */
export async function getSiniestroByIdWithFallback(id, siniestrosActuales = []) {
    // 1. Buscar en array actual (comportamiento rápido)
    let siniestro = siniestrosActuales.find(s => s.id === id);
    if (siniestro) return siniestro;

    // 2. Buscar en cache en memoria
    const cacheKey = `siniestro_id_${id}`;
    siniestro = cacheManager.get(cacheKey);
    if (siniestro) return siniestro;

    // 3. Fallback a Supabase
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) return null;

    const userId = await getUserId();
    if (!userId) return null;

    try {
        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!error && data) {
            // Guardar en cache
            cacheManager.set(cacheKey, data);
            return data;
        }
    } catch (e) {
        console.error('Error en fallback a Supabase:', e);
    }

    return null;
}

/**
 * Precarga IDs de siniestros en cache individual
 * Optimización: aprovecha datos ya cargados para evitar queries futuras
 * @param {Array<Object>} siniestros - Array de siniestros a precachear
 * @returns {number} Cantidad de IDs cacheados
 */
export function prewarmCacheIds(siniestros) {
    if (!Array.isArray(siniestros) || siniestros.length === 0) {
        return 0;
    }

    let cacheados = 0;

    try {
        siniestros.forEach(siniestro => {
            if (siniestro && siniestro.id) {
                const cacheKey = `siniestro_id_${siniestro.id}`;
                // Solo cachear si NO existe ya (respeta TTL)
                if (!cacheManager.get(cacheKey)) {
                    cacheManager.set(cacheKey, siniestro);
                    cacheados++;
                }
            }
        });
    } catch (e) {
        console.error('Error en prewarmCacheIds:', e);
    }

    return cacheados;
}

// ============================================
// CREAR
// ============================================

/**
 * Verifica si existe un siniestro con el mismo número
 * @param {string} numero - Número de siniestro
 * @returns {Promise<boolean>} True si existe duplicado
 */
async function verificarDuplicado(numero) {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) return false;

    const userId = await getUserId();
    if (!userId) return false;

    const { data } = await clienteSupabase
        .from('siniestros')
        .select('id')
        .eq('numero', numero)
        .eq('user_id', userId)
        .limit(1);

    return data && data.length > 0;
}

/**
 * Crea un nuevo siniestro
 * @param {Object} datos - Datos del formulario
 * @returns {Object} { success, data, error, duplicado }
 */
export async function crearSiniestro(datos) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'No hay conexión con la base de datos' };
    }

    // Obtener user_id del usuario autenticado
    const userId = await getUserId();
    if (!userId) {
        return { success: false, error: 'No hay usuario autenticado' };
    }

    // Verificar duplicado
    const existe = await verificarDuplicado(datos.numero);
    if (existe) {
        return { success: false, error: 'Ya existe un siniestro con ese número', duplicado: true };
    }

    try {
        // Obtener fecha actual en zona horaria de Paraguay (America/Asuncion)
        const ahora = new Date();
        const fechaActual = ahora.toLocaleDateString('en-CA', {
            timeZone: 'America/Asuncion',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        }); // Formato: YYYY-MM-DD

        const nuevoSiniestro = {
            numero: datos.numero,
            asegurado: datos.asegurado,
            sexo: datos.sexo || '',
            telefono: datos.telefono,
            fecha: fechaActual,
            tipo: '',
            estado: 'pendiente',
            monto: datos.siniestro_total || 'No',
            poliza: '',
            taller: '',
            observaciones: datos.observaciones || '',
            user_id: userId
        };

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .insert([nuevoSiniestro])
            .select();

        if (error) throw error;

        // Invalidar caches después de crear
        invalidarCacheSiniestros();
        invalidarCacheAsegurados();

        console.log('✅ Siniestro creado:', data[0]);
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error al crear siniestro:', error);
        if (error.code === '23505') {
            return { success: false, error: 'Ya existe un siniestro con ese número', duplicado: true };
        }
        return { success: false, error: error.message };
    }
}

// ============================================
// ACTUALIZAR
// ============================================

/**
 * Actualiza un siniestro existente
 * @param {number} id - ID del siniestro
 * @param {Object} datos - Datos actualizados
 * @returns {Object} { success, data, error }
 */
export async function actualizarSiniestro(id, datos) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'No hay conexión con la base de datos' };
    }

    try {
        const datosActualizados = {
            numero: datos.numero,
            asegurado: datos.asegurado,
            telefono: datos.telefono,
            sexo: datos.sexo || '',
            estado: datos.estado,
            monto: datos.monto,
            taller: datos.taller || '',
            observaciones: datos.observaciones || ''
        };

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .update(datosActualizados)
            .eq('id', id)
            .select();

        if (error) throw error;

        // Invalidar caches después de actualizar
        invalidarCacheSiniestros();
        // Si cambió el nombre del asegurado, invalidar búsquedas fuzzy
        if (data && data[0]) {
            invalidarCacheAsegurados();
        }
        cacheManager.invalidate(`siniestro_id_${id}`);

        console.log('✅ Siniestro actualizado:', data[0]);
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error al actualizar siniestro:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ELIMINAR
// ============================================

/**
 * Elimina un siniestro
 * @param {number} id - ID del siniestro
 * @returns {Object} { success, error }
 */
export async function eliminarSiniestro(id) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'No hay conexión con la base de datos' };
    }

    try {
        const { error } = await clienteSupabase
            .from('siniestros')
            .delete()
            .eq('id', id);

        if (error) throw error;

        // Invalidar caches después de eliminar
        invalidarCacheSiniestros();
        invalidarCacheAsegurados();
        cacheManager.invalidate(`siniestro_id_${id}`);

        console.log('✅ Siniestro eliminado');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar siniestro:', error);
        return { success: false, error: error.message };
    }
}
