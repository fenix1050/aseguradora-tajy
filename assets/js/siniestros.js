// ============================================
// SINIESTROS.JS - CRUD y Lógica de Siniestros
// ============================================
// Este módulo maneja:
// - Estado de siniestros
// - Queries a Supabase
// - Lógica de negocio
// NO maneja DOM ni UI directamente

import { getClienteSupabase, manejarErrorSesion } from './supabase.js';
import { getUsuarioActual, getUserId } from './auth.js';
import {
    cacheManager,
    busquedaFuzzy,
    normalizarQueryBusqueda,
    obtenerSiniestrosPendientesSeguimiento,
    obtenerSaludoFormal,
    calcularDiasTranscurridos,
    requiereSeguimiento,
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

/**
 * Busca siniestro por ID con fallback a Supabase + cache
 * 1. Busca en array actual (página)
 * 2. Busca en cache en memoria
 * 3. Fallback a Supabase si no encontrado
 * @param {number} id - ID del siniestro
 * @returns {Promise<Object|null>} Datos del siniestro o null
 */
export async function getSiniestroByIdWithFallback(id) {
    // 1. Buscar en array actual (comportamiento rápido)
    let siniestro = siniestros.find(s => s.id === id);
    if (siniestro) return siniestro;

    // 2. Buscar en cache en memoria
    const cacheKey = `siniestro_id_${id}`;
    siniestro = cacheManager.get(cacheKey);
    if (siniestro) return siniestro;

    // 3. Fallback a Supabase
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) return null;

    const userId = await getUserId();
    if (!userId) return null;

    try {
        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('*')
            .eq('id', id)
            .eq('user_id', userId)
            .single();

        if (!error && data) {
            // Guardar en cache
            cacheManager.set(cacheKey, data);
            return data;
        }
    } catch (e) {
        console.error('Error en fallback a Supabase:', e);
    }

    return null;
}

/**
 * Precarga IDs de siniestros en cache individual
 * Optimización: aprovecha datos ya cargados para evitar queries futuras
 * Estrategia: Warm Cache Pasivo Post-Render (FASE 4.2)
 * 
 * @param {Array<Object>} siniestros - Array de siniestros a precachear
 * @returns {number} Cantidad de IDs cacheados
 */
export function prewarmCacheIds(siniestros) {
    if (!Array.isArray(siniestros) || siniestros.length === 0) {
        return 0;
    }

    let cacheados = 0;
    
    try {
        siniestros.forEach(siniestro => {
            if (siniestro && siniestro.id) {
                const cacheKey = `siniestro_id_${siniestro.id}`;
                // Solo cachear si NO existe ya (respeta TTL)
                if (!cacheManager.get(cacheKey)) {
                    cacheManager.set(cacheKey, siniestro);
                    cacheados++;
                }
            }
        });

    } catch (e) {
        console.error('Error en prewarmCacheIds:', e);
    }

    return cacheados;
}

// ============================================
// CACHE DE ASEGURADOS
// ============================================

export async function actualizarCacheAsegurados() {
    const clienteSupabase = getClienteSupabase();
    const ahora = Date.now();

    // FASE 5.2.1: Hit cache si es reciente y no está vacío
    // TTL: 5 minutos (300000 ms)
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
            
            // FASE 5.2.1: Invalidar cache de búsquedas cuando la fuente cambia
            // Esto fuerza recálculo de fuzzy matching en próxima búsqueda
            cacheManager.invalidate('search_');
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

    // ============================================
    // FASE 5.2.1: CACHE HIT - Búsqueda ya calculada
    // ============================================
    const userId = await getUserId();
    if (!userId) return [];
    
    const cacheKey = `search_${normalizarQueryBusqueda(query)}_${userId}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
        return cached;
    }

    // ============================================
    // FASE 5.2.1: CACHE MISS - Calcular búsqueda
    // ============================================
    const asegurados = await actualizarCacheAsegurados();
    const resultados = busquedaFuzzy(query, asegurados, 'asegurado', 0.35);
    
    // ============================================
    // FASE 5.2.1: CACHE SET - Guardar para próxima consulta
    // ============================================
    cacheManager.set(cacheKey, resultados);

    return resultados;
}

/**
 * Busca siniestros por número de siniestro en el array cargado en memoria
 * Filtra directamente sin acceder a DB/CACHE
 * Se usa por handleBusquedaPorNumero en filtros.handlers.js
 * 
 * @param {string} query - Número de siniestro a buscar
 * @returns {Array} Array de siniestros que coinciden
 */
export function buscarSiniestrosPorNumero(query) {
    if (!query || query.length < 1) {
        return [];
    }

    const queryLower = query.toLowerCase();
    return siniestros.filter(s => 
        s.numero && s.numero.toLowerCase().includes(queryLower)
    );
}

// Búsqueda fuzzy cuando no hay resultados exactos
async function buscarConFuzzy(query, filtroEstado) {
    const clienteSupabase = getClienteSupabase();

    try {
        const userId = await getUserId();
        if (!userId) return [];

        // Proyección explícita para búsqueda fuzzy
        let queryDB = clienteSupabase
            .from('siniestros')
            .select('id, numero, asegurado, sexo, telefono, fecha, tipo, estado, monto, taller, observaciones, created_at')
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
 * Genera clave de cache basada en userId, página, orden y filtros
 */
function generarClaveCacheSiniestros(userId, pagina, orden, filtros) {
    return `siniestros_${userId}_p${pagina}_${orden.columna}_${orden.direccion}_${filtros.asegurado}_${filtros.numero}_${filtros.estado}`;
}

/**
 * FASE 5.2.1: Invalida el cache de siniestros
 * Se llama cuando hay cambios (crear, editar, eliminar)
 */
function invalidarCacheSiniestros() {
    cacheManager.invalidate('siniestros_');
}

/**
 * FASE 5.2.1: Invalida explícitamente el cache de asegurados
 * Se llama cuando la fuente de datos cambia (edición de asegurado, eliminación)
 * Esto fuerza recalculo de búsquedas fuzzy en próxima consulta
 */
function invalidarCacheAsegurados() {
    ultimaActualizacionCache = 0;  // Fuerza recarga en próxima llamada
    cacheAsegurados = [];           // Limpia cache local
    cacheManager.invalidate('search_'); // Invalida resultados de búsqueda
}

/**
 * Carga siniestros desde Supabase con cache inteligente
 * @returns {Object} { success, data, totalRegistros, fuzzyUsado, fuzzyQuery, pendientesSeguimiento, error, fromCache }
 */
export async function cargarSiniestros(pagina = 0, aplicarFiltros = false) {
    const clienteSupabase = getClienteSupabase();

    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no está inicializado' };
    }

    paginaActual = pagina;

    // Obtener userId una sola vez
    const userId = await getUserId();
    if (!userId) {
        return { success: false, error: 'No hay usuario autenticado' };
    }

    // Intentar obtener del cache (con o sin filtros)
    try {
        const cacheKey = generarClaveCacheSiniestros(userId, pagina, ordenActual, filtrosActuales);
        const cachedData = cacheManager.get(cacheKey);

        if (cachedData) {
            siniestros = cachedData.siniestros || [];
            totalRegistros = cachedData.totalRegistros || 0;

            console.log(`✅ ${siniestros.length} siniestros cargados desde CACHE (página ${pagina + 1})`);

            return {
                success: true,
                data: siniestros,
                totalRegistros,
                paginaActual,
                fuzzyUsado: false,
                fuzzyQuery: null,
                pendientesSeguimiento: 0,
                diasAlerta: DIAS_ALERTA_SEGUIMIENTO,
                fromCache: true
            };
        }
    } catch (e) {
        // Si falla el cache, continuar con la consulta normal
        console.warn('Error al verificar cache, continuando con consulta:', e);
    }

    try {

        // Proyección explícita: solo traer las columnas necesarias
        let query = clienteSupabase
            .from('siniestros')
            .select('id, numero, asegurado, sexo, telefono, fecha, tipo, estado, monto, poliza, taller, observaciones, created_at', { count: 'exact' })
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

        if (error) {
            // Intentar manejar error de sesión expirada
            const errorManejado = await manejarErrorSesion(error);
            if (errorManejado) {
                // Reintentar la carga después de refrescar el token
                return cargarSiniestros(pagina, aplicarFiltros);
            }
            throw error;
        }

        // Precalcular campos derivados una sola vez
        const siniestrosConCalculos = (data || []).map(siniestro => ({
            ...siniestro,
            diasTranscurridos: calcularDiasTranscurridos(siniestro.fecha),
            requiereSeguimiento: requiereSeguimiento(siniestro)
        }));

        siniestros = siniestrosConCalculos;
        totalRegistros = count || 0;

        let fuzzyUsado = false;
        let fuzzyQuery = null;

        // Si no hay resultados con búsqueda exacta y hay filtro de asegurado, intentar fuzzy search
        if (siniestros.length === 0 && filtrosActuales.asegurado && filtrosActuales.asegurado.length >= 2) {
            const resultadosFuzzy = await buscarConFuzzy(filtrosActuales.asegurado, filtrosActuales.estado);
            if (resultadosFuzzy.length > 0) {
                // Precalcular campos derivados también para resultados fuzzy
                const fuzzyConCalculos = resultadosFuzzy.map(siniestro => ({
                    ...siniestro,
                    diasTranscurridos: calcularDiasTranscurridos(siniestro.fecha),
                    requiereSeguimiento: requiereSeguimiento(siniestro)
                }));
                siniestros = fuzzyConCalculos;
                totalRegistros = fuzzyConCalculos.length;
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

        // Guardar en caché con clave específica (userId ya está disponible)
        try {
            const cacheKey = generarClaveCacheSiniestros(userId, pagina, ordenActual, filtrosActuales);
            cacheManager.set(cacheKey, {
                siniestros,
                totalRegistros,
                paginaActual
            });
        } catch (e) {
            // Fallar silenciosamente si no se puede cachear
        }

        console.log(`✅ ${siniestros.length} siniestros cargados desde DB (página ${pagina + 1}, total: ${totalRegistros})`);

        return {
            success: true,
            data: siniestros,
            totalRegistros,
            paginaActual,
            fuzzyUsado,
            fuzzyQuery,
            pendientesSeguimiento,
            diasAlerta: DIAS_ALERTA_SEGUIMIENTO,
            fromCache: false
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
        // Obtener fecha local de Paraguay (GMT-4)
        const ahora = new Date();
        const offsetParaguay = -4 * 60; // Paraguay está en GMT-4
        const fechaParaguay = new Date(ahora.getTime() + (ahora.getTimezoneOffset() + offsetParaguay) * 60000);
        const fechaActual = fechaParaguay.toISOString().split('T')[0];

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

        // FASE 5.2.1: Invalidar caches después de crear
        invalidarCacheSiniestros();                // Cache de listados
        invalidarCacheAsegurados();                // Cache de búsquedas (nuevo asegurado)

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

        // FASE 5.2.1: Invalidar caches después de actualizar
        invalidarCacheSiniestros();                    // Cache de listados
        // Si cambió el nombre del asegurado, invalidar búsquedas fuzzy
        if (data && data[0] && data[0].asegurado !== datosActualizados.asegurado) {
            invalidarCacheAsegurados();
        }
        cacheManager.invalidate(`siniestro_id_${id}`); // Cache individual

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

        // FASE 5.2.1: Invalidar caches después de eliminar
        invalidarCacheSiniestros();        // Cache de listados
        invalidarCacheAsegurados();        // Cache de búsquedas (reduce lista de asegurados)
        cacheManager.invalidate(`siniestro_id_${id}`); // Cache individual

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
