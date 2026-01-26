// ============================================
// SINIESTROS.JS - Módulo de Re-exportación
// ============================================
// Este archivo sirve como "puente" para mantener compatibilidad
// con código existente que importaba desde siniestros.js
//
// REFACTORIZACIÓN: El código original ha sido dividido en 3 módulos:
// - siniestros/siniestros-crud.js (CRUD operations)
// - siniestros/siniestros-search.js (Search, filters, pagination)
// - siniestros/siniestros-reports.js (Reports and WhatsApp messages)
//
// IMPORTANTE: Los nuevos imports deberían usar los módulos específicos
// directamente, pero este archivo mantiene la retrocompatibilidad.

// Re-exportar desde módulo CRUD
export {
    crearSiniestro,
    actualizarSiniestro,
    eliminarSiniestro,
    getSiniestroByIdWithFallback,
    prewarmCacheIds,
    invalidarCacheSiniestros
} from './siniestros/siniestros-crud.js';

// Re-exportar desde módulo SEARCH
export {
    cargarSiniestros,
    buscarAseguradosFuzzy,
    buscarSiniestrosPorNumero,
    actualizarCacheAsegurados,
    invalidarCacheAsegurados,
    cambiarOrden,
    getSiniestros,
    getPaginaActual,
    getTotalRegistros,
    getOrdenActual,
    getFiltrosActuales,
    setFiltros,
    getSiniestroById,
    getSiniestroByAsegurado
} from './siniestros/siniestros-search.js';

// Re-exportar desde módulo REPORTS
export {
    generarMensaje,
    generarUrlWhatsApp,
    filtrarSiniestrosPorFecha,
    generarHtmlReporte,
    generarCsvReporte,
    generarNombreArchivoReporte
} from './siniestros/siniestros-reports.js';
