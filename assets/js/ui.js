// ============================================
// UI.JS - DOM, Tabs, Modales, Alertas, Tablas
// ============================================

import { resaltarCoincidencia, obtenerTextoEstado } from './utils.js';

// ============================================
// ESTADO DE UI
// ============================================

let sugerenciasActivas = null;

// ============================================
// ESTADO DE CONEXIÓN
// ============================================

export function actualizarEstadoConexion(conectado) {
    const statusElement = document.getElementById('connectionStatus');
    if (conectado) {
        statusElement.className = 'connection-status status-connected';
        statusElement.innerHTML = '🟢 Conectado';
    } else {
        statusElement.className = 'connection-status status-disconnected';
        statusElement.innerHTML = '🔴 No conectado';
    }
}

// ============================================
// LOADING / SPINNER
// ============================================

export function mostrarCargando(elementId, mostrar) {
    const element = document.getElementById(elementId);
    if (element) {
        if (mostrar) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    }
}

// ============================================
// TOAST NOTIFICATIONS
// ============================================

export function mostrarAlerta(tipo, mensaje, duracion = 5000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;

    const icon = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    }[tipo] || 'ℹ️';

    toast.innerHTML = `
        <span style="font-size: 1.2em;">${icon}</span>
        <span style="flex: 1;">${mensaje}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, duracion);
}

// ============================================
// SKELETON LOADER
// ============================================

export function mostrarSkeletonTabla() {
    const tbody = document.getElementById('listaSiniestros');
    if (!tbody) return;

    tbody.innerHTML = '';
    for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 150px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
        `;
        tbody.appendChild(tr);
    }
}

// ============================================
// TABS
// ============================================

// Callback para cuando se cambia a tab admin (se configura desde app.js)
let onTabAdminCallback = null;

export function setOnTabAdminCallback(callback) {
    onTabAdminCallback = callback;
}

export function cambiarTabDirecto(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');

    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (tabButton) tabButton.classList.add('active');

    // Ejecutar callback si es tab admin
    if (tabId === 'admin' && onTabAdminCallback) {
        onTabAdminCallback();
    }
}

// ============================================
// MODAL
// ============================================

export function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

export function abrirModal() {
    document.getElementById('modalEditar').style.display = 'block';
}

// ============================================
// PAGINACIÓN
// ============================================

// Callback para cargar siniestros (se configura desde app.js)
let cargarSiniestrosCallback = null;

export function setCargarSiniestrosCallback(callback) {
    cargarSiniestrosCallback = callback;
}

export function actualizarControlesPaginacion(paginaActual, totalRegistros, limitePorPagina) {
    const totalPaginas = Math.ceil(totalRegistros / limitePorPagina);
    let contenedor = document.getElementById('paginacion');

    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'paginacion';
        const card = document.querySelector('#lista .card');
        if (card) {
            card.appendChild(contenedor);
        }
        return;
    }

    if (totalPaginas <= 1) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #dee2e6;">
            <div>
                <span style="color: #666;">Mostrando ${paginaActual * limitePorPagina + 1} - ${Math.min((paginaActual + 1) * limitePorPagina, totalRegistros)} de ${totalRegistros}</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-primary" data-pagina="0" ${paginaActual === 0 ? 'disabled' : ''} style="padding: 8px 15px;">
                    ⏮️ Primera
                </button>
                <button class="btn btn-primary" data-pagina="${paginaActual - 1}" ${paginaActual === 0 ? 'disabled' : ''} style="padding: 8px 15px;">
                    ⬅️ Anterior
                </button>
                <span style="padding: 8px 15px; color: #666;">
                    Página ${paginaActual + 1} de ${totalPaginas}
                </span>
                <button class="btn btn-primary" data-pagina="${paginaActual + 1}" ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''} style="padding: 8px 15px;">
                    Siguiente ➡️
                </button>
                <button class="btn btn-primary" data-pagina="${totalPaginas - 1}" ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''} style="padding: 8px 15px;">
                    Última ⏭️
                </button>
            </div>
        </div>
    `;

    // Agregar event listeners a los botones de paginación
    contenedor.querySelectorAll('button[data-pagina]').forEach(btn => {
        btn.addEventListener('click', function() {
            const pagina = parseInt(this.getAttribute('data-pagina'));
            if (cargarSiniestrosCallback && !this.disabled) {
                cargarSiniestrosCallback(pagina, true);
            }
        });
    });
}

// ============================================
// ORDENAMIENTO
// ============================================

export function actualizarIconosOrdenamiento(ordenActual) {
    document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());
    const headers = document.querySelectorAll('#tablaSiniestros th[data-sort]');
    headers.forEach((header) => {
        const columna = header.getAttribute('data-sort');
        if (columna === ordenActual.columna) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            icon.textContent = ordenActual.direccion === 'asc' ? ' ↑' : ' ↓';
            icon.style.marginLeft = '5px';
            header.appendChild(icon);
        }
    });
}

// ============================================
// SUGERENCIAS DE BÚSQUEDA (FUZZY)
// ============================================

// Callback para filtrar tabla (se configura desde app.js)
let filtrarTablaCallback = null;

export function setFiltrarTablaCallback(callback) {
    filtrarTablaCallback = callback;
}

export function mostrarSugerencias(input, sugerencias) {
    ocultarSugerencias();

    if (!sugerencias || sugerencias.length === 0) return;

    const rect = input.getBoundingClientRect();
    const container = document.createElement('div');
    container.className = 'sugerencias-dropdown';
    container.style.cssText = `
        position: fixed;
        top: ${rect.bottom + 5}px;
        left: ${rect.left}px;
        width: ${rect.width}px;
        max-height: 250px;
        overflow-y: auto;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0,0,0,0.15);
        z-index: 10000;
    `;

    sugerencias.slice(0, 8).forEach((sug) => {
        const item = document.createElement('div');
        item.className = 'sugerencia-item';
        item.style.cssText = `
            padding: 10px 15px;
            cursor: pointer;
            border-bottom: 1px solid #f0f0f0;
            transition: background 0.2s;
            display: flex;
            justify-content: space-between;
            align-items: center;
        `;

        const porcentaje = Math.round(sug.score * 100);
        const colorScore = sug.score > 0.8 ? '#28a745' : sug.score > 0.6 ? '#ffc107' : '#6c757d';

        item.innerHTML = `
            <span>${resaltarCoincidencia(sug.item.asegurado, input.value)}</span>
            <span style="font-size: 11px; color: ${colorScore}; background: ${colorScore}20; padding: 2px 6px; border-radius: 10px;">
                ${porcentaje}%
            </span>
        `;

        item.addEventListener('mouseenter', () => {
            item.style.background = '#f8f9fa';
        });
        item.addEventListener('mouseleave', () => {
            item.style.background = 'white';
        });
        item.addEventListener('click', () => {
            input.value = sug.item.asegurado;
            ocultarSugerencias();
            if (filtrarTablaCallback) {
                filtrarTablaCallback();
            }
        });

        container.appendChild(item);
    });

    document.body.appendChild(container);
    sugerenciasActivas = container;

    // Cerrar al hacer click fuera
    setTimeout(() => {
        document.addEventListener('click', cerrarSugerenciasClick);
    }, 100);
}

export function ocultarSugerencias() {
    if (sugerenciasActivas) {
        sugerenciasActivas.remove();
        sugerenciasActivas = null;
    }
    document.removeEventListener('click', cerrarSugerenciasClick);
}

function cerrarSugerenciasClick(e) {
    if (!e.target.closest('.sugerencias-dropdown') && !e.target.closest('#buscarAsegurado')) {
        ocultarSugerencias();
    }
}

// ============================================
// ALERTA FUZZY SEARCH
// ============================================

export function mostrarAlertaFuzzy(busqueda, cantidadResultados) {
    const alertaExistente = document.querySelector('.fuzzy-alert');
    if (alertaExistente) alertaExistente.remove();

    const alerta = document.createElement('div');
    alerta.className = 'fuzzy-alert';
    alerta.innerHTML = `
        <span>✨ No se encontró "<strong>${busqueda}</strong>" exactamente, pero encontramos ${cantidadResultados} resultado(s) similar(es)</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; cursor: pointer; font-size: 18px; padding: 0 5px;">×</button>
    `;
    alerta.style.cssText = `
        background: linear-gradient(135deg, #fff3cd, #ffeeba);
        border: 1px solid #ffc107;
        border-radius: 8px;
        padding: 12px 15px;
        margin-bottom: 15px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        animation: slideDown 0.3s ease;
    `;

    const searchBar = document.querySelector('.search-bar');
    if (searchBar) {
        searchBar.insertAdjacentElement('afterend', alerta);
    }
}

// ============================================
// ALERTA DE SEGUIMIENTO
// ============================================

// Recibe cantidad de pendientes y días de alerta (sin lógica de negocio)
export function mostrarAlertaSeguimiento(cantidadPendientes, diasAlerta) {
    if (cantidadPendientes === 0) return;

    const mensaje = cantidadPendientes === 1
        ? `⏰ Hay 1 siniestro que requiere seguimiento (más de ${diasAlerta} días)`
        : `⏰ Hay ${cantidadPendientes} siniestros que requieren seguimiento (más de ${diasAlerta} días)`;

    mostrarAlerta('warning', mensaje, 8000);
}

// ============================================
// TABLA DE SINIESTROS
// ============================================

/**
 * Renderiza la tabla de siniestros
 * @param {Array} siniestros - Lista de siniestros a renderizar
 * @param {Object} callbacks - Callbacks para los botones de acción
 * @param {Function} callbacks.onEditar - Callback para editar (recibe id)
 * @param {Function} callbacks.onEnviarMensaje - Callback para enviar mensaje (recibe id)
 * @param {Function} callbacks.onEliminar - Callback para eliminar (recibe id)
 * @param {Function} calcularDiasTranscurridos - Función para calcular días
 * @param {Function} requiereSeguimiento - Función para verificar seguimiento
 */
export function actualizarTabla(siniestros, callbacks, calcularDiasTranscurridos, requiereSeguimiento) {
    const tbody = document.getElementById('listaSiniestros');
    tbody.innerHTML = '';

    if (siniestros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No hay siniestros registrados</td></tr>';
        return;
    }

    siniestros.forEach(s => {
        const estadoBadge = `badge-${s.estado}`;
        const esSiniestroTotal = s.monto === 'Sí';
        const necesitaSeguimiento = requiereSeguimiento(s);
        const diasTranscurridos = calcularDiasTranscurridos(s.fecha);
        const tr = document.createElement('tr');

        // Aplicar estilo especial si es siniestro total
        if (esSiniestroTotal) {
            tr.style.backgroundColor = '#fff3cd';
            tr.style.borderLeft = '4px solid #ffc107';
        }

        // Aplicar estilo si necesita seguimiento (y no es siniestro total para no sobreescribir)
        if (necesitaSeguimiento && !esSiniestroTotal) {
            tr.style.backgroundColor = '#ffe6e6';
            tr.style.borderLeft = '4px solid #dc3545';
        }

        // Construir iconos de alerta
        let iconosAlerta = '';
        if (esSiniestroTotal) iconosAlerta += ' ⚠️';
        if (necesitaSeguimiento) {
            iconosAlerta += ` <span class="alerta-seguimiento" title="Requiere seguimiento - ${diasTranscurridos} días sin actualización">⏰</span>`;
        }

        tr.innerHTML = `
            <td><strong>${s.numero}</strong>${iconosAlerta}</td>
            <td>${s.asegurado}</td>
            <td>${s.telefono}</td>
            <td>${new Date(s.fecha).toLocaleDateString('es-PY')}</td>
            <td><span class="badge ${estadoBadge}">${obtenerTextoEstado(s.estado)}</span></td>
            <td><strong>${esSiniestroTotal ? 'SINIESTRO TOTAL' : 'Normal'}</strong></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small btn-editar" data-id="${s.id}" title="Editar">✏️</button>
                    <button class="btn btn-success btn-small btn-mensaje" data-id="${s.id}" title="Enviar mensaje">💬</button>
                    <button class="btn btn-danger btn-small btn-eliminar" data-id="${s.id}" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;

        tbody.appendChild(tr);
    });

    // Agregar event listeners a los botones (evita onclick inline)
    tbody.querySelectorAll('.btn-editar').forEach(btn => {
        btn.addEventListener('click', () => callbacks.onEditar(parseInt(btn.dataset.id)));
    });
    tbody.querySelectorAll('.btn-mensaje').forEach(btn => {
        btn.addEventListener('click', () => callbacks.onEnviarMensaje(parseInt(btn.dataset.id)));
    });
    tbody.querySelectorAll('.btn-eliminar').forEach(btn => {
        btn.addEventListener('click', () => callbacks.onEliminar(parseInt(btn.dataset.id)));
    });
}

// ============================================
// ESTADÍSTICAS
// ============================================

export function actualizarEstadisticas(siniestros) {
    document.getElementById('totalCasos').textContent = siniestros.length;
    document.getElementById('pendientes').textContent = siniestros.filter(s => s.estado === 'pendiente').length;
    document.getElementById('aprobados').textContent = siniestros.filter(s => s.estado === 'aprobado').length;
    document.getElementById('enTaller').textContent = siniestros.filter(s => s.estado === 'taller').length;
}

// ============================================
// FORMULARIO DE EDICIÓN (MODAL)
// ============================================

export function llenarFormularioEdicion(siniestro) {
    document.getElementById('editId').value = siniestro.id;
    document.getElementById('editNumero').value = siniestro.numero;
    document.getElementById('editAsegurado').value = siniestro.asegurado;
    document.getElementById('editTelefono').value = siniestro.telefono;
    document.getElementById('editSexo').value = siniestro.sexo || '';
    document.getElementById('editEstado').value = siniestro.estado;
    document.getElementById('editSiniestroTotal').value = siniestro.monto === 'Sí' ? 'Sí' : 'No';
    document.getElementById('editTaller').value = siniestro.taller || '';
    document.getElementById('editObservaciones').value = siniestro.observaciones || '';
}

export function leerFormularioEdicion() {
    return {
        id: parseInt(document.getElementById('editId').value),
        numero: document.getElementById('editNumero').value,
        asegurado: document.getElementById('editAsegurado').value,
        telefono: document.getElementById('editTelefono').value,
        sexo: document.getElementById('editSexo').value || '',
        estado: document.getElementById('editEstado').value,
        monto: document.getElementById('editSiniestroTotal').value,
        taller: document.getElementById('editTaller').value || '',
        observaciones: document.getElementById('editObservaciones').value || ''
    };
}

// ============================================
// FORMULARIO NUEVO SINIESTRO
// ============================================

export function leerFormularioNuevo(form) {
    const formData = new FormData(form);
    return {
        numero: formData.get('numero'),
        asegurado: formData.get('asegurado'),
        telefono: formData.get('telefono'),
        sexo: formData.get('sexo') || '',
        siniestro_total: formData.get('siniestro_total') || 'No',
        observaciones: formData.get('observaciones') || ''
    };
}

export function resetFormularioNuevo(form) {
    form.reset();
    const telInput = form.querySelector('[name="telefono"]');
    if (telInput) telInput.value = '+595 ';
}

export function getInputsFormularioNuevo(form) {
    return {
        numInput: form.querySelector('[name="numero"]'),
        asegInput: form.querySelector('[name="asegurado"]'),
        telInput: form.querySelector('[name="telefono"]')
    };
}

// ============================================
// BOTÓN GUARDAR
// ============================================

export function setEstadoBotonGuardar(guardando) {
    const btnGuardar = document.getElementById('btnGuardar');
    if (guardando) {
        btnGuardar.disabled = true;
        btnGuardar.textContent = '⏳ Guardando...';
    } else {
        btnGuardar.disabled = false;
        btnGuardar.textContent = '💾 Guardar Siniestro';
    }
}

export function marcarCampoError(inputElement) {
    inputElement.style.borderColor = '#dc3545';
}

// ============================================
// FORMULARIO DE MENSAJES
// ============================================

export function llenarFormularioMensaje(siniestro) {
    document.getElementById('nombreMensaje').value = siniestro.asegurado;
    document.getElementById('numeroMensaje').value = siniestro.numero;
    document.getElementById('tallerMensaje').value = siniestro.taller || '';
    document.getElementById('sexoMensaje').value = siniestro.sexo || '';
}

export function leerFormularioMensaje() {
    return {
        tipo: document.getElementById('tipoMensaje').value,
        nombre: document.getElementById('nombreMensaje').value || '[Nombre]',
        numero: document.getElementById('numeroMensaje').value || '[Nº Siniestro]',
        taller: document.getElementById('tallerMensaje').value || '[Taller]',
        sexo: document.getElementById('sexoMensaje').value
    };
}

export function setPreviewMensaje(texto) {
    document.getElementById('previaMensaje').textContent = texto;
}

export function getPreviewMensaje() {
    return document.getElementById('previaMensaje').textContent;
}

// ============================================
// FORMULARIO DE REPORTES
// ============================================

export function leerFechasReporte() {
    return {
        fechaDesde: document.getElementById('fechaDesde').value,
        fechaHasta: document.getElementById('fechaHasta').value
    };
}

// ============================================
// FILTROS
// ============================================

export function leerFiltros() {
    return {
        asegurado: document.getElementById('buscarAsegurado')?.value.trim() || '',
        numero: document.getElementById('buscarSiniestro')?.value.trim() || '',
        estado: document.getElementById('filtroEstado')?.value || ''
    };
}
