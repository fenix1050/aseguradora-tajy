// ============================================
// HANDLERS DE FILTRADO Y ORDENAMIENTO
// ============================================

import { debounce } from '../utils.js';
import {
    leerFiltros,
    actualizarIconosOrdenamiento,
    mostrarSugerencias,
    ocultarSugerencias,
    mostrarMensajeSinResultados
} from '../ui.js';
import {
    setFiltros,
    cambiarOrden,
    getPaginaActual,
    buscarAseguradosFuzzy
} from '../siniestros.js';
import { handleCargarSiniestros } from './siniestros.handlers.js';

export async function handleFiltrarTabla() {
    const filtros = leerFiltros();
    setFiltros(filtros);
    await handleCargarSiniestros(0, true);
}

export const handleFiltrarTablaDebounced = debounce(handleFiltrarTabla, 500);

export function handleOrdenarPor(columna) {
    const nuevoOrden = cambiarOrden(columna);
    handleCargarSiniestros(getPaginaActual(), true);
    actualizarIconosOrdenamiento(nuevoOrden);
}

// ============================================
// HANDLERS DE BÚSQUEDA INTELIGENTE
// ============================================

export const handleBusquedaInteligente = debounce(async function(input) {
    const query = input.value.trim();

    if (query.length < 2) {
        ocultarSugerencias();
        // FASE 5.2.2: Limpiar estados visuales cuando query < 2
        input.classList.remove('searching', 'no-results');
        document.querySelector('.fuzzy-badge')?.classList.remove('rotating');
        return;
    }

    // ============================================
    // FASE 5.2.2: Activar estado BUSCANDO
    // ============================================
    input.classList.add('searching');
    input.classList.remove('no-results');
    document.querySelector('.fuzzy-badge')?.classList.add('rotating');

    try {
        const resultados = await buscarAseguradosFuzzy(query);

        // ============================================
        // FASE 5.2.2: Desactivar estado BUSCANDO tras obtener resultados
        // ============================================
        input.classList.remove('searching');
        document.querySelector('.fuzzy-badge')?.classList.remove('rotating');

        if (resultados.length > 0) {
            // Estado CON RESULTADOS
            mostrarSugerencias(input, resultados);
        } else {
            // Estado SIN RESULTADOS
            // FASE 5.2.2: Mensaje con tipo de búsqueda
            mostrarMensajeSinResultados(input, query, 'asegurado');
        }
    } catch (e) {
        // ============================================
        // FASE 5.2.2: Limpiar estados en caso de error
        // ============================================
        input.classList.remove('searching');
        document.querySelector('.fuzzy-badge')?.classList.remove('rotating');
        input.classList.add('no-results');
        console.error('[FASE 5.2.2] ❌ Error en búsqueda inteligente:', e);
        ocultarSugerencias();
    }
}, 200);

/**
 * FASE 5.2.2: Búsqueda por número de siniestro con feedback visual
 * Captura resultado y muestra mensaje si no hay coincidencias
 * 
 * @param {HTMLElement} input - Input de búsqueda por número
 */
export const handleBusquedaPorNumero = debounce(async function(input) {
    const query = input.value.trim();

    // ✅ AJUSTE 2: Cancelar si query vacía
    if (query.length === 0) {
        input.classList.remove('searching', 'no-results');
        return;
    }

    // Activar estado BUSCANDO
    input.classList.add('searching');
    input.classList.remove('no-results');

    try {
        // ✅ AJUSTE 2: Capturar resultado para validar si hay datos
        const resultado = await handleCargarSiniestros(0, true);
        
        input.classList.remove('searching');
        
        // Si hay datos, éxito silencioso (tabla se actualiza)
        // Si NO hay datos, mostrar mensaje contextual
        if (resultado.success && resultado.data && resultado.data.length > 0) {
            // Búsqueda exitosa
        } else {
            // ✅ AJUSTE 2: Mostrar mensaje específico para búsqueda por número
            mostrarMensajeSinResultados(input, query, 'numero');
        }
    } catch (e) {
        input.classList.remove('searching');
        input.classList.add('no-results');
        console.error('[FASE 5.2.2] ❌ Error buscando por número:', e);
    }
}, 300);

export function configurarListenerBusqueda() {
    // FASE 5.2.2: Listener para búsqueda fuzzy (asegurado)
    const inputBusqueda = document.getElementById('buscarAsegurado');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            handleBusquedaInteligente(this);
        });
    }

    // FASE 5.2.2: Listener para búsqueda por número de siniestro
    const inputSiniestro = document.getElementById('buscarSiniestro');
    if (inputSiniestro) {
        inputSiniestro.addEventListener('input', function() {
            handleBusquedaPorNumero(this);
        });
    }
}

// ============================================
// HANDLERS DE RESET
// ============================================

/**
 * Reset global completo: limpia filtros, estados visuales y recarga tabla
 * Mantiene arquitectura modular sin exponer a window.*
 */
export async function handleResetFiltros() {
    // ============================================
    // FASE 5.2.2: 1. Limpiar inputs y estados visuales
    // ============================================
    const inputAsegurado = document.getElementById('buscarAsegurado');
    const inputSiniestro = document.getElementById('buscarSiniestro');
    const selectEstado = document.getElementById('filtroEstado');
    const btnActualizar = document.getElementById('btnActualizar');
    
    if (inputAsegurado) {
        inputAsegurado.value = '';
        inputAsegurado.classList.remove('searching', 'no-results');
    }
    if (inputSiniestro) {
        inputSiniestro.value = '';
        inputSiniestro.classList.remove('searching', 'no-results');
    }
    if (selectEstado) {
        selectEstado.value = '';
    }
    
    // ============================================
    // FASE 5.2.2: 2. Limpiar estados visuales de búsqueda
    // ============================================
    const badge = document.querySelector('.fuzzy-badge');
    if (badge) {
        badge.classList.remove('rotating');
    }
    
    // FASE 5.2.2: Deshabilitar botón durante carga
    if (btnActualizar) {
        btnActualizar.disabled = true;
        btnActualizar.textContent = '⏳ Actualizando...';
        btnActualizar.classList.add('actualizando');
    }
    
    // 3. Ocultar sugerencias fuzzy
    ocultarSugerencias();
    
    // 4. Resetear filtros en estado global
    setFiltros({ asegurado: '', numero: '', estado: '' });
    
    // 5. Cargar tabla sin filtros
    await handleCargarSiniestros(0, false);
    
    // ============================================
    // FASE 5.2.2: 6. Re-habilitar botón tras completar
    // ============================================
    if (btnActualizar) {
        btnActualizar.disabled = false;
        btnActualizar.textContent = '🔄 Actualizar';
        btnActualizar.classList.remove('actualizando');
    }
}

/**
 * Configura listener para botón "Actualizar"
 * Conecta vía addEventListener manteniendo arquitectura modular
 */
export function configurarListenerResetFiltros() {
    const btnActualizar = document.getElementById('btnActualizar');
    if (btnActualizar) {
        btnActualizar.addEventListener('click', handleResetFiltros);
    }
}
