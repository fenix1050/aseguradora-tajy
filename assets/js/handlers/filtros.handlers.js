// ============================================
// HANDLERS DE FILTRADO Y ORDENAMIENTO
// ============================================

import { debounce } from '../utils.js';
import {
    leerFiltros,
    actualizarIconosOrdenamiento,
    mostrarSugerencias,
    ocultarSugerencias
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
        return;
    }

    const resultados = await buscarAseguradosFuzzy(query);

    if (resultados.length > 0) {
        mostrarSugerencias(input, resultados);
    } else {
        ocultarSugerencias();
    }
}, 200);

export function configurarListenerBusqueda() {
    const inputBusqueda = document.getElementById('buscarAsegurado');
    if (inputBusqueda) {
        inputBusqueda.addEventListener('input', function() {
            handleBusquedaInteligente(this);
        });
    }
}
