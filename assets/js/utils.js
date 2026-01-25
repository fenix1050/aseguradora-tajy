// ============================================
// UTILS.JS - Cache, Debounce, Validadores, Helpers
// ============================================

// ============================================
// CONSTANTES
// ============================================

export const DIAS_ALERTA_SEGUIMIENTO = 3;
export const LIMITE_POR_PAGINA = 50;

// ============================================
// CACHE MANAGER
// ============================================

// Cache en memoria (session-lifetime)
const memoriaCache = new Map();

export const cacheManager = {
    ttl: 5 * 60 * 1000, // 5 minutos

    set: (key, data) => {
        try {
            memoriaCache.set(key, {
                data,
                timestamp: Date.now()
            });
        } catch (e) {
            console.warn('Error al guardar en caché:', e);
        }
    },

    get: (key) => {
        try {
            const item = memoriaCache.get(key);
            if (!item) return null;

            const age = Date.now() - item.timestamp;
            if (age > cacheManager.ttl) {
                memoriaCache.delete(key);
                return null;
            }

            return item.data;
        } catch (e) {
            return null;
        }
    },

    invalidate: (prefix) => {
        try {
            for (const key of memoriaCache.keys()) {
                if (key.startsWith(prefix)) {
                    memoriaCache.delete(key);
                }
            }
        } catch (e) {
            console.warn('Error al invalidar caché:', e);
        }
    },

    clear: () => {
        try {
            memoriaCache.clear();
        } catch (e) {
            console.warn('Error al limpiar caché:', e);
        }
    }
};

// ============================================
// DEBOUNCE
// ============================================

export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// ============================================
// VALIDADORES
// ============================================

export const validadores = {
    numero: (valor) => {
        if (!valor || valor.trim().length === 0) {
            return 'El número de siniestro es requerido';
        }
        return null;
    },
    telefono: (valor) => {
        const regex = /^\+595\s?\d{3}\s?\d{6,7}$/;
        if (!regex.test(valor.replace(/\s/g, ''))) {
            return 'El formato debe ser +595 XXX XXXXXX';
        }
        return null;
    },
    asegurado: (valor) => {
        if (valor.length < 3) {
            return 'El nombre debe tener al menos 3 caracteres';
        }
        return null;
    }
};

export function validarCampo(campo, valor, inputElement) {
    const error = validadores[campo] ? validadores[campo](valor) : null;

    if (error) {
        inputElement.style.borderColor = '#dc3545';
        let errorElement = document.getElementById(`${campo}Error`);
        if (!errorElement && inputElement.parentElement) {
            errorElement = document.createElement('div');
            errorElement.id = `${campo}Error`;
            errorElement.className = 'error-message';
            errorElement.style.color = '#dc3545';
            errorElement.style.fontSize = '0.85em';
            errorElement.style.marginTop = '5px';
            inputElement.parentElement.appendChild(errorElement);
        }
        if (errorElement) {
            errorElement.textContent = error;
            errorElement.style.display = 'block';
        }
        return false;
    } else {
        inputElement.style.borderColor = '#28a745';
        const errorElement = document.getElementById(`${campo}Error`);
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        return true;
    }
}

// ============================================
// BÚSQUEDA INTELIGENTE (FUZZY SEARCH)
// ============================================

// Calcular distancia de Levenshtein (tolerancia a errores tipográficos)
export function levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
        for (let j = 1; j <= n; j++) {
            if (str1[i - 1] === str2[j - 1]) {
                dp[i][j] = dp[i - 1][j - 1];
            } else {
                dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
            }
        }
    }
    return dp[m][n];
}

// Similitud fonética para español (soundex adaptado)
export function soundexEspanol(str) {
    if (!str) return '';
    str = str.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Reemplazos fonéticos para español
    const reemplazos = [
        [/[gj]/g, 'j'],      // g y j suenan similar
        [/[csz]/g, 's'],     // c, s, z en latinoamérica
        [/[bv]/g, 'b'],      // b y v suenan igual
        [/ll/g, 'y'],        // ll como y
        [/ñ/g, 'n'],         // ñ simplificada
        [/[qk]/g, 'k'],      // q y k
        [/h/g, ''],          // h muda
        [/x/g, 'ks'],        // x como ks
        [/w/g, 'u'],         // w como u
        // ✅ REMOVIDO: No simplificar vocales repetidas
        // Permite distinguir "Maria" vs "Mario" fonéticamente
    ];

    reemplazos.forEach(([patron, reemplazo]) => {
        str = str.replace(patron, reemplazo);
    });

    // Tomar primeras consonantes significativas + vocales
    const primeraLetra = str[0] || '';
    const resto = str.slice(1).replace(/([aeiou])/g, '').slice(0, 3); // Consonantes
    
    return primeraLetra + resto;
}

// Calcular score de similitud (0-1)
// FASE 5.1: Ranking fuzzy con 5 niveles de relevancia
// - Normalización consistente (lowercase + NFD)
// - Guard clause por longitud mínima
// - Jerarquía: exact > startsWith > includes > phonetic > levenshtein
// - Elimina falsos positivos (Juan ≠ Bruno)
export function calcularSimilitud(busqueda, texto) {
    if (!busqueda || !texto) return 0;

    // ============================================
    // NORMALIZACIÓN CONSISTENTE
    // ============================================
    // Aplicar normalizacion NFD (eliminar acentos) y lowercase
    busqueda = busqueda
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    
    texto = texto
        .toLowerCase()
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');

    // ============================================
    // GATE POR LONGITUD MÍNIMA
    // ============================================
    // Evita ruido con búsquedas demasiado cortas (< 3 chars)
    // EXCEPTO: si la coincidencia es exacta
    if (busqueda.length < 3 && busqueda !== texto) return 0;

    // ============================================
    // RANGO 1: EXACTITUD PERFECTA (score = 1.0)
    // ============================================
    if (texto === busqueda) return 1.0;

    // ============================================
    // RANGO 2: ALTA RELEVANCIA (score >= 0.95)
    // ============================================
    
    // Comienza exacto con la búsqueda (máxima prioridad)
    if (texto.startsWith(busqueda)) return 0.95;

    // Contiene como substring pero NO comienza (ej: "garcia" en "maria garcia")
    if (texto.includes(busqueda)) return 0.92;

    // ============================================
    // RANGO 3: BUENA RELEVANCIA (score >= 0.82)
    // ============================================

    // Buscar palabra exacta dentro del texto (por espacios)
    const palabrasTexto = texto.split(/\s+/);
    
    // 1. Palabra que empieza exacto (ej: buscar "garcia" en "maria garcia lopez")
    for (const palabra of palabrasTexto) {
        if (palabra.startsWith(busqueda)) {
            return 0.90;
        }
    }

    // 2. Palabra que contiene exacto (ej: buscar "ard" en "leonard")
    for (const palabra of palabrasTexto) {
        if (palabra.includes(busqueda)) {
            return 0.85;
        }
    }

    // Similitud fonética (soundex español)
    const soundex1 = soundexEspanol(busqueda);
    const soundex2 = soundexEspanol(texto);
    if (soundex1 && soundex2 && soundex1 === soundex2) {
        return 0.82; // ✅ Reducido de 0.85 a 0.82 (menos confiable que includes)
    }

    // ============================================
    // RANGO 4: RELEVANCIA MODERADA (score 0.70-0.80)
    // Levenshtein SOLO si es realmente similar (>= 0.75)
    // ============================================

    // Distancia de Levenshtein normalizada (penalizar fuerte)
    const distancia = levenshteinDistance(busqueda, texto);
    const maxLen = Math.max(busqueda.length, texto.length);
    const similitudLevenshtein = 1 - (distancia / maxLen);

    // ✅ MEJORADO: Umbrales más estrictos para Levenshtein
    if (similitudLevenshtein >= 0.85) {
        return 0.78; // Solo si > 85% similar
    } else if (similitudLevenshtein >= 0.80) {
        return 0.75;
    } else if (similitudLevenshtein >= 0.75) {
        return 0.72;
    }

    // ============================================
    // RANGO 5: RECHAZAR < 0.75 Levenshtein
    // ============================================
    // ✅ MEJORADO: Rechaza cualquier cosa < 0.75 Levenshtein
    // Evita falsos positivos como "juan" vs "bruno" (0.20 similitud)
    return 0;
}

// Buscar con fuzzy matching
export function busquedaFuzzy(query, items, campo, umbral = 0.4) {
    if (!query || query.length < 2) return [];

    const resultados = items
        .map(item => ({
            item,
            score: calcularSimilitud(query, item[campo] || '')
        }))
        .filter(r => r.score >= umbral)
        .sort((a, b) => b.score - a.score);

    return resultados;
}

/**
 * Normaliza query para búsqueda y cache
 * FASE 5.2: Preparación para cache de búsqueda
 * Convierte espacios a guiones para usar como parte de clave de cache
 * 
 * @param {string} query - Query sin procesar
 * @returns {string} Query normalizada (lowercase, trimmed, espacios con _)
 */
export function normalizarQueryBusqueda(query) {
    if (!query) return '';
    return query
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '_');  // espacios múltiples → guiones bajos
}

// ============================================
// HELPERS DE SEGUIMIENTO
// ============================================

// Calcular días transcurridos desde la fecha del siniestro
export function calcularDiasTranscurridos(fechaSiniestro) {
    const fecha = new Date(fechaSiniestro);
    const hoy = new Date();
    const diferencia = hoy - fecha;
    return Math.floor(diferencia / (1000 * 60 * 60 * 24));
}

// Verificar si un siniestro requiere seguimiento
export function requiereSeguimiento(siniestro) {
    // Solo alertar siniestros pendientes o en proceso
    const estadosAlerta = ['pendiente', 'proceso'];
    if (!estadosAlerta.includes(siniestro.estado)) {
        return false;
    }

    const diasTranscurridos = calcularDiasTranscurridos(siniestro.fecha);
    return diasTranscurridos >= DIAS_ALERTA_SEGUIMIENTO;
}

// Obtener todos los siniestros que requieren seguimiento
export function obtenerSiniestrosPendientesSeguimiento(listaSiniestros) {
    return listaSiniestros.filter(s => requiereSeguimiento(s));
}

// ============================================
// HELPERS DE UI
// ============================================

export function resaltarCoincidencia(texto, busqueda) {
    if (!busqueda) return texto;
    const regex = new RegExp(`(${busqueda.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return texto.replace(regex, '<strong style="color: #0056b3;">$1</strong>');
}

export function obtenerTextoEstado(estado) {
    const textos = {
        'pendiente': 'Pendiente',
        'proceso': 'En Proceso',
        'aprobado': 'Aprobado',
        'taller': 'Liquidado',
        'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
}

export function obtenerSaludoFormal(nombre, sexo) {
    if (!nombre || nombre === '[Nombre]') {
        if (sexo === "M") return 'Estimado Sr.';
        if (sexo === "F") return 'Estimada Sra.';
        return 'Estimado/a';
    }

    const primerNombre = nombre.split(" ")[0];

    if (sexo === "M") return `Estimado Sr. ${primerNombre}`;
    if (sexo === "F") return `Estimada Sra. ${primerNombre}`;

    return `Estimado/a ${primerNombre}`;
}

/**
 * Formatea una fecha string (YYYY-MM-DD o timestamp) evitando problemas de zona horaria
 * @param {string} fechaString - Fecha en formato YYYY-MM-DD o YYYY-MM-DDTHH:MM:SS
 * @returns {string} Fecha formateada en formato DD/MM/YYYY
 */
export function formatearFecha(fechaString) {
    if (!fechaString) return '';

    // Si es un timestamp, extraer solo la parte de la fecha
    const soloFecha = fechaString.split('T')[0];

    // Separar la fecha en partes para evitar conversión de zona horaria
    const partes = soloFecha.split('-');
    if (partes.length !== 3) return fechaString;

    const [anio, mes, dia] = partes;
    return `${dia.padStart(2, '0')}/${mes.padStart(2, '0')}/${anio}`;
}
