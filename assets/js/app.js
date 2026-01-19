// ============================================
// APP.JS - Punto de Entrada y Orquestación
// ============================================
// Este módulo:
// - Inicializa la aplicación
// - Orquesta llamadas entre módulos
// - Maneja eventos del usuario
// - Conecta lógica de negocio con UI

import { inicializarSupabase } from './supabase.js';
import { verificarSesion, cerrarSesion, getUsuarioActual } from './auth.js';
import {
    debounce,
    validarCampo,
    LIMITE_POR_PAGINA
} from './utils.js';
import {
    actualizarEstadoConexion,
    mostrarAlerta,
    mostrarSkeletonTabla,
    mostrarCargando,
    cambiarTabDirecto,
    cerrarModal,
    abrirModal,
    actualizarControlesPaginacion,
    actualizarIconosOrdenamiento,
    mostrarSugerencias,
    ocultarSugerencias,
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
    marcarCampoError,
    llenarFormularioMensaje,
    leerFormularioMensaje,
    setPreviewMensaje,
    getPreviewMensaje,
    leerFechasReporte,
    leerFiltros,
    setOnTabAdminCallback,
    setCargarSiniestrosCallback,
    setFiltrarTablaCallback
} from './ui.js';
import {
    cargarSiniestros,
    crearSiniestro,
    actualizarSiniestro,
    eliminarSiniestro as eliminarSiniestroService,
    getSiniestros,
    getSiniestroById,
    getSiniestroByAsegurado,
    getPaginaActual,
    getOrdenActual,
    setFiltros,
    cambiarOrden,
    buscarAseguradosFuzzy,
    generarMensaje,
    generarUrlWhatsApp,
    filtrarSiniestrosPorFecha,
    generarHtmlReporte,
    generarCsvReporte,
    generarNombreArchivoReporte
} from './siniestros.js';
import {
    cargarUsuarios as cargarUsuariosService,
    crearUsuario as crearUsuarioService,
    cambiarRolUsuario as cambiarRolService,
    eliminarUsuario as eliminarUsuarioService,
    esUsuarioActual
} from './usuarios.js';

// ============================================
// INICIALIZACIÓN
// ============================================

async function inicializarApp() {
    console.log('🚀 Iniciando aplicación...');

    // Configurar callbacks de UI
    setOnTabAdminCallback(handleTabAdmin);
    setCargarSiniestrosCallback(handleCargarSiniestros);
    setFiltrarTablaCallback(handleFiltrarTabla);

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

    console.log('✅ Aplicación lista');
}

// ============================================
// HANDLERS DE SINIESTROS
// ============================================

async function handleCargarSiniestros(pagina = 0, aplicarFiltros = false) {
    mostrarSkeletonTabla();
    mostrarCargando('loadingLista', true);

    const resultado = await cargarSiniestros(pagina, aplicarFiltros);

    mostrarCargando('loadingLista', false);

    if (!resultado.success) {
        mostrarAlerta('error', 'Error al cargar los siniestros: ' + resultado.error);
        return;
    }

    // Renderizar tabla (los siniestros ya vienen con campos precalculados)
    actualizarTabla(resultado.data, {
        onEditar: handleEditarSiniestro,
        onEnviarMensaje: handleEnviarMensaje,
        onEliminar: handleEliminarSiniestro
    });

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
}

async function handleAgregarSiniestro(event) {
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

function handleEditarSiniestro(id) {
    const siniestro = getSiniestroById(id);
    if (!siniestro) return;

    llenarFormularioEdicion(siniestro);
    abrirModal();
}

async function handleGuardarEdicion(event) {
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

async function handleEliminarSiniestro(id) {
    if (!confirm('¿Estás seguro de eliminar este siniestro?')) return;

    const resultado = await eliminarSiniestroService(id);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al eliminar: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Siniestro eliminado exitosamente');
    await handleCargarSiniestros();
}

// ============================================
// HANDLERS DE FILTRADO Y ORDENAMIENTO
// ============================================

async function handleFiltrarTabla() {
    const filtros = leerFiltros();
    setFiltros(filtros);
    await handleCargarSiniestros(0, true);
}

const handleFiltrarTablaDebounced = debounce(handleFiltrarTabla, 500);

function handleOrdenarPor(columna) {
    const nuevoOrden = cambiarOrden(columna);
    handleCargarSiniestros(getPaginaActual(), true);
    actualizarIconosOrdenamiento(nuevoOrden);
}

// ============================================
// HANDLERS DE BÚSQUEDA INTELIGENTE
// ============================================

const handleBusquedaInteligente = debounce(async function(input) {
    const query = input.value.trim();

    if (query.length < 2) {
        ocultarSugerencias();
        return;
    }

    const resultados = await buscarAseguradosFuzzy(query);

    if (resultados.length > 0) {
        mostrarSugerencias(input, resultados);
    } else {
        ocultarSugerencias();
    }
}, 200);

function configurarListenerBusqueda() {
    const inputBusqueda = document.getElementById('buscarAsegurado');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            handleBusquedaInteligente(this);
        });
    }
}

// ============================================
// HANDLERS DE MENSAJES WHATSAPP
// ============================================

function handleEnviarMensaje(id) {
    const siniestro = getSiniestroById(id);
    if (!siniestro) return;

    llenarFormularioMensaje(siniestro);
    cambiarTabDirecto('mensajes');
    handleActualizarPlantilla();
}

function handleActualizarPlantilla() {
    const datos = leerFormularioMensaje();
    const mensaje = generarMensaje(datos.tipo, datos);
    setPreviewMensaje(mensaje);
}

function handleCopiarMensaje() {
    const mensaje = getPreviewMensaje();
    navigator.clipboard.writeText(mensaje).then(() => {
        mostrarAlerta('success', '✅ Mensaje copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarAlerta('error', '❌ Error al copiar el mensaje');
    });
}

function handleAbrirWhatsApp() {
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

function configurarListenersMensajes() {
    document.getElementById('nombreMensaje')?.addEventListener('input', handleActualizarPlantilla);
    document.getElementById('numeroMensaje')?.addEventListener('input', handleActualizarPlantilla);
    document.getElementById('tallerMensaje')?.addEventListener('input', handleActualizarPlantilla);
    document.getElementById('tipoMensaje')?.addEventListener('change', handleActualizarPlantilla);
    document.getElementById('sexoMensaje')?.addEventListener('change', handleActualizarPlantilla);
}

// ============================================
// HANDLERS DE REPORTES
// ============================================

function handleGenerarReporte() {
    const fechas = leerFechasReporte();
    const resultado = filtrarSiniestrosPorFecha(fechas.fechaDesde, fechas.fechaHasta);

    if (!resultado.success) {
        mostrarAlerta('error', resultado.error);
        return;
    }

    const html = generarHtmlReporte(resultado.data, fechas.fechaDesde, fechas.fechaHasta);
    const ventanaReporte = window.open('', '_blank');
    ventanaReporte.document.write(html);
    ventanaReporte.document.close();
}

function handleExportarExcel() {
    const fechas = leerFechasReporte();
    const resultado = filtrarSiniestrosPorFecha(fechas.fechaDesde, fechas.fechaHasta);

    if (!resultado.success) {
        mostrarAlerta('error', resultado.error);
        return;
    }

    const csv = generarCsvReporte(resultado.data);
    const nombreArchivo = generarNombreArchivoReporte(fechas.fechaDesde, fechas.fechaHasta);

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', nombreArchivo);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarAlerta('success', '✅ Reporte exportado exitosamente');
}

// ============================================
// HANDLERS DE USUARIOS (ADMIN)
// ============================================

async function handleTabAdmin() {
    const usuarioActual = getUsuarioActual();
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        return;
    }
    await handleCargarUsuarios();
}

async function handleCargarUsuarios() {
    mostrarCargando('loadingUsuarios', true);

    const resultado = await cargarUsuariosService();

    mostrarCargando('loadingUsuarios', false);

    if (!resultado.success) {
        mostrarAlerta('error', resultado.error);
        return;
    }

    actualizarTablaUsuarios(resultado.data);
}

function actualizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById('listaUsuarios');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No hay usuarios registrados</td></tr>';
        return;
    }

    usuarios.forEach(usuario => {
        const tr = document.createElement('tr');
        const rolBadge = usuario.rol === 'admin' ?
            '<span class="badge badge-aprobado">Administrador</span>' :
            '<span class="badge badge-proceso">Tramitador</span>';

        const esActual = esUsuarioActual(usuario.email);
        const botonEliminar = esActual ?
            '<button class="btn btn-danger btn-small" disabled title="No puedes eliminarte a ti mismo">🗑️</button>' :
            `<button class="btn btn-danger btn-small btn-eliminar-usuario" data-id="${usuario.id}" title="Eliminar usuario">🗑️</button>`;

        tr.innerHTML = `
            <td><strong>${usuario.nombre_completo}</strong></td>
            <td>${usuario.email}</td>
            <td>${rolBadge}</td>
            <td>${new Date(usuario.created_at).toLocaleDateString('es-PY')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small btn-cambiar-rol" data-id="${usuario.id}" data-rol="${usuario.rol}" title="Cambiar rol">🔄</button>
                    ${botonEliminar}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Event listeners
    tbody.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.addEventListener('click', () => handleCambiarRol(btn.dataset.id, btn.dataset.rol));
    });
    tbody.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.addEventListener('click', () => handleEliminarUsuario(btn.dataset.id));
    });
}

async function handleCrearUsuario(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const datos = {
        email: formData.get('email'),
        password: formData.get('password'),
        nombre: formData.get('nombre'),
        rol: formData.get('rol')
    };

    const btnCrear = document.getElementById('btnCrearUsuario');
    btnCrear.disabled = true;
    btnCrear.textContent = '⏳ Creando...';

    const resultado = await crearUsuarioService(datos);

    btnCrear.disabled = false;
    btnCrear.textContent = '👤 Crear Usuario';

    if (!resultado.success) {
        mostrarAlerta('error', '❌ ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Usuario creado exitosamente');
    form.reset();
    await handleCargarUsuarios();
}

async function handleCambiarRol(userId, rolActual) {
    const nuevoRol = rolActual === 'admin' ? 'Tramitador' : 'Administrador';
    if (!confirm(`¿Cambiar el rol de este usuario a ${nuevoRol}?`)) return;

    const resultado = await cambiarRolService(userId, rolActual);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al cambiar el rol: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', `✅ Rol actualizado a ${resultado.nuevoRol === 'admin' ? 'Administrador' : 'Tramitador'}`);
    await handleCargarUsuarios();
}

async function handleEliminarUsuario(userId) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;

    const resultado = await eliminarUsuarioService(userId);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al eliminar usuario: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Usuario eliminado exitosamente');
    await handleCargarUsuarios();
}

// ============================================
// HANDLERS DE TELÉFONO
// ============================================

function configurarListenerTelefono() {
    const telefonoInput = document.getElementById('telefonoNuevo');
    if (!telefonoInput) return;

    telefonoInput.addEventListener('input', function(e) {
        const valor = e.target.value;
        if (!valor.startsWith('+595 ')) {
            e.target.value = '+595 ';
        }
    });

    telefonoInput.addEventListener('focus', function(e) {
        if (e.target.value === '+595 ') {
            setTimeout(() => {
                e.target.setSelectionRange(5, 5);
            }, 0);
        }
    });

    telefonoInput.addEventListener('keydown', function(e) {
        const cursorPos = e.target.selectionStart;
        if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPos <= 5) {
            e.preventDefault();
        }
    });
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
window.filtrarTablaDebounced = handleFiltrarTablaDebounced;
window.ordenarPor = handleOrdenarPor;
window.actualizarPlantilla = handleActualizarPlantilla;
window.copiarMensaje = handleCopiarMensaje;
window.abrirWhatsApp = handleAbrirWhatsApp;
window.generarReporte = handleGenerarReporte;
window.exportarExcel = handleExportarExcel;
window.crearUsuario = handleCrearUsuario;
window.cargarSiniestros = handleCargarSiniestros;
window.cambiarTabDirecto = cambiarTabDirecto;
window.validarCampo = validarCampo;
window.busquedaInteligenteDebounced = handleBusquedaInteligente;

// ============================================
// INICIO
// ============================================

window.onload = inicializarApp;
window.onclick = handleCerrarModalClick;
