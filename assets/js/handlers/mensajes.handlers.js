// ============================================
// HANDLERS DE MENSAJES WHATSAPP
// ============================================

import {
    mostrarAlerta,
    leerFormularioMensaje,
    setPreviewMensaje,
    getPreviewMensaje,
    llenarFormularioMensaje,
    cambiarTabDirecto
} from '../ui.js';
import {
    getSiniestroByAsegurado,
    getSiniestroById,
    generarMensaje,
    generarUrlWhatsApp
} from '../siniestros.js';

export function handleEnviarMensaje(id) {
    const siniestro = getSiniestroById(id);
    if (!siniestro) return;

    llenarFormularioMensaje(siniestro);
    cambiarTabDirecto('mensajes');
    handleActualizarPlantilla();
}

export function handleActualizarPlantilla() {
    const datos = leerFormularioMensaje();
    const mensaje = generarMensaje(datos.tipo, datos);
    setPreviewMensaje(mensaje);
}

export function handleCopiarMensaje() {
    const mensaje = getPreviewMensaje();
    navigator.clipboard.writeText(mensaje).then(() => {
        mostrarAlerta('success', '✅ Mensaje copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarAlerta('error', '❌ Error al copiar el mensaje');
    });
}

export function handleAbrirWhatsApp() {
    const datos = leerFormularioMensaje();
    const mensaje = getPreviewMensaje();
    const siniestro = getSiniestroByAsegurado(datos.nombre);

    if (!siniestro) {
        mostrarAlerta('error', '❌ No se encontró el número de teléfono');
        return;
    }

    const url = generarUrlWhatsApp(siniestro.telefono, mensaje);

    if (!url) {
        mostrarAlerta('error', '❌ No se encontró el número de teléfono');
        return;
    }

    window.open(url, '_blank');
}

export function configurarListenersMensajes() {
    document.getElementById('nombreMensaje')?.addEventListener('input', handleActualizarPlantilla);
    document.getElementById('numeroMensaje')?.addEventListener('input', handleActualizarPlantilla);
    document.getElementById('tallerMensaje')?.addEventListener('input', handleActualizarPlantilla);
    document.getElementById('tipoMensaje')?.addEventListener('change', handleActualizarPlantilla);
    document.getElementById('sexoMensaje')?.addEventListener('change', handleActualizarPlantilla);
}
