// ============================================
// NOTIFICACIONES.JS - Sistema de Notificaciones de Seguimiento
// ============================================
// Este módulo maneja:
// - Cargar notificaciones desde Supabase
// - Marcar como leídas
// - Snooze (posponer) notificaciones
// - Sincronización con siniestros
// - Contadores y badges

import { getClienteSupabase } from './supabase.js';
import { getUserId } from './auth.js';
import { calcularDiasTranscurridos } from './utils.js';

// ============================================
// ESTADO DE NOTIFICACIONES
// ============================================

let notificacionesActivas = [];
let contadorNoLeidas = 0;

// ============================================
// CARGAR NOTIFICACIONES
// ============================================

/**
 * Carga todas las notificaciones activas del usuario
 * (no leídas y no snoozed, o snoozed pero ya vencidas)
 * @returns {Object} { success, data, error }
 */
export async function cargarNotificaciones() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const supabase = getClienteSupabase();
        const ahora = new Date().toISOString();

        // Query con join a siniestros
        const { data, error } = await supabase
            .from('notificaciones_seguimiento')
            .select(`
                *,
                siniestros (
                    id,
                    numero,
                    asegurado,
                    telefono,
                    estado,
                    fecha,
                    tipo,
                    taller
                )
            `)
            .eq('user_id', userId)
            .or(`snoozed_hasta.is.null,snoozed_hasta.lt.${ahora}`)
            .order('nivel_urgencia', { ascending: false }) // urgente primero
            .order('created_at', { ascending: false }); // más recientes primero

        if (error) {
            console.error('❌ Error cargando notificaciones:', error);
            return { success: false, error: error.message };
        }

        // Filtrar notificaciones donde el siniestro no fue eliminado
        const notificacionesValidas = (data || []).filter(n => n.siniestros);

        // Enriquecer con días transcurridos
        const notificacionesEnriquecidas = notificacionesValidas.map(notif => ({
            ...notif,
            diasTranscurridos: calcularDiasTranscurridos(notif.siniestros.fecha)
        }));

        // Actualizar estado global
        notificacionesActivas = notificacionesEnriquecidas;
        contadorNoLeidas = notificacionesEnriquecidas.filter(n => !n.leida).length;

        console.log(`✅ Notificaciones cargadas: ${data.length} total, ${contadorNoLeidas} no leídas`);

        return {
            success: true,
            data: notificacionesEnriquecidas,
            contador: contadorNoLeidas,
            estadisticas: calcularEstadisticas(notificacionesEnriquecidas)
        };
    } catch (error) {
        console.error('❌ Error en cargarNotificaciones:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Calcula estadísticas de notificaciones por nivel
 * @param {Array} notificaciones - Array de notificaciones
 * @returns {Object} Estadísticas por nivel
 */
function calcularEstadisticas(notificaciones) {
    return {
        total: notificaciones.length,
        noLeidas: notificaciones.filter(n => !n.leida).length,
        urgente: notificaciones.filter(n => n.nivel_urgencia === 'urgente').length,
        importante: notificaciones.filter(n => n.nivel_urgencia === 'importante').length,
        atencion: notificaciones.filter(n => n.nivel_urgencia === 'atencion').length
    };
}

// ============================================
// MARCAR COMO LEÍDA
// ============================================

/**
 * Marca una notificación como leída
 * @param {number} notificacionId - ID de la notificación
 * @returns {Object} { success, data, error }
 */
export async function marcarNotificacionLeida(notificacionId) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const supabase = getClienteSupabase();

        const { data, error } = await supabase
            .from('notificaciones_seguimiento')
            .update({
                leida: true,
                updated_at: new Date().toISOString()
            })
            .eq('id', notificacionId)
            .eq('user_id', userId) // RLS extra check
            .select()
            .single();

        if (error) {
            console.error('❌ Error marcando notificación como leída:', error);
            return { success: false, error: error.message };
        }

        console.log(`✅ Notificación ${notificacionId} marcada como leída`);

        // Actualizar estado local
        const index = notificacionesActivas.findIndex(n => n.id === notificacionId);
        if (index !== -1) {
            notificacionesActivas[index].leida = true;
            contadorNoLeidas = notificacionesActivas.filter(n => !n.leida).length;
        }

        return { success: true, data, contador: contadorNoLeidas };
    } catch (error) {
        console.error('❌ Error en marcarNotificacionLeida:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Marca todas las notificaciones como leídas
 * @returns {Object} { success, count, error }
 */
export async function marcarTodasLeidas() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const supabase = getClienteSupabase();
        const ahora = new Date().toISOString();

        const { data, error } = await supabase
            .from('notificaciones_seguimiento')
            .update({
                leida: true,
                updated_at: ahora
            })
            .eq('user_id', userId)
            .eq('leida', false)
            .or(`snoozed_hasta.is.null,snoozed_hasta.lt.${ahora}`)
            .select();

        if (error) {
            console.error('❌ Error marcando todas como leídas:', error);
            return { success: false, error: error.message };
        }

        const count = data?.length || 0;
        console.log(`✅ ${count} notificaciones marcadas como leídas`);

        // Actualizar estado local
        notificacionesActivas.forEach(n => n.leida = true);
        contadorNoLeidas = 0;

        return { success: true, count, contador: 0 };
    } catch (error) {
        console.error('❌ Error en marcarTodasLeidas:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SNOOZE (POSPONER)
// ============================================

/**
 * Pospone una notificación por X horas
 * @param {number} notificacionId - ID de la notificación
 * @param {number} horas - Horas a posponer (default: 24)
 * @returns {Object} { success, data, error }
 */
export async function snoozeNotificacion(notificacionId, horas = 24) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const supabase = getClienteSupabase();

        // Calcular fecha de snooze
        const snoozedHasta = new Date();
        snoozedHasta.setHours(snoozedHasta.getHours() + horas);

        const { data, error } = await supabase
            .from('notificaciones_seguimiento')
            .update({
                snoozed_hasta: snoozedHasta.toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', notificacionId)
            .eq('user_id', userId) // RLS extra check
            .select()
            .single();

        if (error) {
            console.error('❌ Error en snooze:', error);
            return { success: false, error: error.message };
        }

        console.log(`✅ Notificación ${notificacionId} pospuesta por ${horas}h hasta ${snoozedHasta.toLocaleString('es-PY')}`);

        // Remover de estado local (ya no está activa)
        notificacionesActivas = notificacionesActivas.filter(n => n.id !== notificacionId);
        contadorNoLeidas = notificacionesActivas.filter(n => !n.leida).length;

        return {
            success: true,
            data,
            contador: contadorNoLeidas,
            snoozedHasta: snoozedHasta.toISOString(),
            horasPospuestas: horas
        };
    } catch (error) {
        console.error('❌ Error en snoozeNotificacion:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// SINCRONIZACIÓN
// ============================================

/**
 * Sincroniza notificaciones con el estado actual de los siniestros
 * Llama a la función SQL que crea/actualiza/elimina notificaciones
 * @returns {Object} { success, stats, error }
 */
export async function sincronizarNotificaciones() {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const supabase = getClienteSupabase();

        // Llamar a la función SQL
        const { data, error } = await supabase
            .rpc('sincronizar_notificaciones_seguimiento', {
                p_user_id: userId
            });

        if (error) {
            console.error('❌ Error sincronizando notificaciones:', error);
            return { success: false, error: error.message };
        }

        const stats = data || { total_creadas: 0, total_actualizadas: 0, total_eliminadas: 0 };

        console.log(`✅ Sincronización completada:`, stats);

        return { success: true, stats };
    } catch (error) {
        console.error('❌ Error en sincronizarNotificaciones:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ELIMINAR NOTIFICACIÓN
// ============================================

/**
 * Elimina una notificación permanentemente
 * @param {number} notificacionId - ID de la notificación
 * @returns {Object} { success, error }
 */
export async function eliminarNotificacion(notificacionId) {
    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'Usuario no autenticado' };
        }

        const supabase = getClienteSupabase();

        const { error } = await supabase
            .from('notificaciones_seguimiento')
            .delete()
            .eq('id', notificacionId)
            .eq('user_id', userId); // RLS extra check

        if (error) {
            console.error('❌ Error eliminando notificación:', error);
            return { success: false, error: error.message };
        }

        console.log(`✅ Notificación ${notificacionId} eliminada`);

        // Actualizar estado local
        notificacionesActivas = notificacionesActivas.filter(n => n.id !== notificacionId);
        contadorNoLeidas = notificacionesActivas.filter(n => !n.leida).length;

        return { success: true, contador: contadorNoLeidas };
    } catch (error) {
        console.error('❌ Error en eliminarNotificacion:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// GETTERS
// ============================================

/**
 * Obtiene el contador de notificaciones no leídas
 * @returns {number}
 */
export function getContadorNoLeidas() {
    return contadorNoLeidas;
}

/**
 * Obtiene todas las notificaciones activas (del estado local)
 * @returns {Array}
 */
export function getNotificacionesActivas() {
    return notificacionesActivas;
}

/**
 * Obtiene una notificación por ID
 * @param {number} notificacionId - ID de la notificación
 * @returns {Object|null}
 */
export function getNotificacionById(notificacionId) {
    return notificacionesActivas.find(n => n.id === notificacionId) || null;
}

// ============================================
// OPCIONES DE SNOOZE
// ============================================

export const OPCIONES_SNOOZE = [
    { texto: '1 hora', horas: 1, icono: '⏱️' },
    { texto: '4 horas', horas: 4, icono: '⏰' },
    { texto: '1 día', horas: 24, icono: '📅' },
    { texto: '3 días', horas: 72, icono: '🗓️' },
    { texto: '1 semana', horas: 168, icono: '📆' }
];

// ============================================
// HELPERS
// ============================================

/**
 * Obtiene el icono según nivel de urgencia
 * @param {string} nivel - Nivel de urgencia
 * @returns {string} Emoji del icono
 */
export function getIconoNivel(nivel) {
    const iconos = {
        urgente: '🔴',
        importante: '⚠️',
        atencion: '📋'
    };
    return iconos[nivel] || '📋';
}

/**
 * Obtiene el color según nivel de urgencia
 * @param {string} nivel - Nivel de urgencia
 * @returns {Object} { bg, border }
 */
export function getColorNivel(nivel) {
    const colores = {
        urgente: { bg: '#ffe6e6', border: '#dc3545', text: '#721c24' },
        importante: { bg: '#ffe6cc', border: '#ff9800', text: '#7a4b00' },
        atencion: { bg: '#fff3cd', border: '#ffc107', text: '#856404' }
    };
    return colores[nivel] || colores.atencion;
}
