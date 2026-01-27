// ============================================
// DASHBOARD.JS - Métricas y KPIs
// ============================================
// Este módulo maneja:
// - Obtención de métricas de siniestros
// - Cálculo de KPIs (por estado, tendencias, promedios)
// - Alertas y siniestros urgentes
// - Top talleres

import { getClienteSupabase } from './supabase.js';
import { getUserId } from './auth.js';
import { calcularDiasTranscurridos, requiereSeguimiento, DIAS_ALERTA_SEGUIMIENTO } from './utils.js';

// ============================================
// MÉTRICAS POR ESTADO
// ============================================

/**
 * Obtiene conteo de siniestros por estado
 * @returns {Promise<Object>} { success, data: { pendiente, proceso, aprobado, taller, rechazado, total } }
 */
export async function obtenerMetricasPorEstado() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no inicializado' };
    }

    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'No hay usuario autenticado' };
        }

        // Query todos los siniestros del usuario
        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('estado')
            .eq('user_id', userId);

        if (error) throw error;

        // Contar por estado
        const metricas = {
            pendiente: 0,
            proceso: 0,
            aprobado: 0,
            taller: 0,
            rechazado: 0,
            total: data.length
        };

        data.forEach(s => {
            if (metricas.hasOwnProperty(s.estado)) {
                metricas[s.estado]++;
            }
        });

        return { success: true, data: metricas };
    } catch (error) {
        console.error('Error obteniendo métricas por estado:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// TENDENCIA MENSUAL
// ============================================

/**
 * Obtiene tendencia de siniestros por mes (últimos 6 meses)
 * @returns {Promise<Object>} { success, data: [{ mes, cantidad }] }
 */
export async function obtenerTendenciaMensual() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no inicializado' };
    }

    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'No hay usuario autenticado' };
        }

        // Obtener fecha de hace 6 meses
        const hace6Meses = new Date();
        hace6Meses.setMonth(hace6Meses.getMonth() - 6);
        const fechaDesde = hace6Meses.toISOString().split('T')[0];

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('fecha, created_at')
            .eq('user_id', userId)
            .gte('created_at', fechaDesde)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Agrupar por mes
        const mesesMap = {};
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        data.forEach(s => {
            const fecha = new Date(s.created_at);
            const mesAnio = `${meses[fecha.getMonth()]} ${fecha.getFullYear().toString().slice(-2)}`;
            mesesMap[mesAnio] = (mesesMap[mesAnio] || 0) + 1;
        });

        // Convertir a array ordenado
        const tendencia = Object.entries(mesesMap).map(([mes, cantidad]) => ({
            mes,
            cantidad
        }));

        return { success: true, data: tendencia };
    } catch (error) {
        console.error('Error obteniendo tendencia mensual:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// TIEMPO PROMEDIO DE RESOLUCIÓN
// ============================================

/**
 * Calcula tiempo promedio desde creación hasta resolución (aprobado/rechazado)
 * @returns {Promise<Object>} { success, data: { promedioAprobado, promedioRechazado } }
 */
export async function obtenerTiempoPromedioResolucion() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no inicializado' };
    }

    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'No hay usuario autenticado' };
        }

        // Obtener siniestros aprobados y rechazados
        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('estado, fecha, updated_at, created_at')
            .eq('user_id', userId)
            .in('estado', ['aprobado', 'rechazado']);

        if (error) throw error;

        const tiemposAprobado = [];
        const tiemposRechazado = [];

        data.forEach(s => {
            const creado = new Date(s.created_at);
            const actualizado = new Date(s.updated_at);
            const diasTranscurridos = Math.floor((actualizado - creado) / (1000 * 60 * 60 * 24));

            if (s.estado === 'aprobado') {
                tiemposAprobado.push(diasTranscurridos);
            } else if (s.estado === 'rechazado') {
                tiemposRechazado.push(diasTranscurridos);
            }
        });

        const promedioAprobado = tiemposAprobado.length > 0
            ? (tiemposAprobado.reduce((a, b) => a + b, 0) / tiemposAprobado.length).toFixed(1)
            : 0;

        const promedioRechazado = tiemposRechazado.length > 0
            ? (tiemposRechazado.reduce((a, b) => a + b, 0) / tiemposRechazado.length).toFixed(1)
            : 0;

        return {
            success: true,
            data: {
                promedioAprobado: parseFloat(promedioAprobado),
                promedioRechazado: parseFloat(promedioRechazado),
                totalAprobados: tiemposAprobado.length,
                totalRechazados: tiemposRechazado.length
            }
        };
    } catch (error) {
        console.error('Error calculando tiempo promedio:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// TOP TALLERES
// ============================================

/**
 * Obtiene los talleres más asignados
 * @param {number} limite - Cantidad de talleres a retornar (default: 5)
 * @returns {Promise<Object>} { success, data: [{ taller, cantidad }] }
 */
export async function obtenerTopTalleres(limite = 5) {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no inicializado' };
    }

    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'No hay usuario autenticado' };
        }

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('taller')
            .eq('user_id', userId)
            .not('taller', 'eq', '')
            .not('taller', 'is', null);

        if (error) throw error;

        // Contar talleres
        const talleresMap = {};
        data.forEach(s => {
            const taller = s.taller.trim();
            if (taller) {
                talleresMap[taller] = (talleresMap[taller] || 0) + 1;
            }
        });

        // Convertir a array y ordenar
        const topTalleres = Object.entries(talleresMap)
            .map(([taller, cantidad]) => ({ taller, cantidad }))
            .sort((a, b) => b.cantidad - a.cantidad)
            .slice(0, limite);

        return { success: true, data: topTalleres };
    } catch (error) {
        console.error('Error obteniendo top talleres:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// ALERTAS ACTIVAS
// ============================================

/**
 * Obtiene siniestros con alertas (pendientes antiguos, sin seguimiento)
 * @returns {Promise<Object>} { success, data: { pendientesAntiguos, sinSeguimiento, total } }
 */
export async function obtenerAlertasActivas() {
    const clienteSupabase = getClienteSupabase();
    if (!clienteSupabase) {
        return { success: false, error: 'Supabase no inicializado' };
    }

    try {
        const userId = await getUserId();
        if (!userId) {
            return { success: false, error: 'No hay usuario autenticado' };
        }

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('id, numero, asegurado, fecha, estado')
            .eq('user_id', userId)
            .in('estado', ['pendiente', 'proceso']);

        if (error) throw error;

        const ahora = new Date();
        const pendientesAntiguos = [];
        const sinSeguimiento = [];

        data.forEach(s => {
            const diasTranscurridos = calcularDiasTranscurridos(s.fecha);

            // Pendientes > 7 días
            if (s.estado === 'pendiente' && diasTranscurridos > 7) {
                pendientesAntiguos.push({
                    ...s,
                    diasTranscurridos,
                    mensaje: `${diasTranscurridos} días sin procesar`
                });
            }

            // Sin seguimiento > 3 días
            if (requiereSeguimiento(s)) {
                sinSeguimiento.push({
                    ...s,
                    diasTranscurridos,
                    mensaje: `${diasTranscurridos} días sin seguimiento`
                });
            }
        });

        return {
            success: true,
            data: {
                pendientesAntiguos,
                sinSeguimiento,
                total: pendientesAntiguos.length + sinSeguimiento.length,
                diasAlerta: DIAS_ALERTA_SEGUIMIENTO
            }
        };
    } catch (error) {
        console.error('Error obteniendo alertas activas:', error);
        return { success: false, error: error.message };
    }
}

// ============================================
// DASHBOARD COMPLETO
// ============================================

/**
 * Obtiene todas las métricas del dashboard en una sola llamada
 * @returns {Promise<Object>} { success, data: { metricas, tendencia, tiempos, talleres, alertas } }
 */
export async function cargarDashboardCompleto() {
    try {
        // Ejecutar todas las queries en paralelo
        const [metricas, tendencia, tiempos, talleres, alertas] = await Promise.all([
            obtenerMetricasPorEstado(),
            obtenerTendenciaMensual(),
            obtenerTiempoPromedioResolucion(),
            obtenerTopTalleres(5),
            obtenerAlertasActivas()
        ]);

        // Verificar errores
        if (!metricas.success || !tendencia.success || !tiempos.success ||
            !talleres.success || !alertas.success) {
            return {
                success: false,
                error: 'Error al cargar una o más métricas del dashboard'
            };
        }

        return {
            success: true,
            data: {
                metricas: metricas.data,
                tendencia: tendencia.data,
                tiempos: tiempos.data,
                talleres: talleres.data,
                alertas: alertas.data
            }
        };
    } catch (error) {
        console.error('Error cargando dashboard completo:', error);
        return { success: false, error: error.message };
    }
}
