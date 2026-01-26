// ============================================
// HANDLERS DE REPORTES
// ============================================

import { mostrarAlerta, leerFechasReporte } from '../ui.js';
import {
    filtrarSiniestrosPorFecha,
    generarHtmlReporte,
    generarCsvReporte,
    generarNombreArchivoReporte
} from '../siniestros/siniestros-reports.js';

export function handleGenerarReporte() {
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

export function handleExportarExcel() {
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
