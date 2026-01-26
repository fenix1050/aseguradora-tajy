// ============================================
// SINIESTROS-SEARCH.JS - Búsqueda y Filtrado
// ============================================
// Este módulo maneja:
// - Estado de siniestros (paginación, filtros, ordenamiento)
// - Cache de asegurados para autocompletado
// - Búsqueda fuzzy de asegurados
// - Cargar siniestros con filtros y paginación
// - Ordenamiento de columnas

import { getClienteSupabase, manejarErrorSesion } from '../supabase.js';
import { getUserId } from '../auth.js';
import {
    cacheManager,
    busquedaFuzzy,
    normalizarQueryBusqueda,
    obtenerSiniestrosPendientesSeguimiento,
    calcularDiasTranscurridos,
    requiereSeguimiento,
    DIAS_ALERTA_SEGUIMIENTO,
    LIMITE_POR_PAGINA
} from '../utils.js';

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

/**
 * Invalida explícitamente el cache de asegurados
 * Se llama cuando la fuente de datos cambia (edición de asegurado, eliminación)
 * Esto fuerza recalculo de búsquedas fuzzy en próxima consulta
 */
export function invalidarCacheAsegurados() {
    ultimaActualizacionCache = 0;  // Fuerza recarga en próxima llamada
    cacheAsegurados = [];           // Limpia cache local
    cacheManager.invalidate('search_'); // Invalida resultados de búsqueda
}

/**
 * Actualiza el cache de asegurados desde la base de datos
 * TTL: 5 minutos
 * @returns {Promise<Array>} Array de asegurados cacheados
 */
export async function actualizarCacheAsegurados() {
    const clienteSupabase = getClienteSupabase();
    const ahora = Date.now();

    // Hit cache si es reciente y no está vacío (TTL: 5 minutos)
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

            // Invalidar cache de búsquedas cuando la fuente cambia
            // Esto fuerza recálculo de fuzzy matching en próxima búsqueda
            cacheManager.invalidate('search_');
        }
    } catch (e) {
        console.error('Error actualizando cache:', e);
    }

    return cacheAsegurados;
}

// ============================================
// BÚSQUEDA FUZZY
// ============================================

/**
 * Busca asegurados usando fuzzy matching con cache
 * @param {string} query - Texto de búsqueda
 * @returns {Promise<Array>} Resultados con score
 */
export async function buscarAseguradosFuzzy(query) {
    if (query.length < 2) {
        return [];
    }

    // CACHE HIT - Búsqueda ya calculada
    const userId = await getUserId();
    if (!userId) return [];

    const cacheKey = `search_${normalizarQueryBusqueda(query)}_${userId}`;
    const cached = cacheManager.get(cacheKey);
    if (cached) {
        return cached;
    }

    // CACHE MISS - Calcular búsqueda
    const asegurados = await actualizarCacheAsegurados();
    const resultados = busquedaFuzzy(query, asegurados, 'asegurado', 0.35);

    // CACHE SET - Guardar para próxima consulta
    cacheManager.set(cacheKey, resultados);

    return resultados;
}

/**
 * Busca siniestros por número en el array cargado en memoria
 * No accede a DB/CACHE, solo filtra el array actual
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

/**
 * Búsqueda fuzzy en toda la DB cuando no hay resultados exactos
 * @param {string} query - Texto de búsqueda
 * @param {string} filtroEstado - Filtro de estado opcional
 * @returns {Promise<Array>} Array de siniestros encontrados
 */
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
 * Carga siniestros desde Supabase con cache inteligente
 * @param {number} pagina - Número de página (0-indexed)
 * @param {boolean} aplicarFiltros - Si se aplican los filtros actuales
 * @returns {Promise<Object>} { success, data, totalRegistros, fuzzyUsado, fuzzyQuery, pendientesSeguimiento, error, fromCache }
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

        // Guardar en caché con clave específica
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
// ORDENAMIENTO
// ============================================

/**
 * Cambia el orden de la columna especificada
 * Si es la misma columna, alterna entre asc/desc
 * Si es nueva columna, establece asc
 * @param {string} columna - Nombre de la columna a ordenar
 * @returns {Object} Estado de orden actualizado
 */
export function cambiarOrden(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }
    return ordenActual;
}
