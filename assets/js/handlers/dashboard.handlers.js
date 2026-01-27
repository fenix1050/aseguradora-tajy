// ============================================
// HANDLERS DE DASHBOARD
// ============================================

import { mostrarAlerta } from '../ui.js';
import {
    cargarDashboardCompleto,
    obtenerMetricasPorEstado,
    obtenerAlertasActivas
} from '../dashboard.js';

// Variable global para almacenar instancias de gráficos
let chartInstances = {
    estadosChart: null,
    tendenciaChart: null
};

/**
 * Handler principal: carga todas las métricas y renderiza el dashboard
 */
export async function handleCargarDashboard() {
    console.log('🚀 Cargando dashboard...');

    // Mostrar skeleton/loading
    mostrarLoadingDashboard(true);

    const resultado = await cargarDashboardCompleto();

    mostrarLoadingDashboard(false);

    if (!resultado.success) {
        mostrarAlerta('error', 'Error al cargar dashboard: ' + resultado.error);
        return;
    }

    const { metricas, tendencia, tiempos, talleres, alertas } = resultado.data;

    // Renderizar cada sección
    renderizarMetricasPorEstado(metricas);
    renderizarGraficoEstados(metricas);
    renderizarTendenciaMensual(tendencia);
    renderizarTiemposPromedio(tiempos);
    renderizarTopTalleres(talleres);
    renderizarAlertasActivas(alertas);

    console.log('✅ Dashboard cargado exitosamente');
}

/**
 * Renderiza las tarjetas de métricas por estado
 */
function renderizarMetricasPorEstado(metricas) {
    document.getElementById('metricaPendientes').textContent = metricas.pendiente;
    document.getElementById('metricaProceso').textContent = metricas.proceso;
    document.getElementById('metricaAprobados').textContent = metricas.aprobado;
    document.getElementById('metricaTaller').textContent = metricas.taller;
    document.getElementById('metricaRechazados').textContent = metricas.rechazado;
    document.getElementById('metricaTotal').textContent = metricas.total;
}

/**
 * Renderiza gráfico de torta de siniestros por estado
 */
function renderizarGraficoEstados(metricas) {
    const ctx = document.getElementById('graficoEstados');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (chartInstances.estadosChart) {
        chartInstances.estadosChart.destroy();
    }

    chartInstances.estadosChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: ['Pendientes', 'En Proceso', 'Aprobados', 'Taller', 'Rechazados'],
            datasets: [{
                data: [
                    metricas.pendiente,
                    metricas.proceso,
                    metricas.aprobado,
                    metricas.taller,
                    metricas.rechazado
                ],
                backgroundColor: [
                    '#ffc107', // Amarillo - pendiente
                    '#2196f3', // Azul - proceso
                    '#4caf50', // Verde - aprobado
                    '#00bcd4', // Cyan - taller
                    '#f44336'  // Rojo - rechazado
                ],
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return `${label}: ${value} (${percentage}%)`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Renderiza gráfico de líneas de tendencia mensual
 */
function renderizarTendenciaMensual(tendencia) {
    const ctx = document.getElementById('graficoTendencia');
    if (!ctx) return;

    // Destruir gráfico anterior si existe
    if (chartInstances.tendenciaChart) {
        chartInstances.tendenciaChart.destroy();
    }

    const labels = tendencia.map(t => t.mes);
    const data = tendencia.map(t => t.cantidad);

    chartInstances.tendenciaChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Siniestros Creados',
                data: data,
                borderColor: '#2196f3',
                backgroundColor: 'rgba(33, 150, 243, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: '#2196f3',
                pointBorderColor: '#fff',
                pointBorderWidth: 2,
                pointHoverRadius: 7
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Siniestros: ${context.parsed.y}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        stepSize: 1
                    },
                    grid: {
                        color: 'rgba(0, 0, 0, 0.05)'
                    }
                },
                x: {
                    grid: {
                        display: false
                    }
                }
            }
        }
    });
}

/**
 * Renderiza tiempos promedio de resolución
 */
function renderizarTiemposPromedio(tiempos) {
    const containerAprobado = document.getElementById('tiempoAprobado');
    const containerRechazado = document.getElementById('tiempoRechazado');

    if (containerAprobado) {
        containerAprobado.innerHTML = `
            <div class="tiempo-card">
                <div class="tiempo-valor">${tiempos.promedioAprobado} días</div>
                <div class="tiempo-label">Promedio Aprobación</div>
                <div class="tiempo-count">${tiempos.totalAprobados} siniestros</div>
            </div>
        `;
    }

    if (containerRechazado) {
        containerRechazado.innerHTML = `
            <div class="tiempo-card">
                <div class="tiempo-valor">${tiempos.promedioRechazado} días</div>
                <div class="tiempo-label">Promedio Rechazo</div>
                <div class="tiempo-count">${tiempos.totalRechazados} siniestros</div>
            </div>
        `;
    }
}

/**
 * Renderiza top talleres
 */
function renderizarTopTalleres(talleres) {
    const container = document.getElementById('topTalleres');
    if (!container) return;

    if (talleres.length === 0) {
        container.innerHTML = '<p class="texto-vacio">No hay talleres asignados aún</p>';
        return;
    }

    const maxCantidad = Math.max(...talleres.map(t => t.cantidad));

    const html = talleres.map((t, index) => {
        const porcentaje = (t.cantidad / maxCantidad) * 100;
        return `
            <div class="taller-item">
                <div class="taller-info">
                    <span class="taller-rank">#${index + 1}</span>
                    <span class="taller-nombre">${t.taller}</span>
                    <span class="taller-cantidad">${t.cantidad}</span>
                </div>
                <div class="taller-barra">
                    <div class="taller-progreso" style="width: ${porcentaje}%"></div>
                </div>
            </div>
        `;
    }).join('');

    container.innerHTML = html;
}

/**
 * Renderiza alertas activas
 */
function renderizarAlertasActivas(alertas) {
    const container = document.getElementById('alertasActivas');
    if (!container) return;

    const total = alertas.total;

    if (total === 0) {
        container.innerHTML = `
            <div class="alerta-vacia">
                <span style="font-size: 48px;">✅</span>
                <p style="margin-top: 10px; color: #4caf50; font-weight: 600;">
                    ¡Todo al día! No hay alertas activas.
                </p>
            </div>
        `;
        return;
    }

    let html = `<div class="alertas-header">⚠️ ${total} Alerta${total > 1 ? 's' : ''} Activa${total > 1 ? 's' : ''}</div>`;

    // Pendientes antiguos
    if (alertas.pendientesAntiguos.length > 0) {
        html += `
            <div class="alerta-seccion">
                <h4 class="alerta-titulo">🔴 Pendientes > 7 días (${alertas.pendientesAntiguos.length})</h4>
                <ul class="alerta-lista">
        `;

        alertas.pendientesAntiguos.slice(0, 5).forEach(s => {
            html += `
                <li class="alerta-item">
                    <strong>${s.numero}</strong> - ${s.asegurado}
                    <span class="alerta-dias">${s.mensaje}</span>
                </li>
            `;
        });

        if (alertas.pendientesAntiguos.length > 5) {
            html += `<li class="alerta-item-mas">Y ${alertas.pendientesAntiguos.length - 5} más...</li>`;
        }

        html += `</ul></div>`;
    }

    // Sin seguimiento
    if (alertas.sinSeguimiento.length > 0) {
        html += `
            <div class="alerta-seccion">
                <h4 class="alerta-titulo">🟡 Sin seguimiento > ${alertas.diasAlerta} días (${alertas.sinSeguimiento.length})</h4>
                <ul class="alerta-lista">
        `;

        alertas.sinSeguimiento.slice(0, 5).forEach(s => {
            html += `
                <li class="alerta-item">
                    <strong>${s.numero}</strong> - ${s.asegurado}
                    <span class="alerta-dias">${s.mensaje}</span>
                </li>
            `;
        });

        if (alertas.sinSeguimiento.length > 5) {
            html += `<li class="alerta-item-mas">Y ${alertas.sinSeguimiento.length - 5} más...</li>`;
        }

        html += `</ul></div>`;
    }

    container.innerHTML = html;
}

/**
 * Muestra/oculta loading del dashboard
 */
function mostrarLoadingDashboard(mostrar) {
    const dashboard = document.getElementById('dashboardContent');
    if (!dashboard) return;

    if (mostrar) {
        dashboard.style.opacity = '0.5';
        dashboard.style.pointerEvents = 'none';
    } else {
        dashboard.style.opacity = '1';
        dashboard.style.pointerEvents = 'auto';
    }
}

/**
 * Refresca el dashboard (útil para botón de refresh)
 */
export async function handleRefrescarDashboard() {
    mostrarAlerta('info', '🔄 Actualizando dashboard...');
    await handleCargarDashboard();
    mostrarAlerta('success', '✅ Dashboard actualizado');
}
