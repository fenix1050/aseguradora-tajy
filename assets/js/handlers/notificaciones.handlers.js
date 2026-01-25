// ============================================
// HANDLERS DE NOTIFICACIONES
// ============================================

import {
    cargarNotificaciones,
    marcarNotificacionLeida,
    marcarTodasLeidas,
    snoozeNotificacion,
    eliminarNotificacion,
    sincronizarNotificaciones,
    getContadorNoLeidas,
    getNotificacionesActivas,
    OPCIONES_SNOOZE,
    getIconoNivel,
    getColorNivel
} from '../notificaciones.js';
import { mostrarAlerta } from '../ui.js';
import { escapeHtml, formatearFecha } from '../utils.js';

// ============================================
// TOGGLE PANEL
// ============================================

/**
 * Abre/cierra el panel de notificaciones
 */
export async function togglePanelNotificaciones() {
    const panel = document.getElementById('panelNotificaciones');

    if (!panel) {
        console.error('❌ Panel de notificaciones no encontrado');
        return;
    }

    const estaVisible = !panel.classList.contains('oculto');

    if (estaVisible) {
        // Cerrar panel
        panel.classList.add('oculto');
    } else {
        // Abrir panel - cargar notificaciones frescas
        await handleCargarNotificaciones();
        panel.classList.remove('oculto');
    }
}

/**
 * Cierra el panel de notificaciones
 */
export function cerrarPanelNotificaciones() {
    const panel = document.getElementById('panelNotificaciones');
    if (panel) {
        panel.classList.add('oculto');
    }
}

// ============================================
// CARGAR Y RENDERIZAR
// ============================================

/**
 * Carga notificaciones y actualiza el UI
 */
export async function handleCargarNotificaciones() {
    try {
        const resultado = await cargarNotificaciones();

        if (!resultado.success) {
            console.error('❌ Error cargando notificaciones:', resultado.error);
            mostrarAlerta('error', 'Error al cargar notificaciones');
            return;
        }

        // Actualizar badge contador
        actualizarBadgeContador(resultado.contador);

        // Actualizar texto contador en panel
        const textoContador = document.getElementById('textoContadorNotif');
        if (textoContador) {
            const stats = resultado.estadisticas;
            if (stats.total === 0) {
                textoContador.textContent = 'No hay notificaciones';
            } else if (stats.noLeidas === 0) {
                textoContador.textContent = `${stats.total} notificaciones (todas leídas)`;
            } else {
                textoContador.textContent = `${stats.noLeidas} sin leer de ${stats.total} total`;
            }
        }

        // Renderizar lista de notificaciones
        renderizarListaNotificaciones(resultado.data);

        console.log(`✅ ${resultado.data.length} notificaciones cargadas`);
    } catch (error) {
        console.error('❌ Error en handleCargarNotificaciones:', error);
        mostrarAlerta('error', 'Error al cargar notificaciones');
    }
}

/**
 * Actualiza el badge contador de notificaciones
 * @param {number} contador - Número de notificaciones no leídas
 */
function actualizarBadgeContador(contador) {
    const badgeContador = document.getElementById('badgeContadorNotif');

    if (!badgeContador) return;

    if (contador > 0) {
        badgeContador.textContent = contador > 99 ? '99+' : contador;
        badgeContador.style.display = 'flex';
    } else {
        badgeContador.style.display = 'none';
    }
}

/**
 * Renderiza la lista de notificaciones en el panel
 * @param {Array} notificaciones - Array de notificaciones
 */
function renderizarListaNotificaciones(notificaciones) {
    const listaContainer = document.getElementById('listaNotificaciones');

    if (!listaContainer) {
        console.error('❌ Container de lista no encontrado');
        return;
    }

    // Sin notificaciones
    if (notificaciones.length === 0) {
        listaContainer.innerHTML = `
            <div class="sin-notificaciones">
                <span class="icono-grande">✅</span>
                <p><strong>No hay seguimientos pendientes</strong></p>
                <p style="font-size: 0.9em; color: #666; margin-top: 5px;">
                    ¡Buen trabajo! Todos los siniestros están al día.
                </p>
            </div>
        `;
        return;
    }

    // Renderizar cada notificación
    listaContainer.innerHTML = notificaciones.map(notif => {
        const siniestro = notif.siniestros;
        const icono = getIconoNivel(notif.nivel_urgencia);
        const colores = getColorNivel(notif.nivel_urgencia);
        const tiempoRelativo = formatearTiempoRelativo(notif.created_at);

        const claseLeida = notif.leida ? 'leida' : 'no-leida';

        return `
            <div class="notificacion ${notif.nivel_urgencia} ${claseLeida}"
                 data-id="${notif.id}"
                 data-siniestro-id="${siniestro.id}"
                 style="border-left: 4px solid ${colores.border};">
                <div class="notif-header">
                    <span class="notif-icono">${icono}</span>
                    <span class="notif-nivel">${getNombreNivel(notif.nivel_urgencia)}</span>
                    <span class="notif-tiempo">${escapeHtml(tiempoRelativo)}</span>
                </div>
                <div class="notif-contenido">
                    <strong>${escapeHtml(siniestro.numero)}</strong>
                    <p>${escapeHtml(siniestro.asegurado)}</p>
                    <p class="notif-detalle">
                        <span>📞 ${escapeHtml(siniestro.telefono)}</span>
                        <span>• ${notif.diasTranscurridos} días sin actualización</span>
                    </p>
                    ${siniestro.taller ? `<p class="notif-detalle">🔧 ${escapeHtml(siniestro.taller)}</p>` : ''}
                </div>
                <div class="notif-acciones">
                    <button class="btn-icono btn-editar-notif"
                            data-siniestro-id="${siniestro.id}"
                            title="Editar siniestro">
                        ✏️ Editar
                    </button>
                    <button class="btn-icono btn-whatsapp-notif"
                            data-siniestro-id="${siniestro.id}"
                            title="Enviar WhatsApp">
                        💬 WhatsApp
                    </button>
                    <button class="btn-icono btn-snooze-notif"
                            data-notif-id="${notif.id}"
                            title="Posponer">
                        ⏰ Posponer
                    </button>
                    ${!notif.leida ? `
                        <button class="btn-icono btn-marcar-leida"
                                data-notif-id="${notif.id}"
                                title="Marcar leída">
                            ✓
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');

    // Agregar event listeners
    configurarEventListenersNotificaciones();
}

/**
 * Formatea tiempo relativo (hace X tiempo)
 * @param {string} fecha - Fecha ISO
 * @returns {string} Texto formateado
 */
function formatearTiempoRelativo(fecha) {
    const ahora = new Date();
    const entonces = new Date(fecha);
    const diffMs = ahora - entonces;
    const diffMinutos = Math.floor(diffMs / 60000);

    if (diffMinutos < 1) return 'Ahora';
    if (diffMinutos < 60) return `Hace ${diffMinutos} min`;

    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) return `Hace ${diffHoras}h`;

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 7) return `Hace ${diffDias}d`;

    const diffSemanas = Math.floor(diffDias / 7);
    return `Hace ${diffSemanas}sem`;
}

/**
 * Obtiene nombre legible del nivel
 * @param {string} nivel - Nivel de urgencia
 * @returns {string}
 */
function getNombreNivel(nivel) {
    const nombres = {
        urgente: 'Urgente',
        importante: 'Importante',
        atencion: 'Atención'
    };
    return nombres[nivel] || nivel;
}

// ============================================
// MARCAR COMO LEÍDA
// ============================================

/**
 * Marca una notificación como leída
 * @param {number} notifId - ID de la notificación
 */
export async function handleMarcarLeida(notifId) {
    try {
        const resultado = await marcarNotificacionLeida(notifId);

        if (!resultado.success) {
            mostrarAlerta('error', 'Error al marcar como leída');
            return;
        }

        // Actualizar badge
        actualizarBadgeContador(resultado.contador);

        // Actualizar visualmente la notificación
        const notifElement = document.querySelector(`.notificacion[data-id="${notifId}"]`);
        if (notifElement) {
            notifElement.classList.remove('no-leida');
            notifElement.classList.add('leida');

            // Remover botón de marcar leída
            const btnMarcar = notifElement.querySelector('.btn-marcar-leida');
            if (btnMarcar) btnMarcar.remove();
        }

        console.log(`✅ Notificación ${notifId} marcada como leída`);
    } catch (error) {
        console.error('❌ Error en handleMarcarLeida:', error);
        mostrarAlerta('error', 'Error al marcar como leída');
    }
}

/**
 * Marca todas las notificaciones como leídas
 */
export async function handleMarcarTodasLeidas() {
    try {
        const resultado = await marcarTodasLeidas();

        if (!resultado.success) {
            mostrarAlerta('error', 'Error al marcar todas como leídas');
            return;
        }

        // Actualizar badge
        actualizarBadgeContador(0);

        // Actualizar texto contador
        const textoContador = document.getElementById('textoContadorNotif');
        if (textoContador) {
            const totalNotifs = document.querySelectorAll('.notificacion').length;
            if (totalNotifs > 0) {
                textoContador.textContent = `${totalNotifs} notificaciones (todas leídas)`;
            } else {
                textoContador.textContent = 'No hay notificaciones';
            }
        }

        // Actualizar visualmente todas las notificaciones
        document.querySelectorAll('.notificacion.no-leida').forEach(notif => {
            notif.classList.remove('no-leida');
            notif.classList.add('leida');

            const btnMarcar = notif.querySelector('.btn-marcar-leida');
            if (btnMarcar) btnMarcar.remove();
        });

        mostrarAlerta('success', `${resultado.count} notificaciones marcadas como leídas`);
        console.log(`✅ ${resultado.count} notificaciones marcadas como leídas`);
    } catch (error) {
        console.error('❌ Error en handleMarcarTodasLeidas:', error);
        mostrarAlerta('error', 'Error al marcar todas como leídas');
    }
}

// ============================================
// SNOOZE
// ============================================

/**
 * Muestra menú de opciones de snooze
 * @param {number} notifId - ID de la notificación
 */
export function mostrarOpcionesSnooze(notifId) {
    // Remover menú existente si hay
    const menuExistente = document.querySelector('.snooze-menu');
    if (menuExistente) menuExistente.remove();

    // Encontrar la notificación
    const notifElement = document.querySelector(`.notificacion[data-id="${notifId}"]`);
    if (!notifElement) return;

    // Crear menú
    const menu = document.createElement('div');
    menu.className = 'snooze-menu';
    menu.innerHTML = `
        <div class="snooze-menu-header">
            <strong>⏰ Posponer por:</strong>
            <button class="btn-cerrar-snooze" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
        <div class="snooze-opciones">
            ${OPCIONES_SNOOZE.map(opcion => `
                <button class="snooze-opcion" data-notif-id="${notifId}" data-horas="${opcion.horas}">
                    <span>${opcion.icono}</span>
                    <span>${opcion.texto}</span>
                </button>
            `).join('')}
        </div>
    `;

    // Insertar después de la notificación
    notifElement.insertAdjacentElement('afterend', menu);

    // Agregar event listeners a las opciones
    menu.querySelectorAll('.snooze-opcion').forEach(btn => {
        btn.addEventListener('click', () => {
            const notifId = parseInt(btn.dataset.notifId);
            const horas = parseInt(btn.dataset.horas);
            handleSnooze(notifId, horas);
            menu.remove();
        });
    });

    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', function cerrarMenuSnooze(e) {
            if (!menu.contains(e.target) && !e.target.classList.contains('btn-snooze-notif')) {
                menu.remove();
                document.removeEventListener('click', cerrarMenuSnooze);
            }
        });
    }, 100);
}

/**
 * Pospone una notificación
 * @param {number} notifId - ID de la notificación
 * @param {number} horas - Horas a posponer
 */
export async function handleSnooze(notifId, horas) {
    try {
        const resultado = await snoozeNotificacion(notifId, horas);

        if (!resultado.success) {
            mostrarAlerta('error', 'Error al posponer notificación');
            return;
        }

        // Actualizar badge
        actualizarBadgeContador(resultado.contador);

        // Remover notificación del DOM (ya no está activa)
        const notifElement = document.querySelector(`.notificacion[data-id="${notifId}"]`);
        if (notifElement) {
            notifElement.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notifElement.remove(), 300);
        }

        // Verificar si quedaron notificaciones
        const notificacionesRestantes = document.querySelectorAll('.notificacion').length;
        if (notificacionesRestantes === 0) {
            renderizarListaNotificaciones([]);
        }

        const textoHoras = horas === 1 ? '1 hora' : horas === 24 ? '1 día' : `${horas} horas`;
        mostrarAlerta('success', `Notificación pospuesta por ${textoHoras}`);
        console.log(`✅ Notificación ${notifId} pospuesta por ${horas}h`);
    } catch (error) {
        console.error('❌ Error en handleSnooze:', error);
        mostrarAlerta('error', 'Error al posponer notificación');
    }
}

// ============================================
// SINCRONIZAR
// ============================================

/**
 * Sincroniza notificaciones con siniestros
 */
export async function handleSincronizarNotificaciones() {
    try {
        console.log('🔄 Sincronizando notificaciones...');

        const resultado = await sincronizarNotificaciones();

        if (!resultado.success) {
            console.error('❌ Error sincronizando:', resultado.error);
            return;
        }

        const { total_creadas, total_actualizadas, total_eliminadas } = resultado.stats;

        console.log(`✅ Sincronización: ${total_creadas} creadas, ${total_actualizadas} actualizadas, ${total_eliminadas} eliminadas`);

        // Recargar notificaciones si hubo cambios
        if (total_creadas > 0 || total_actualizadas > 0 || total_eliminadas > 0) {
            await handleCargarNotificaciones();
        }
    } catch (error) {
        console.error('❌ Error en handleSincronizarNotificaciones:', error);
    }
}

// ============================================
// EVENT LISTENERS
// ============================================

/**
 * Configura event listeners para las notificaciones
 */
function configurarEventListenersNotificaciones() {
    // Botones de editar siniestro
    document.querySelectorAll('.btn-editar-notif').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const siniestroId = parseInt(btn.dataset.siniestroId);
            cerrarPanelNotificaciones();
            // Llamar a la función global de editar siniestro
            if (window.handleEditarSiniestro) {
                window.handleEditarSiniestro(siniestroId);
            }
        });
    });

    // Botones de WhatsApp
    document.querySelectorAll('.btn-whatsapp-notif').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const siniestroId = parseInt(btn.dataset.siniestroId);
            cerrarPanelNotificaciones();
            // Llamar a la función global de enviar mensaje
            if (window.handleEnviarMensaje) {
                window.handleEnviarMensaje(siniestroId);
            }
        });
    });

    // Botones de snooze
    document.querySelectorAll('.btn-snooze-notif').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const notifId = parseInt(btn.dataset.notifId);
            mostrarOpcionesSnooze(notifId);
        });
    });

    // Botones de marcar como leída
    document.querySelectorAll('.btn-marcar-leida').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            const notifId = parseInt(btn.dataset.notifId);
            handleMarcarLeida(notifId);
        });
    });

    // Click en notificación completa (marcar como leída)
    document.querySelectorAll('.notificacion.no-leida').forEach(notif => {
        notif.addEventListener('click', () => {
            const notifId = parseInt(notif.dataset.id);
            handleMarcarLeida(notifId);
        });
    });
}
