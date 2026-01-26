// ============================================
// HANDLERS DE SINIESTROS
// ============================================

import { validarCampo, LIMITE_POR_PAGINA } from '../utils.js';
import {
    mostrarAlerta,
    mostrarSkeletonTabla,
    mostrarCargando,
    cambiarTabDirecto,
    cerrarModal,
    abrirModal,
    actualizarControlesPaginacion,
    mostrarAlertaFuzzy,
    mostrarAlertaSeguimiento,
    actualizarTabla,
    actualizarEstadisticas,
    llenarFormularioEdicion,
    leerFormularioEdicion,
    leerFormularioNuevo,
    resetFormularioNuevo,
    getInputsFormularioNuevo,
    setEstadoBotonGuardar,
    marcarCampoError
} from '../ui.js';
import {
    crearSiniestro,
    actualizarSiniestro,
    eliminarSiniestro as eliminarSiniestroService,
    getSiniestroByIdWithFallback,
    prewarmCacheIds
} from '../siniestros/siniestros-crud.js';
import {
    cargarSiniestros,
    getSiniestroById
} from '../siniestros/siniestros-search.js';
import { handleEnviarMensaje } from './mensajes.handlers.js';

export async function handleCargarSiniestros(pagina = 0, aplicarFiltros = false) {
    mostrarSkeletonTabla();
    mostrarCargando('loadingLista', true);

    const resultado = await cargarSiniestros(pagina, aplicarFiltros);

    mostrarCargando('loadingLista', false);

    if (!resultado.success) {
        mostrarAlerta('error', 'Error al cargar los siniestros: ' + resultado.error);
        return resultado;
    }

    // Renderizar tabla (los siniestros ya vienen con campos precalculados)
    actualizarTabla(resultado.data, {
        onEditar: handleEditarSiniestro,
        onEnviarMensaje: handleEnviarMensaje,
        onEliminar: handleEliminarSiniestro
    });

    // 🔥 FASE 4.2: Warm cache pasivo - precachear IDs visibles
    prewarmCacheIds(resultado.data);

    // Actualizar estadísticas
    actualizarEstadisticas(resultado.data);

    // Actualizar paginación
    actualizarControlesPaginacion(resultado.paginaActual, resultado.totalRegistros, LIMITE_POR_PAGINA);

    // Mostrar alerta fuzzy si aplica
    if (resultado.fuzzyUsado) {
        mostrarAlertaFuzzy(resultado.fuzzyQuery, resultado.data.length);
    }

    // Mostrar alerta de seguimiento (solo primera carga)
    if (pagina === 0 && !aplicarFiltros && resultado.pendientesSeguimiento > 0) {
        mostrarAlertaSeguimiento(resultado.pendientesSeguimiento, resultado.diasAlerta);
    }

    return resultado;
}

export async function handleAgregarSiniestro(event) {
    event.preventDefault();

    const form = event.target;
    const datos = leerFormularioNuevo(form);
    const inputs = getInputsFormularioNuevo(form);

    // Validaciones
    if (!validarCampo('numero', datos.numero, inputs.numInput)) return;
    if (!validarCampo('asegurado', datos.asegurado, inputs.asegInput)) return;
    if (!validarCampo('telefono', datos.telefono, inputs.telInput)) return;

    setEstadoBotonGuardar(true);

    const resultado = await crearSiniestro(datos);

    setEstadoBotonGuardar(false);

    if (!resultado.success) {
        if (resultado.duplicado) {
            marcarCampoError(inputs.numInput);
        }
        mostrarAlerta('error', '❌ ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Siniestro registrado exitosamente');
    resetFormularioNuevo(form);
    await handleCargarSiniestros(0, false);
    cambiarTabDirecto('lista');
}

export function handleEditarSiniestro(id) {
    // Usar IIFE async para mantener handler sincrónico hacia UI
    (async () => {
        const siniestro = await getSiniestroByIdWithFallback(id);
        if (!siniestro) return;

        llenarFormularioEdicion(siniestro);
        abrirModal();
    })();
}

export async function handleGuardarEdicion(event) {
    event.preventDefault();

    const datos = leerFormularioEdicion();
    const resultado = await actualizarSiniestro(datos.id, datos);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al guardar cambios: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Cambios guardados exitosamente');
    await handleCargarSiniestros();
    cerrarModal();
}

export async function handleEliminarSiniestro(id) {
    if (!confirm('¿Estás seguro de eliminar este siniestro?')) return;

    const resultado = await eliminarSiniestroService(id);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al eliminar: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Siniestro eliminado exitosamente');
    await handleCargarSiniestros();
}

export function configurarValidacionesFormularioNuevo() {
    const numInput = document.getElementById('numeroNuevo');
    const asegInput = document.getElementById('aseguradoNuevo');
    const telInput = document.getElementById('telefonoNuevo');

    if (numInput && !numInput.dataset.validacionInit) {
        numInput.addEventListener('blur', () =>
            validarCampo('numero', numInput.value, numInput)
        );
        numInput.dataset.validacionInit = 'true';
    }

    if (asegInput && !asegInput.dataset.validacionInit) {
        asegInput.addEventListener('blur', () =>
            validarCampo('asegurado', asegInput.value, asegInput)
        );
        asegInput.dataset.validacionInit = 'true';
    }

    if (telInput && !telInput.dataset.validacionInit) {
        telInput.addEventListener('blur', () =>
            validarCampo('telefono', telInput.value, telInput)
        );
        telInput.dataset.validacionInit = 'true';
    }
}
