// ============================================
// REALTIME.JS - Notificaciones en Tiempo Real
// ============================================
// Este módulo maneja:
// - Suscripción a cambios en tiempo real vía Supabase Realtime
// - Notificaciones de nuevos siniestros
// - Notificaciones de cambios de estado
// - Notificaciones de ediciones
// - Sistema de toasts para alertas

import { getClienteSupabase } from './supabase.js';
import { getUserId, getUsuarioActual } from './auth.js';
import { mostrarAlerta } from './ui.js';

// Canal de suscripción
let realtimeChannel = null;

// Estado de conexión
let isConnected = false;

// Contador de notificaciones
let notificationCount = 0;

// ============================================
// INICIALIZACIÓN
// ============================================

/**
 * Inicia el sistema de notificaciones en tiempo real
 * Se suscribe a cambios en la tabla siniestros
 */
export async function inicializarRealtimeNotifications() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        console.warn('⚠️ Supabase no inicializado, no se pueden activar notificaciones en tiempo real');
        return { success: false, error: 'Supabase no inicializado' };
    }

    const userId = await getUserId();
    if (!userId) {
        console.warn('⚠️ Usuario no autenticado, no se pueden activar notificaciones');
        return { success: false, error: 'Usuario no autenticado' };
    }

    try {
        // Crear canal único para este usuario
        const channelName = `siniestros-realtime-${userId}`;

        realtimeChannel = clienteSupabase
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'siniestros',
                    filter: `user_id=eq.${userId}`
                },
                (payload) => {
                    handleRealtimeChange(payload);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    isConnected = true;
                    console.log('✅ Notificaciones en tiempo real activadas');
                    mostrarIndicadorConexion(true);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    isConnected = false;
                    console.error('❌ Error en canal de notificaciones:', status);
                    mostrarIndicadorConexion(false);
                }
            });

        // Solicitar permiso para notificaciones del navegador
        if ('Notification' in window && Notification.permission === 'default') {
            await Notification.requestPermission();
        }

        return { success: true };
    } catch (error) {
        console.error('Error inicializando notificaciones en tiempo real:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Detiene el sistema de notificaciones
 */
export async function detenerRealtimeNotifications() {
    if (realtimeChannel) {
        const clienteSupabase = getClienteSupabase();
        await clienteSupabase.removeChannel(realtimeChannel);
        realtimeChannel = null;
        isConnected = false;
        mostrarIndicadorConexion(false);
        console.log('🔌 Notificaciones en tiempo real desactivadas');
    }
}

/**
 * Verifica si está conectado
 */
export function isRealtimeConnected() {
    return isConnected;
}

// ============================================
// HANDLER DE CAMBIOS
// ============================================

/**
 * Maneja cambios recibidos por Supabase Realtime
 * @param {Object} payload - { eventType, new, old, table, schema }
 */
function handleRealtimeChange(payload) {
    const { eventType, new: newRecord, old: oldRecord } = payload;

    console.log(`🔔 Cambio detectado: ${eventType}`, payload);

    // Verificar que no sea el usuario actual quien hizo el cambio
    // (evitar notificarse a uno mismo)
    const usuarioActual = getUsuarioActual();

    switch (eventType) {
        case 'INSERT':
            notificarNuevoSiniestro(newRecord);
            break;
        case 'UPDATE':
            notificarCambioSiniestro(newRecord, oldRecord);
            break;
        case 'DELETE':
            notificarEliminacionSiniestro(oldRecord);
            break;
    }

    // Incrementar contador
    notificationCount++;
    actualizarBadgeNotificaciones();

    // Emitir evento personalizado para que otros módulos reaccionen
    window.dispatchEvent(new CustomEvent('siniestroChanged', {
        detail: { eventType, newRecord, oldRecord }
    }));
}

// ============================================
// NOTIFICACIONES ESPECÍFICAS
// ============================================

/**
 * Notifica cuando se crea un nuevo siniestro
 */
function notificarNuevoSiniestro(siniestro) {
    const mensaje = `🆕 Nuevo siniestro creado: ${siniestro.numero} - ${siniestro.asegurado}`;

    // Toast
    mostrarAlerta('info', mensaje, 5000);

    // Notificación del navegador
    mostrarNotificacionNavegador('Nuevo Siniestro', mensaje);

    // Sonido (opcional)
    reproducirSonidoNotificacion();
}

/**
 * Notifica cuando cambia un siniestro
 */
function notificarCambioSiniestro(nuevo, antiguo) {
    // Detectar qué cambió
    const cambios = [];

    if (nuevo.estado !== antiguo.estado) {
        const textoEstado = obtenerTextoEstado(nuevo.estado);
        cambios.push(`Estado → ${textoEstado}`);
    }

    if (nuevo.taller !== antiguo.taller && nuevo.taller) {
        cambios.push(`Taller → ${nuevo.taller}`);
    }

    if (nuevo.monto !== antiguo.monto) {
        cambios.push(`Monto → ${nuevo.monto}`);
    }

    if (cambios.length === 0) {
        cambios.push('Información actualizada');
    }

    const mensaje = `✏️ ${nuevo.numero} - ${nuevo.asegurado}: ${cambios.join(', ')}`;

    // Toast
    mostrarAlerta('info', mensaje, 5000);

    // Notificación del navegador
    mostrarNotificacionNavegador('Siniestro Actualizado', mensaje);
}

/**
 * Notifica cuando se elimina un siniestro
 */
function notificarEliminacionSiniestro(siniestro) {
    const mensaje = `🗑️ Siniestro eliminado: ${siniestro.numero} - ${siniestro.asegurado}`;

    // Toast
    mostrarAlerta('warning', mensaje, 4000);

    // Notificación del navegador
    mostrarNotificacionNavegador('Siniestro Eliminado', mensaje);
}

// ============================================
// HELPERS
// ============================================

/**
 * Muestra notificación nativa del navegador
 */
function mostrarNotificacionNavegador(titulo, mensaje) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(titulo, {
            body: mensaje,
            icon: '/logo/logo.png',
            badge: '/logo/logo.png',
            tag: 'aseguradora-tajy',
            requireInteraction: false,
            silent: false
        });
    }
}

/**
 * Reproduce sonido de notificación
 */
function reproducirSonidoNotificacion() {
    // Usar un sonido del sistema (beep)
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZQAIJT6fnv5ZiHQM/mt3ux3IpBSp+zPDejzgHE2S56+ibUQ0LTKXh8bllHAc4kdfy0IQqBSh5yvDUfzgGE2O56uSYTgwJUKjl8bZnHQQ2jtjvzX0sBS5/zPHYiDUIFme75ueiVhEMR5zi8L9qIwU2jdny1IY0BxpmvOvknVINClGo5fCzZRwENIvX8M59LgUxgs/x1oc0BxtnvO3jm08NCk6l4vG4aCAEMYrZ89CCLgUrfs/w1oY2Bhxow+3knEwLCE6l4PG6aCEDMIrZ8tGCLwUvf8/w1YU2Bx1nvO3joU0NCkuk4PG7ayADLojY8s+CMAUxgdDx14Y2Bhxow+zjnEsKCU2k3vG7bCADLojY8s+DMQW0gNDw1YM0BRpfu+3jo1ALDCGI1vLOgzEFMYLQ8NSCMgUbZrvt46FMDAZHNO3dmUkND1Kl3/DEbCAEL4bX88t9LgUvgM/v04I');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignorar errores si no se puede reproducir
    } catch (e) {
        // Silenciosamente fallar
    }
}

/**
 * Obtiene texto legible del estado
 */
function obtenerTextoEstado(estado) {
    const textos = {
        'pendiente': 'Pendiente',
        'proceso': 'En Proceso',
        'aprobado': 'Aprobado',
        'taller': 'Liquidado',
        'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
}

/**
 * Actualiza badge de contador de notificaciones
 */
function actualizarBadgeNotificaciones() {
    const badge = document.getElementById('badgeNotificacionesRealtime');
    if (badge) {
        badge.textContent = notificationCount;
        badge.style.display = notificationCount > 0 ? 'inline-block' : 'none';
    }
}

/**
 * Resetea contador de notificaciones
 */
export function resetearContadorNotificaciones() {
    notificationCount = 0;
    actualizarBadgeNotificaciones();
}

/**
 * Muestra indicador de conexión en la UI
 */
function mostrarIndicadorConexion(conectado) {
    const indicador = document.getElementById('indicadorRealtimeConexion');
    if (indicador) {
        if (conectado) {
            indicador.innerHTML = '🟢 En vivo';
            indicador.className = 'realtime-status realtime-connected';
            indicador.title = 'Notificaciones en tiempo real activas';
        } else {
            indicador.innerHTML = '🔴 Offline';
            indicador.className = 'realtime-status realtime-disconnected';
            indicador.title = 'Notificaciones en tiempo real desconectadas';
        }
    }
}

// ============================================
// AUTO-RELOAD DE TABLA
// ============================================

/**
 * Escucha cambios y recarga automáticamente la tabla si es necesario
 */
export function habilitarAutoReloadTabla(handlerCargarSiniestros) {
    window.addEventListener('siniestroChanged', async (event) => {
        const { eventType } = event.detail;

        // Si estamos en el tab de siniestros, recargar la tabla
        const tabSiniestros = document.getElementById('siniestros');
        if (tabSiniestros && tabSiniestros.classList.contains('tab-content-active')) {
            console.log('♻️ Auto-recargando tabla por cambio en tiempo real...');

            // Esperar un momento para que la DB se actualice
            await new Promise(resolve => setTimeout(resolve, 500));

            // Recargar la tabla
            if (typeof handlerCargarSiniestros === 'function') {
                await handlerCargarSiniestros(0, false);
            }
        }
    });
}
