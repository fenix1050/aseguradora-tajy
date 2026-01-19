// ============================================
// SINIESTROS.JS - CRUD y Lógica de Siniestros
// ============================================
// Este módulo maneja:
// - Estado de siniestros
// - Queries a Supabase
// - Lógica de negocio
// NO maneja DOM ni UI directamente

import { getClienteSupabase } from './supabase.js';
import { getUsuarioActual, getUserId } from './auth.js';
import {
    cacheManager,
    debounce,
    busquedaFuzzy,
    obtenerSiniestrosPendientesSeguimiento,
    obtenerSaludoFormal,
    DIAS_ALERTA_SEGUIMIENTO,
    LIMITE_POR_PAGINA
} from './utils.js';

// ============================================
// ESTADO
// ============================================

let siniestros = [];
let paginaActual = 0;
let totalRegistros = 0;
let ordenActual = { columna: 'created_at', direccion: 'desc' };
let filtrosActuales = { asegurado: '', numero: '', estado: '' };

// Cache de asegurados para sugerencias
let cacheAsegurados = [];
let ultimaActualizacionCache = 0;

// ============================================
// GETTERS Y SETTERS
// ============================================

export function getSiniestros() {
    return siniestros;
}

export function getPaginaActual() {
    return paginaActual;
}

export function getTotalRegistros() {
    return totalRegistros;
}

export function getOrdenActual() {
    return ordenActual;
}

export function getFiltrosActuales() {
    return filtrosActuales;
}

export function setFiltros(nuevosFiltros) {
    filtrosActuales = nuevosFiltros;
}

export function getSiniestroById(id) {
    return siniestros.find(s => s.id === id);
}

export function getSiniestroByAsegurado(nombre) {
    return siniestros.find(s => s.asegurado === nombre);
}

// ============================================
// CACHE DE ASEGURADOS
// ============================================

export async function actualizarCacheAsegurados() {
    const clienteSupabase = getClienteSupabase();
    const ahora = Date.now();

    // Actualizar cada 5 minutos
    if (ahora - ultimaActualizacionCache < 300000 && cacheAsegurados.length > 0) {
        return cacheAsegurados;
    }

    try {
        const userId = await getUserId();
        if (!userId) return cacheAsegurados;

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('asegurado, numero')
            .eq('user_id', userId)
            .order('asegurado');

        if (!error && data) {
            cacheAsegurados = data;
            ultimaActualizacionCache = ahora;
        }
    } catch (e) {
        console.error('Error actualizando cache:', e);
    }

    return cacheAsegurados;
}

// ============================================
// BÚSQUEDA
// ============================================

export async function buscarAseguradosFuzzy(query) {
    if (query.length < 2) {
        return [];
    }

    const asegurados = await actualizarCacheAsegurados();
    return busquedaFuzzy(query, asegurados, 'asegurado', 0.35);
}

// Búsqueda fuzzy cuando no hay resultados exactos
async function buscarConFuzzy(query, filtroEstado) {
    const clienteSupabase = getClienteSupabase();

    try {
        const userId = await getUserId();
        if (!userId) return [];

        let queryDB = clienteSupabase
            .from('siniestros')
            .select('*')
            .eq('user_id', userId);

        if (filtroEstado) {
            queryDB = queryDB.eq('estado', filtroEstado);
        }

        const { data, error } = await queryDB.order('asegurado');

        if (error || !data) return [];

        const resultados = busquedaFuzzy(query, data, 'asegurado', 0.4);
        return resultados.map(r => r.item);
    } catch (e) {
        console.error('Error en búsqueda fuzzy:', e);
        return [];
    }
}

// ============================================
// CARGAR SINIESTROS
// ============================================

/**
 * Carga siniestros desde Supabase
 * @returns {Object} { success, data, totalRegistros, fuzzyUsado, fuzzyQuery, pendientesSeguimiento, error }
 */
export async function cargarSiniestros(pagina = 0, aplicarFiltros = false) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no está inicializado' };
    }

    paginaActual = pagina;

    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'No hay usuario autenticado' };
        }

        let query = clienteSupabase
            .from('siniestros')
            .select('*', { count: 'exact' })
            .eq('user_id', userId);

        // Aplicar filtros si están activos
        if (aplicarFiltros) {
            if (filtrosActuales.asegurado) {
                query = query.ilike('asegurado', `%${filtrosActuales.asegurado}%`);
            }
            if (filtrosActuales.numero) {
                query = query.ilike('numero', `%${filtrosActuales.numero}%`);
            }
            if (filtrosActuales.estado) {
                query = query.eq('estado', filtrosActuales.estado);
            }
        }

        // Aplicar ordenamiento
        query = query.order(ordenActual.columna, { ascending: ordenActual.direccion === 'asc' });

        // Aplicar paginación
        const desde = pagina * LIMITE_POR_PAGINA;
        const hasta = (pagina + 1) * LIMITE_POR_PAGINA - 1;
        query = query.range(desde, hasta);

        const { data, error, count } = await query;

        if (error) throw error;

        siniestros = data || [];
        totalRegistros = count || 0;

        let fuzzyUsado = false;
        let fuzzyQuery = null;

        // Si no hay resultados con búsqueda exacta y hay filtro de asegurado, intentar fuzzy search
        if (siniestros.length === 0 && filtrosActuales.asegurado && filtrosActuales.asegurado.length >= 2) {
            const resultadosFuzzy = await buscarConFuzzy(filtrosActuales.asegurado, filtrosActuales.estado);
            if (resultadosFuzzy.length > 0) {
                siniestros = resultadosFuzzy;
                totalRegistros = resultadosFuzzy.length;
                fuzzyUsado = true;
                fuzzyQuery = filtrosActuales.asegurado;
            }
        }

        // Calcular pendientes de seguimiento (solo en primera carga)
        let pendientesSeguimiento = 0;
        if (pagina === 0 && !aplicarFiltros) {
            const pendientes = obtenerSiniestrosPendientesSeguimiento(siniestros);
            pendientesSeguimiento = pendientes.length;
        }

        // Guardar en caché
        cacheManager.set('siniestros', siniestros);

        console.log(`✅ ${siniestros.length} siniestros cargados (página ${pagina + 1}, total: ${totalRegistros})`);

        return {
            success: true,
            data: siniestros,
            totalRegistros,
            paginaActual,
            fuzzyUsado,
            fuzzyQuery,
            pendientesSeguimiento,
            diasAlerta: DIAS_ALERTA_SEGUIMIENTO
        };
    } catch (error) {
        console.error('Error al cargar siniestros:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// CRUD - CREAR
// ============================================

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
        const fechaActual = new Date().toISOString().split('T')[0];

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
// CRUD - EDITAR
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

        console.log('✅ Siniestro actualizado:', data[0]);
        return { success: true, data: data[0] };
    } catch (error) {
        console.error('Error al actualizar siniestro:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// CRUD - ELIMINAR
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

        console.log('✅ Siniestro eliminado');
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar siniestro:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ORDENAMIENTO
// ============================================

export function cambiarOrden(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }
    return ordenActual;
}

// ============================================
// MENSAJES WHATSAPP
// ============================================

/**
 * Genera el texto del mensaje según la plantilla
 * @param {string} tipo - Tipo de plantilla
 * @param {Object} datos - Datos del mensaje (nombre, numero, sexo)
 * @returns {string} Texto del mensaje
 */
export function generarMensaje(tipo, datos) {
    const saludo = obtenerSaludoFormal(datos.nombre, datos.sexo);
    const usuarioActual = getUsuarioActual();
    const nombreTramitador = usuarioActual ? usuarioActual.nombre : 'Aseguradora Tajy';

    const plantillas = {
        aprobado: `${saludo}, le saluda ${nombreTramitador} de la Aseguradora Tajy. Le comento que su siniestro ${datos.numero} ha sido aprobado, puede pasar por el taller para la realización del presupuesto.`,
        consulta: `${saludo}, necesitamos que nos envíe los documentos solicitados para continuar con el trámite de su siniestro ${datos.numero}. 📑✉️`,
        seguimiento: `${saludo}, nos comunicamos para realizar un seguimiento a su siniestro ${datos.numero}. Si tiene consultas, quedo a disposición. 📞🤝`,
        rechazado: `${saludo}, lamentamos informarle que su siniestro ${datos.numero} ha sido rechazado. Para más detalles puede contactarnos. ❌📋`,
        presupuesto: `${saludo}, por favor remítanos el presupuesto de los daños del siniestro ${datos.numero} para proceder. 💰📝`
    };

    return plantillas[tipo] || '';
}

/**
 * Genera la URL de WhatsApp
 * @param {string} telefono - Número de teléfono
 * @param {string} mensaje - Mensaje a enviar
 * @returns {string|null} URL de WhatsApp o null si no hay teléfono
 */
export function generarUrlWhatsApp(telefono, mensaje) {
    const numeroLimpio = telefono ? telefono.replace(/[^\d]/g, '') : '';

    if (!numeroLimpio) {
        return null;
    }

    return `https://wa.me/${numeroLimpio}?text=${encodeURIComponent(mensaje)}`;
}

// ============================================
// REPORTES
// ============================================

/**
 * Filtra siniestros por rango de fechas
 * @param {string} fechaDesde - Fecha inicio
 * @param {string} fechaHasta - Fecha fin
 * @returns {Object} { success, data, error }
 */
export function filtrarSiniestrosPorFecha(fechaDesde, fechaHasta) {
    if (!fechaDesde || !fechaHasta) {
        return { success: false, error: 'Por favor, selecciona ambas fechas' };
    }

    const reporteSiniestros = siniestros.filter(s => {
        const fechaSiniestro = new Date(s.fecha);
        return fechaSiniestro >= new Date(fechaDesde) && fechaSiniestro <= new Date(fechaHasta);
    });

    if (reporteSiniestros.length === 0) {
        return { success: false, error: 'No se encontraron siniestros en el período seleccionado' };
    }

    return { success: true, data: reporteSiniestros };
}

/**
 * Genera HTML del reporte
 * @param {Array} reporteSiniestros - Siniestros filtrados
 * @param {string} fechaDesde - Fecha inicio
 * @param {string} fechaHasta - Fecha fin
 * @returns {string} HTML del reporte
 */
export function generarHtmlReporte(reporteSiniestros, fechaDesde, fechaHasta) {
    // Importar obtenerTextoEstado inline para evitar dependencia circular
    const obtenerTextoEstado = (estado) => {
        const textos = {
            'pendiente': 'Pendiente',
            'proceso': 'En Proceso',
            'aprobado': 'Aprobado',
            'taller': 'Liquidado',
            'rechazado': 'Rechazado'
        };
        return textos[estado] || estado;
    };

    let html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Reporte de Siniestros</title>
            <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                h2 { color: #0056b3; border-bottom: 3px solid #0056b3; padding-bottom: 10px; }
                .info { margin: 20px 0; padding: 15px; background: #f8f9fa; border-radius: 8px; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 12px; border: 1px solid #dee2e6; text-align: left; }
                th { background: #0056b3; color: white; font-weight: 600; }
                tr:nth-child(even) { background: #f8f9fa; }
                .footer { margin-top: 30px; text-align: center; color: #666; font-size: 0.9em; }
            </style>
        </head>
        <body>
            <h2>📊 Reporte de Siniestros - Aseguradora Tajy</h2>
            <div class="info">
                <p><strong>Período:</strong> ${new Date(fechaDesde).toLocaleDateString('es-PY')} - ${new Date(fechaHasta).toLocaleDateString('es-PY')}</p>
                <p><strong>Total de registros:</strong> ${reporteSiniestros.length}</p>
                <p><strong>Generado:</strong> ${new Date().toLocaleString('es-PY')}</p>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Nº Siniestro</th>
                        <th>Asegurado</th>
                        <th>Teléfono</th>
                        <th>Fecha</th>
                        <th>Tipo</th>
                        <th>Estado</th>
                        <th>Monto</th>
                    </tr>
                </thead>
                <tbody>
    `;

    reporteSiniestros.forEach(s => {
        html += `
            <tr>
                <td>${s.numero}</td>
                <td>${s.asegurado}</td>
                <td>${s.telefono}</td>
                <td>${new Date(s.fecha).toLocaleDateString('es-PY')}</td>
                <td>${s.tipo}</td>
                <td>${obtenerTextoEstado(s.estado)}</td>
                <td>${s.monto}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
            </table>
            <div class="footer">
                <p>Aseguradora Tajy - Sistema de Gestión de Siniestros</p>
            </div>
        </body>
        </html>
    `;

    return html;
}

/**
 * Genera contenido CSV para exportar
 * @param {Array} reporteSiniestros - Siniestros filtrados
 * @returns {string} Contenido CSV
 */
export function generarCsvReporte(reporteSiniestros) {
    const obtenerTextoEstado = (estado) => {
        const textos = {
            'pendiente': 'Pendiente',
            'proceso': 'En Proceso',
            'aprobado': 'Aprobado',
            'taller': 'Liquidado',
            'rechazado': 'Rechazado'
        };
        return textos[estado] || estado;
    };

    let csv = '\uFEFF'; // BOM para UTF-8
    csv += 'Nº Siniestro,Asegurado,Teléfono,Fecha,Tipo,Estado,Monto,Observaciones\n';

    reporteSiniestros.forEach(s => {
        csv += `"${s.numero}","${s.asegurado}","${s.telefono}","${new Date(s.fecha).toLocaleDateString('es-PY')}","${s.tipo}","${obtenerTextoEstado(s.estado)}","${s.monto}","${s.observaciones || ''}"\n`;
    });

    return csv;
}

/**
 * Genera nombre de archivo para el reporte
 * @param {string} fechaDesde - Fecha inicio
 * @param {string} fechaHasta - Fecha fin
 * @returns {string} Nombre del archivo
 */
export function generarNombreArchivoReporte(fechaDesde, fechaHasta) {
    return `reporte_siniestros_${fechaDesde}_${fechaHasta}.csv`;
}
