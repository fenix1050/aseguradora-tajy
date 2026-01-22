// ============================================
// APP.JS - Punto de Entrada y Orquestación
// ============================================
// Este módulo:
// - Inicializa la aplicación
// - Orquesta llamadas entre módulos
// - Maneja eventos del usuario
// - Conecta lógica de negocio con UI

import { inicializarSupabase } from './supabase.js';
import { verificarSesion, cerrarSesion } from './auth.js';
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
    handleEliminarSiniestro
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
        button.addEventListener('click', function() {
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
        return; // Redirige a login
    }

    actualizarEstadoConexion(true);

    // Cargar siniestros iniciales
    await handleCargarSiniestros(0, false);

    // Inicializar plantilla de mensajes
    handleActualizarPlantilla();

    // Configurar listeners
    configurarListenersMensajes();
    configurarListenerTelefono();
    configurarListenerBusqueda();
    configurarListenerResetFiltros();

    console.log('✅ Aplicación lista');
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

// ============================================
// INICIO
// ============================================

window.onload = inicializarApp;
window.onclick = handleCerrarModalClick;
