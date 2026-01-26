// ============================================
// SINIESTROS-REPORTS.JS - Reportes y Mensajes
// ============================================
// Este módulo maneja:
// - Generación de mensajes WhatsApp
// - Filtrado de siniestros por fecha
// - Generación de reportes HTML
// - Exportación a CSV

import { getUsuarioActual } from '../auth.js';
import {
    obtenerSaludoFormal,
    formatearFecha,
    escapeHtml,
    escapeCsv
} from '../utils.js';
import { getSiniestros } from './siniestros-search.js';

// ============================================
// MENSAJES WHATSAPP
// ============================================

/**
 * Genera el texto del mensaje según la plantilla
 * @param {string} tipo - Tipo de plantilla (aprobado, consulta, seguimiento, rechazado, presupuesto)
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
// REPORTES - FILTRADO
// ============================================

/**
 * Filtra siniestros por rango de fechas
 * @param {string} fechaDesde - Fecha inicio (YYYY-MM-DD)
 * @param {string} fechaHasta - Fecha fin (YYYY-MM-DD)
 * @returns {Object} { success, data, error }
 */
export function filtrarSiniestrosPorFecha(fechaDesde, fechaHasta) {
    if (!fechaDesde || !fechaHasta) {
        return { success: false, error: 'Por favor, selecciona ambas fechas' };
    }

    const siniestros = getSiniestros();
    const reporteSiniestros = siniestros.filter(s => {
        const fechaSiniestro = new Date(s.fecha);
        return fechaSiniestro >= new Date(fechaDesde) && fechaSiniestro <= new Date(fechaHasta);
    });

    if (reporteSiniestros.length === 0) {
        return { success: false, error: 'No se encontraron siniestros en el período seleccionado' };
    }

    return { success: true, data: reporteSiniestros };
}

// ============================================
// REPORTES - GENERACIÓN HTML
// ============================================

/**
 * Genera HTML del reporte
 * @param {Array} reporteSiniestros - Siniestros filtrados
 * @param {string} fechaDesde - Fecha inicio
 * @param {string} fechaHasta - Fecha fin
 * @returns {string} HTML del reporte
 */
export function generarHtmlReporte(reporteSiniestros, fechaDesde, fechaHasta) {
    // Función helper para obtener texto de estado
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
                <p><strong>Período:</strong> ${escapeHtml(formatearFecha(fechaDesde))} - ${escapeHtml(formatearFecha(fechaHasta))}</p>
                <p><strong>Total de registros:</strong> ${reporteSiniestros.length}</p>
                <p><strong>Generado:</strong> ${escapeHtml(new Date().toLocaleString('es-PY'))}</p>
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

    // Escapar todos los datos del usuario antes de insertar en HTML
    reporteSiniestros.forEach(s => {
        html += `
            <tr>
                <td>${escapeHtml(s.numero)}</td>
                <td>${escapeHtml(s.asegurado)}</td>
                <td>${escapeHtml(s.telefono)}</td>
                <td>${escapeHtml(formatearFecha(s.fecha))}</td>
                <td>${escapeHtml(s.tipo)}</td>
                <td>${escapeHtml(obtenerTextoEstado(s.estado))}</td>
                <td>${escapeHtml(s.monto)}</td>
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

// ============================================
// REPORTES - EXPORTACIÓN CSV
// ============================================

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

    // Escapar todos los campos para prevenir inyección de fórmulas
    reporteSiniestros.forEach(s => {
        csv += `"${escapeCsv(s.numero)}","${escapeCsv(s.asegurado)}","${escapeCsv(s.telefono)}","${escapeCsv(formatearFecha(s.fecha))}","${escapeCsv(s.tipo)}","${escapeCsv(obtenerTextoEstado(s.estado))}","${escapeCsv(s.monto)}","${escapeCsv(s.observaciones || '')}"\n`;
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
