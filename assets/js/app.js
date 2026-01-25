// ============================================
// APP.JS - Punto de Entrada y Orquestación
// ============================================
// Este módulo:
// - Inicializa la aplicación
// - Orquesta llamadas entre módulos
// - Maneja eventos del usuario
// - Conecta lógica de negocio con UI

import { inicializarSupabase } from './supabase.js';
import { verificarSesion, cerrarSesion, getPerfilError } from './auth.js';
import {
    actualizarEstadoConexion,
    mostrarAlerta,
    cambiarTabDirecto,
    cerrarModal,
    init as initUI
} from './ui.js';

// Handlers de siniestros
import {
    handleCargarSiniestros,
    handleAgregarSiniestro,
    handleEditarSiniestro,
    handleGuardarEdicion,
    handleEliminarSiniestro,
    configurarValidacionesFormularioNuevo
} from './handlers/siniestros.handlers.js';

// Handlers de filtrado y búsqueda
import {
    handleFiltrarTabla,
    handleOrdenarPor,
    configurarListenerBusqueda,
    configurarListenerResetFiltros
} from './handlers/filtros.handlers.js';

// Handlers de mensajes WhatsApp
import {
    handleEnviarMensaje,
    handleActualizarPlantilla,
    handleCopiarMensaje,
    handleAbrirWhatsApp,
    configurarListenersMensajes
} from './handlers/mensajes.handlers.js';

// Handlers de reportes
import {
    handleGenerarReporte,
    handleExportarExcel
} from './handlers/reportes.handlers.js';

// Handlers de usuarios
import {
    handleTabAdmin,
    handleCrearUsuario
} from './handlers/usuarios.handlers.js';

// Handlers de teléfono
import { configurarListenerTelefono } from './handlers/telefono.handlers.js';

// Handlers de notificaciones
import {
    togglePanelNotificaciones,
    cerrarPanelNotificaciones,
    handleCargarNotificaciones,
    handleMarcarLeida,
    handleMarcarTodasLeidas,
    mostrarOpcionesSnooze,
    handleSnooze,
    handleSincronizarNotificaciones
} from './handlers/notificaciones.handlers.js';

// ============================================
// INICIALIZACIÓN
// ============================================

async function inicializarApp() {
    console.log('🚀 Iniciando aplicación...');

    // Inicializar UI con callbacks de handlers
    initUI({
        onTabAdmin: handleTabAdmin,
        onCargarSiniestros: handleCargarSiniestros,
        onFiltrarTabla: handleFiltrarTabla
    });

    // Configurar event listeners para tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function () {
            const tabId = this.getAttribute('data-tab');
            cambiarTabDirecto(tabId);
        });
    });

    // Inicializar Supabase
    const resultado = await inicializarSupabase();

    if (!resultado.success) {
        mostrarAlerta('error', resultado.error);
        actualizarEstadoConexion(false);
        return;
    }

    // Verificar sesión
    const autenticado = await verificarSesion();
    if (!autenticado) {
        // Verificar si es por error de perfil o por falta de sesión
        const perfilErr = getPerfilError();
        if (perfilErr) {
            // Error de perfil: mostrar alerta pero mantener sesión activa
            const mensajeError = perfilErr.message || 'No se pudo cargar el perfil del usuario';
            mostrarAlerta('error', `Advertencia de perfil: ${mensajeError}`);
            actualizarEstadoConexion(true);
            // Continuar con la aplicación (sesión válida, pero sin datos de perfil completos)
            console.warn('⚠️ Continuando con sesión activa a pesar del error de perfil');
        } else {
            // Sin sesión: no continuar
            return;
        }
    } else {
        actualizarEstadoConexion(true);
    }

    // Cargar siniestros iniciales
    await handleCargarSiniestros(0, false);

    // Configurar validaciones formulario nuevo
    configurarValidacionesFormularioNuevo();

    // Inicializar plantilla de mensajes
    handleActualizarPlantilla();

    // Configurar listeners
    configurarListenersMensajes();
    configurarListenerTelefono();
    configurarListenerBusqueda();
    configurarListenerResetFiltros();

    // Configurar listeners de notificaciones
    configurarListenersNotificaciones();

    // Sincronizar y cargar notificaciones iniciales
    await handleSincronizarNotificaciones();
    await handleCargarNotificaciones();

    console.log('✅ Aplicación lista');
}

// ============================================
// CONFIGURAR LISTENERS NOTIFICACIONES
// ============================================

function configurarListenersNotificaciones() {
    // Botón de notificaciones (toggle panel)
    const btnNotificaciones = document.getElementById('btnNotificaciones');
    if (btnNotificaciones) {
        btnNotificaciones.addEventListener('click', togglePanelNotificaciones);
    }

    // Botón de cerrar panel
    const btnCerrarPanel = document.getElementById('btnCerrarPanel');
    if (btnCerrarPanel) {
        btnCerrarPanel.addEventListener('click', cerrarPanelNotificaciones);
    }

    // Botón de marcar todas como leídas
    const btnMarcarTodas = document.getElementById('btnMarcarTodasLeidas');
    if (btnMarcarTodas) {
        btnMarcarTodas.addEventListener('click', handleMarcarTodasLeidas);
    }

    // Overlay (cerrar al hacer click fuera)
    const overlay = document.getElementById('notificacionesOverlay');
    if (overlay) {
        overlay.addEventListener('click', cerrarPanelNotificaciones);
    }

    // Cerrar panel con tecla ESC
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            const panel = document.getElementById('panelNotificaciones');
            if (panel && !panel.classList.contains('oculto')) {
                cerrarPanelNotificaciones();
            }
        }
    });

    console.log('✅ Listeners de notificaciones configurados');
}

// ============================================
// HANDLERS DE MODAL
// ============================================

function handleCerrarModalClick(event) {
    const modal = document.getElementById('modalEditar');
    if (event.target === modal) {
        cerrarModal();
    }
}

// ============================================
// EXPONER FUNCIONES GLOBALES
// ============================================
// Necesario para compatibilidad con onclick inline en HTML existente

window.agregarSiniestro = handleAgregarSiniestro;
window.guardarEdicion = handleGuardarEdicion;
window.editarSiniestro = handleEditarSiniestro;
window.eliminarSiniestro = handleEliminarSiniestro;
window.enviarMensaje = handleEnviarMensaje;
window.cerrarModal = cerrarModal;
window.cerrarSesion = cerrarSesion;
window.filtrarTabla = handleFiltrarTabla;
window.ordenarPor = handleOrdenarPor;
window.actualizarPlantilla = handleActualizarPlantilla;
window.copiarMensaje = handleCopiarMensaje;
window.abrirWhatsApp = handleAbrirWhatsApp;
window.generarReporte = handleGenerarReporte;
window.exportarExcel = handleExportarExcel;
window.crearUsuario = handleCrearUsuario;
window.cambiarTabDirecto = cambiarTabDirecto;

// Notificaciones
window.togglePanelNotificaciones = togglePanelNotificaciones;
window.handleEditarSiniestro = handleEditarSiniestro;
window.handleEnviarMensaje = handleEnviarMensaje;
window.mostrarOpcionesSnooze = mostrarOpcionesSnooze;

// ============================================
// INICIO
// ============================================

window.onload = inicializarApp;
window.onclick = handleCerrarModalClick;
