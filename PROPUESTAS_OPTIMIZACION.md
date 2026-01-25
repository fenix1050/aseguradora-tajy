# Propuestas de Optimización - Aseguradora Tajy

**Fecha**: 2026-01-25
**Rama**: `claude/optimize-project-alerts-ZkWd8`

---

## Índice

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Sistema de Alertas de Seguimiento - Propuestas](#sistema-de-alertas-de-seguimiento---propuestas)
3. [Optimizaciones Generales del Proyecto](#optimizaciones-generales-del-proyecto)
4. [Mejoras de Seguridad](#mejoras-de-seguridad)
5. [Mejoras de Rendimiento](#mejoras-de-rendimiento)
6. [Roadmap de Implementación](#roadmap-de-implementación)

---

## Resumen Ejecutivo

### Estado Actual del Proyecto

**Fortalezas identificadas:**
- ✅ Arquitectura modular bien organizada
- ✅ Documentación excelente (CLAUDE.md)
- ✅ Sistema de caché inteligente (5 min TTL)
- ✅ Seguridad RLS implementada correctamente
- ✅ UX bien pensada (skeleton loaders, debounce, fuzzy search)

**Áreas de mejora críticas:**
- ❌ Vulnerabilidad XSS en renderizado de tabla (ALTA prioridad)
- ⚠️ Archivo `siniestros.js` muy grande (848 líneas)
- ⚠️ Sistema de alertas puede ser molesto
- ⚠️ Política de contraseñas débil (6 caracteres)
- ⚠️ Sin rate limiting

### Métricas del Proyecto
- **Total LOC JavaScript**: 3,501 líneas
- **Archivos JS**: 11 módulos
- **Archivos documentación**: 22 archivos MD
- **Console logs**: 60 instancias

---

## Sistema de Alertas de Seguimiento - Propuestas

### 1. Sistema Actual (Análisis)

**Implementación existente:**
```javascript
// Constante global
const DIAS_ALERTA_SEGUIMIENTO = 3;

// Lógica de detección
function requiereSeguimiento(siniestro) {
    const estadosAlerta = ['pendiente', 'proceso'];
    if (!estadosAlerta.includes(siniestro.estado)) return false;
    const diasTranscurridos = calcularDiasTranscurridos(siniestro.fecha);
    return diasTranscurridos >= DIAS_ALERTA_SEGUIMIENTO;
}

// Visualización
- Fila completa en rojo (#ffe6e6)
- Borde izquierdo rojo (4px)
- Icono ⏰ con animación pulsante
- Toast al cargar dashboard (8 segundos)
```

**Problemas identificados:**
1. **Intrusividad**: Toast de 8 segundos en cada carga
2. **Falta de contexto**: Solo cuenta total, no priorización
3. **Sin historial**: No guarda cuándo fue la última revisión
4. **Un solo umbral**: 3 días para todos los casos
5. **Sin opciones de snooze**: No se puede posponer temporalmente
6. **Sin notificaciones progresivas**: No hay escalado de urgencia

---

### 2. PROPUESTA A: Sistema de Alertas Inteligente con Niveles de Urgencia

**Concepto:** Sistema escalonado con 3 niveles de alerta basado en días transcurridos.

#### Niveles de Urgencia

```javascript
// Nueva configuración
const NIVELES_ALERTA = {
    atencion: {
        dias: 3,
        color: '#fff3cd',      // Amarillo suave
        borderColor: '#ffc107',
        icono: '📋',
        prioridad: 1
    },
    importante: {
        dias: 7,
        color: '#ffe6cc',      // Naranja suave
        borderColor: '#ff9800',
        icono: '⚠️',
        prioridad: 2
    },
    urgente: {
        dias: 14,
        color: '#ffe6e6',      // Rojo suave
        borderColor: '#dc3545',
        icono: '🔴',
        prioridad: 3
    }
};
```

#### Visualización en Dashboard

**Widget de Resumen (en lugar de toast molesto):**

```html
<!-- Nuevo widget fijo en la parte superior -->
<div class="alertas-resumen">
    <div class="alerta-nivel nivel-urgente" onclick="filtrarPorNivel('urgente')">
        <span class="icono">🔴</span>
        <span class="cantidad">3</span>
        <span class="texto">Urgentes (14+ días)</span>
    </div>
    <div class="alerta-nivel nivel-importante" onclick="filtrarPorNivel('importante')">
        <span class="icono">⚠️</span>
        <span class="cantidad">8</span>
        <span class="texto">Importantes (7-13 días)</span>
    </div>
    <div class="alerta-nivel nivel-atencion" onclick="filtrarPorNivel('atencion')">
        <span class="icono">📋</span>
        <span class="cantidad">12</span>
        <span class="texto">Atención (3-6 días)</span>
    </div>
</div>
```

**CSS del widget:**
```css
.alertas-resumen {
    display: flex;
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 0.75rem;
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    border-radius: 8px;
    animation: slideDown 0.3s ease-out;
}

.alerta-nivel {
    flex: 1;
    padding: 1rem;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    transition: all 0.2s;
    border-left: 4px solid transparent;
}

.alerta-nivel:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.nivel-urgente { border-left-color: #dc3545; }
.nivel-importante { border-left-color: #ff9800; }
.nivel-atencion { border-left-color: #ffc107; }

.alerta-nivel .cantidad {
    font-size: 2rem;
    font-weight: bold;
    color: #333;
}
```

**Ventajas:**
- ✅ Siempre visible sin ser molesto
- ✅ Clickeable para filtrar
- ✅ Priorización clara
- ✅ No interrumpe el flujo de trabajo

---

### 3. PROPUESTA B: Sistema de Notificaciones Discretas con Historial

**Concepto:** Badge pequeño en el menú + panel de notificaciones desplegable.

#### Badge de Notificaciones

```html
<!-- En el header/navbar -->
<button class="btn-notificaciones" onclick="togglePanelNotificaciones()">
    🔔
    <span class="badge-contador">23</span>
</button>

<!-- Panel desplegable -->
<div id="panelNotificaciones" class="panel-notificaciones oculto">
    <div class="notificacion-header">
        <h3>Seguimientos Pendientes</h3>
        <button onclick="marcarTodasLeidas()">Marcar todas leídas</button>
    </div>

    <div class="lista-notificaciones">
        <!-- Ordenadas por prioridad -->
        <div class="notificacion urgente no-leida" data-siniestro-id="123">
            <div class="notif-icono">🔴</div>
            <div class="notif-contenido">
                <strong>Siniestro #ABC-2024-001</strong>
                <p>Juan Pérez - Sin actualización hace 15 días</p>
                <span class="notif-tiempo">Hace 2 horas</span>
            </div>
            <button class="btn-snooze" onclick="snoozeNotificacion(123)">Posponer</button>
        </div>
        <!-- Más notificaciones... -->
    </div>
</div>
```

#### Base de Datos - Nueva tabla

```sql
-- Nueva tabla para tracking de notificaciones
CREATE TABLE notificaciones_seguimiento (
    id BIGSERIAL PRIMARY KEY,
    siniestro_id BIGINT REFERENCES siniestros(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nivel_urgencia VARCHAR(20) NOT NULL, -- 'atencion', 'importante', 'urgente'
    leida BOOLEAN DEFAULT FALSE,
    snoozed_hasta TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX idx_notif_user_leida ON notificaciones_seguimiento(user_id, leida);
CREATE INDEX idx_notif_siniestro ON notificaciones_seguimiento(siniestro_id);

-- RLS
ALTER TABLE notificaciones_seguimiento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their own notifications"
ON notificaciones_seguimiento FOR SELECT
USING (auth.uid() = user_id);
```

**Funcionalidad Snooze:**
```javascript
// Posponer notificación por X tiempo
async function snoozeNotificacion(siniestroId, horas = 24) {
    const snoozedHasta = new Date();
    snoozedHasta.setHours(snoozedHasta.getHours() + horas);

    const { error } = await clienteSupabase
        .from('notificaciones_seguimiento')
        .update({
            snoozed_hasta: snoozedHasta.toISOString(),
            updated_at: new Date().toISOString()
        })
        .eq('siniestro_id', siniestroId)
        .eq('user_id', await getUserId());

    if (!error) {
        mostrarAlerta('success', 'Notificación pospuesta por 24 horas');
        actualizarContadorNotificaciones();
    }
}

// Opciones de snooze
const OPCIONES_SNOOZE = [
    { texto: '1 hora', horas: 1 },
    { texto: '4 horas', horas: 4 },
    { texto: '1 día', horas: 24 },
    { texto: '3 días', horas: 72 },
    { texto: '1 semana', horas: 168 }
];
```

**Ventajas:**
- ✅ No molesta hasta que el usuario lo abre
- ✅ Historial completo de notificaciones
- ✅ Función snooze para posponer
- ✅ Persistente en base de datos
- ✅ Contador visible pero discreto

---

### 4. PROPUESTA C: Dashboard de Seguimiento Dedicado

**Concepto:** Nueva pestaña "Seguimientos" con vista especializada.

#### Nueva Tab en index.html

```html
<div class="tabs">
    <button class="tab-button active" data-tab="siniestros">Siniestros</button>
    <button class="tab-button" data-tab="seguimientos">
        Seguimientos
        <span class="badge-tab">23</span>
    </button>
    <button class="tab-button" data-tab="mensajes">Mensajes</button>
    <button class="tab-button" data-tab="reportes">Reportes</button>
</div>

<!-- Contenido de la nueva tab -->
<div id="seguimientos" class="tab-content">
    <div class="seguimientos-header">
        <h2>Panel de Seguimientos</h2>
        <div class="filtros-seguimiento">
            <button class="btn-filtro active" data-nivel="todos">
                Todos <span class="badge">23</span>
            </button>
            <button class="btn-filtro" data-nivel="urgente">
                🔴 Urgentes <span class="badge">3</span>
            </button>
            <button class="btn-filtro" data-nivel="importante">
                ⚠️ Importantes <span class="badge">8</span>
            </button>
            <button class="btn-filtro" data-nivel="atencion">
                📋 Atención <span class="badge">12</span>
            </button>
        </div>
    </div>

    <!-- Vista de tarjetas (más legible que tabla) -->
    <div class="grid-seguimientos">
        <!-- Tarjeta por siniestro -->
        <div class="tarjeta-seguimiento urgente">
            <div class="tarjeta-header">
                <span class="nivel-badge">🔴 Urgente</span>
                <span class="dias-badge">15 días</span>
            </div>
            <div class="tarjeta-body">
                <h3>#ABC-2024-001</h3>
                <p><strong>Asegurado:</strong> Juan Pérez</p>
                <p><strong>Teléfono:</strong> +595 981 123456</p>
                <p><strong>Estado:</strong> <span class="badge-pendiente">Pendiente</span></p>
                <p><strong>Taller:</strong> Taller Central</p>
                <p><strong>Última actualización:</strong> 15/01/2026</p>
            </div>
            <div class="tarjeta-actions">
                <button class="btn btn-primary" onclick="handleEditarSiniestro(123)">
                    ✏️ Editar
                </button>
                <button class="btn btn-success" onclick="handleEnviarMensaje(123)">
                    💬 WhatsApp
                </button>
                <button class="btn btn-secondary" onclick="snoozeNotificacion(123)">
                    ⏰ Posponer
                </button>
            </div>
            <div class="tarjeta-timeline">
                <small>
                    📅 Creado: 01/01/2026 |
                    🔄 Última edición: 10/01/2026
                </small>
            </div>
        </div>
        <!-- Más tarjetas... -->
    </div>
</div>
```

#### Lógica JavaScript

```javascript
// assets/js/seguimientos.js (nuevo módulo)

export async function cargarSeguimientos(nivel = 'todos') {
    const userId = await getUserId();

    // Query base
    let query = clienteSupabase
        .from('siniestros')
        .select('*')
        .eq('user_id', userId)
        .in('estado', ['pendiente', 'proceso'])
        .order('fecha', { ascending: true }); // Más antiguos primero

    const { data, error } = await query;

    if (error) {
        return { success: false, error: error.message };
    }

    // Calcular niveles y filtrar
    const siniestrosConNivel = data.map(s => {
        const dias = calcularDiasTranscurridos(s.fecha);
        let nivelAlerta = null;

        if (dias >= 14) nivelAlerta = 'urgente';
        else if (dias >= 7) nivelAlerta = 'importante';
        else if (dias >= 3) nivelAlerta = 'atencion';

        return {
            ...s,
            diasTranscurridos: dias,
            nivelAlerta
        };
    });

    // Filtrar por nivel
    const filtrados = nivel === 'todos'
        ? siniestrosConNivel.filter(s => s.nivelAlerta !== null)
        : siniestrosConNivel.filter(s => s.nivelAlerta === nivel);

    // Ordenar por prioridad (urgentes primero)
    const ordenPrioridad = { urgente: 3, importante: 2, atencion: 1 };
    filtrados.sort((a, b) =>
        (ordenPrioridad[b.nivelAlerta] || 0) - (ordenPrioridad[a.nivelAlerta] || 0)
    );

    return {
        success: true,
        data: filtrados,
        estadisticas: {
            todos: filtrados.length,
            urgente: filtrados.filter(s => s.nivelAlerta === 'urgente').length,
            importante: filtrados.filter(s => s.nivelAlerta === 'importante').length,
            atencion: filtrados.filter(s => s.nivelAlerta === 'atencion').length
        }
    };
}
```

**Ventajas:**
- ✅ Vista dedicada sin mezclar con lista principal
- ✅ Información completa en cada tarjeta
- ✅ Acciones rápidas (editar, WhatsApp, posponer)
- ✅ Ordenado por urgencia automáticamente
- ✅ No interrumpe el flujo normal de trabajo

---

### 5. PROPUESTA D: Recordatorios Inteligentes con ML (Futuro)

**Concepto avanzado (fase 2):** Aprendizaje de patrones de usuario para alertas personalizadas.

```javascript
// Análisis de comportamiento
const patrones = {
    horaPreferida: '09:00', // Usuario suele revisar a las 9 AM
    diasActivos: ['lunes', 'martes', 'miércoles', 'jueves', 'viernes'],
    frecuenciaRevision: 'diaria',
    tasaResolucion: {
        urgentes: 0.85,    // Resuelve 85% de urgentes
        importantes: 0.60,
        atencion: 0.40
    }
};

// Ajuste dinámico de umbrales
function calcularUmbralPersonalizado(usuario) {
    // Si el usuario suele resolver rápido, bajar umbrales
    // Si tarda mucho, subir umbrales para no abrumar
    return {
        atencion: usuario.tasaResolucion.atencion > 0.7 ? 2 : 3,
        importante: usuario.tasaResolucion.importante > 0.7 ? 5 : 7,
        urgente: usuario.tasaResolucion.urgente > 0.7 ? 10 : 14
    };
}
```

---

### 6. PROPUESTA E: Sistema Híbrido Recomendado ⭐

**Combinación de las mejores ideas:**

1. **Widget de resumen visual** (Propuesta A)
   - Siempre visible en dashboard
   - 3 niveles de urgencia
   - Clickeable para filtrar

2. **Badge de notificaciones** (Propuesta B)
   - Contador discreto en navbar
   - Panel desplegable con historial
   - Función snooze

3. **Vista especializada** (Propuesta C)
   - Tab "Seguimientos" dedicada
   - Tarjetas con información completa
   - Acciones rápidas

4. **Configuración personalizable**
   ```javascript
   // Preferencias de usuario (nueva tabla)
   const preferenciasAlertas = {
       mostrarWidget: true,
       mostrarBadge: true,
       mostrarToast: false, // Desactivar toast molesto
       nivelMinimoToast: 'urgente', // Solo toasts para urgentes
       diasAtencion: 3,
       diasImportante: 7,
       diasUrgente: 14,
       horaRecordatorio: '09:00', // Recordatorio diario opcional
       notificacionesEmail: false // Futuro: emails
   };
   ```

#### Implementación Gradual

**Fase 1 (2 horas):**
- Eliminar toast automático molesto
- Agregar widget de resumen visual
- Implementar 3 niveles de urgencia

**Fase 2 (3 horas):**
- Crear tabla `notificaciones_seguimiento`
- Implementar badge + panel desplegable
- Agregar función snooze

**Fase 3 (4 horas):**
- Crear tab "Seguimientos"
- Vista de tarjetas
- Filtros por nivel

**Fase 4 (2 horas):**
- Preferencias de usuario
- Configuración personalizable

---

## Optimizaciones Generales del Proyecto

### 1. Refactorización de siniestros.js (848 LOC)

**Problema:** Archivo muy grande, difícil de mantener.

**Solución:** Dividir en 3 módulos especializados.

```javascript
// assets/js/siniestros/
├── siniestros-crud.js      (300 LOC) - CRUD operations
├── siniestros-search.js    (350 LOC) - Search & filters
└── siniestros-reports.js   (200 LOC) - Report generation
```

#### Ejemplo de separación

**siniestros-crud.js:**
```javascript
// ============================================
// SINIESTROS CRUD - Create, Read, Update, Delete
// ============================================

import { getClienteSupabase } from '../supabase.js';
import { getUserId } from '../auth.js';
import { cacheManager } from '../utils.js';

export async function crearSiniestro(datos) {
    // ... código actual líneas 464-520
}

export async function actualizarSiniestro(id, datos) {
    // ... código actual líneas 523-591
}

export async function eliminarSiniestro(id) {
    // ... código actual líneas 594-643
}

export async function getSiniestroById(id) {
    // ... código actual líneas 57-84
}

export async function getSiniestroByIdWithFallback(id) {
    // ... código actual líneas 87-113
}
```

**siniestros-search.js:**
```javascript
// ============================================
// SINIESTROS SEARCH - Búsqueda y filtros
// ============================================

export async function cargarSiniestros(pagina, filtros, orden) {
    // ... código actual líneas 278-461
}

export async function buscarAseguradosFuzzy(query) {
    // ... código actual líneas 201-249
}

export async function cambiarOrden(columna) {
    // ... código actual líneas 252-275
}
```

**siniestros-reports.js:**
```javascript
// ============================================
// SINIESTROS REPORTS - Generación de reportes
// ============================================

export function generarHtmlReporte(filtros) {
    // ... código actual líneas 702-792
}

export function generarCsvReporte(filtros) {
    // ... código actual líneas 795-848
}
```

**Ventajas:**
- ✅ Archivos más pequeños y manejables
- ✅ Responsabilidades claras
- ✅ Más fácil de testear
- ✅ Mejor para trabajo en equipo

---

### 2. Extraer CSS a Archivo Externo

**Problema:** 1,500+ líneas de CSS inline en index.html.

**Solución:**

```html
<!-- index.html -->
<head>
    <link rel="stylesheet" href="assets/css/styles.css">
    <link rel="stylesheet" href="assets/css/alertas.css">
</head>
```

**assets/css/styles.css:**
```css
/* Variables CSS para temas */
:root {
    /* Colores principales */
    --color-primary: #007bff;
    --color-success: #28a745;
    --color-danger: #dc3545;
    --color-warning: #ffc107;
    --color-info: #17a2b8;

    /* Alertas */
    --alerta-atencion-bg: #fff3cd;
    --alerta-atencion-border: #ffc107;
    --alerta-importante-bg: #ffe6cc;
    --alerta-importante-border: #ff9800;
    --alerta-urgente-bg: #ffe6e6;
    --alerta-urgente-border: #dc3545;

    /* Espaciado */
    --spacing-xs: 0.25rem;
    --spacing-sm: 0.5rem;
    --spacing-md: 1rem;
    --spacing-lg: 1.5rem;
    --spacing-xl: 2rem;
}

/* Resto del CSS... */
```

**Ventajas:**
- ✅ Cache del navegador
- ✅ Más fácil de mantener
- ✅ Reutilizable
- ✅ Minificable en producción

---

### 3. Eliminar Duplicación de Código

#### Problema 1: `obtenerTextoEstado()` duplicado 3 veces

**Solución:**
```javascript
// Eliminar de siniestros.js líneas 737-746 y 819-828
// Usar solo la versión de utils.js

// En siniestros.js
import { obtenerTextoEstado } from './utils.js';

// Usar en generarHtmlReporte() y generarCsvReporte()
const estadoTexto = obtenerTextoEstado(siniestro.estado);
```

#### Problema 2: Generación de cache keys repetida

**Solución:**
```javascript
// En utils.js
export function generarClaveCache(prefijo, params = {}) {
    const partes = [prefijo];

    // Agregar user_id si existe
    if (params.userId) partes.push(params.userId);

    // Agregar otros parámetros
    Object.entries(params)
        .filter(([key]) => key !== 'userId')
        .forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                partes.push(`${key}_${value}`);
            }
        });

    return partes.join('_');
}

// Uso
const cacheKey = generarClaveCache('siniestros', {
    userId: await getUserId(),
    pagina: 0,
    estado: 'pendiente',
    columna: 'fecha',
    direccion: 'desc'
});
```

---

### 4. Optimización de Renderizado de Tabla

**Problema:** Reconstrucción completa de tabla en cada actualización.

**Solución:** Actualización granular solo de filas modificadas.

```javascript
// ui.js - Nueva función
export function actualizarFilaTabla(siniestro) {
    const tbody = document.querySelector('#listaSiniestros tbody');
    const filaExistente = tbody.querySelector(`tr[data-id="${siniestro.id}"]`);

    if (!filaExistente) {
        // Fila nueva, agregar al final
        const nuevaFila = crearFilaSiniestro(siniestro);
        tbody.appendChild(nuevaFila);
    } else {
        // Actualizar fila existente
        const nuevaFila = crearFilaSiniestro(siniestro);
        filaExistente.replaceWith(nuevaFila);
    }
}

// Extraer lógica de creación de fila
function crearFilaSiniestro(s) {
    const tr = document.createElement('tr');
    tr.setAttribute('data-id', s.id);

    // ... resto del código de construcción de fila
    // (igual que en actualizarTabla líneas 500-556)

    return tr;
}

// Usar en handleGuardarEdicion
export async function handleGuardarEdicion() {
    // ... validación y guardado

    const resultado = await actualizarSiniestro(id, datos);

    if (resultado.success) {
        // En lugar de recargar toda la tabla
        actualizarFilaTabla(resultado.data);
        mostrarAlerta('success', 'Siniestro actualizado exitosamente');
    }
}
```

**Ventajas:**
- ✅ Menos operaciones DOM
- ✅ Más rápido (no reconstruye 50 filas)
- ✅ Mejor UX (sin parpadeo)

---

### 5. Virtualización para Tablas Grandes (Opcional - Fase futura)

**Para escalar más allá de 1000 registros:**

```javascript
// Usar biblioteca como react-window o vanilla implementation
import VirtualScroll from 'virtual-scroll-lib';

const virtualTable = new VirtualScroll({
    container: document.getElementById('listaSiniestros'),
    rowHeight: 60,
    totalRows: totalRegistros,
    visibleRows: 15,
    renderRow: (index) => {
        const siniestro = siniestros[index];
        return crearFilaSiniestro(siniestro);
    }
});
```

---

## Mejoras de Seguridad

### 1. FIX CRÍTICO: XSS en Renderizado de Tabla

**Problema:** Líneas ui.js:527-543 - innerHTML sin escape.

**Solución:**

```javascript
// Opción 1: Usar escapeHtml()
tr.innerHTML = `
    <td><strong>${escapeHtml(s.numero)}</strong>${iconosAlerta}</td>
    <td>${escapeHtml(s.asegurado)}</td>
    <td>${escapeHtml(s.telefono)}</td>
    <td>${escapeHtml(s.tipo)}</td>
    <td><span class="badge ${estadoBadge}">${escapeHtml(estadoTexto)}</span></td>
    <td>${escapeHtml(s.monto)}</td>
    <td>${escapeHtml(s.poliza)}</td>
    <td>${escapeHtml(s.taller)}</td>
    <td>${formatearFechaLocal(s.fecha)}</td>
    <td class="acciones">
        <button class="btn-icon" onclick="window.handleEditarSiniestro(${s.id})" title="Editar">✏️</button>
        <button class="btn-icon" onclick="window.handleEnviarMensaje(${s.id})" title="Enviar mensaje">💬</button>
        <button class="btn-icon" onclick="window.handleEliminar(${s.id})" title="Eliminar">🗑️</button>
    </td>
`;

// Opción 2: Usar textContent (más seguro pero más verboso)
function crearFilaSiniestro(s) {
    const tr = document.createElement('tr');

    // Columna número
    const tdNumero = document.createElement('td');
    const strong = document.createElement('strong');
    strong.textContent = s.numero;
    tdNumero.appendChild(strong);
    tdNumero.insertAdjacentHTML('beforeend', iconosAlerta); // Solo HTML confiable

    // Columna asegurado
    const tdAsegurado = document.createElement('td');
    tdAsegurado.textContent = s.asegurado;

    // ... resto de columnas

    tr.appendChild(tdNumero);
    tr.appendChild(tdAsegurado);
    // ...

    return tr;
}
```

**Prioridad:** 🔴 CRÍTICA - Implementar INMEDIATAMENTE

---

### 2. Fortalecimiento de Validación de Contraseñas

**Problema:** Mínimo 6 caracteres es muy débil.

**Solución:**

```javascript
// utils.js - Nuevo validador
export const validadores = {
    // ... validadores existentes

    password: (valor) => {
        if (!valor || valor.length < 12) {
            return 'La contraseña debe tener al menos 12 caracteres';
        }

        // Verificar complejidad
        const tieneMinuscula = /[a-z]/.test(valor);
        const tieneMayuscula = /[A-Z]/.test(valor);
        const tieneNumero = /\d/.test(valor);
        const tieneEspecial = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(valor);

        const cumplidos = [tieneMinuscula, tieneMayuscula, tieneNumero, tieneEspecial]
            .filter(Boolean).length;

        if (cumplidos < 3) {
            return 'La contraseña debe incluir al menos 3 de: minúsculas, mayúsculas, números, caracteres especiales';
        }

        // Verificar contraseñas comunes
        const contrasenasComunes = [
            'password', '123456', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein'
        ];

        if (contrasenasComunes.some(c => valor.toLowerCase().includes(c))) {
            return 'La contraseña es demasiado común';
        }

        return null;
    },

    // Validador de confirmación
    passwordConfirm: (valor, passwordOriginal) => {
        if (valor !== passwordOriginal) {
            return 'Las contraseñas no coinciden';
        }
        return null;
    }
};

// Indicador visual de fortaleza
export function calcularFortalezaPassword(password) {
    let puntos = 0;

    if (password.length >= 12) puntos += 1;
    if (password.length >= 16) puntos += 1;
    if (/[a-z]/.test(password)) puntos += 1;
    if (/[A-Z]/.test(password)) puntos += 1;
    if (/\d/.test(password)) puntos += 1;
    if (/[^a-zA-Z\d]/.test(password)) puntos += 1;

    if (puntos <= 2) return { nivel: 'débil', color: '#dc3545', porcentaje: 33 };
    if (puntos <= 4) return { nivel: 'media', color: '#ffc107', porcentaje: 66 };
    return { nivel: 'fuerte', color: '#28a745', porcentaje: 100 };
}
```

**HTML - Indicador visual:**
```html
<div class="password-strength">
    <div class="strength-bar">
        <div class="strength-fill" id="strengthFill"></div>
    </div>
    <span class="strength-text" id="strengthText"></span>
</div>

<script>
document.getElementById('password').addEventListener('input', (e) => {
    const fortaleza = calcularFortalezaPassword(e.target.value);
    document.getElementById('strengthFill').style.width = fortaleza.porcentaje + '%';
    document.getElementById('strengthFill').style.backgroundColor = fortaleza.color;
    document.getElementById('strengthText').textContent =
        `Fortaleza: ${fortaleza.nivel}`;
});
</script>
```

---

### 3. Rate Limiting Client-Side

**Implementación:**

```javascript
// utils.js - Nuevo rate limiter
class RateLimiter {
    constructor(maxRequests, windowMs) {
        this.maxRequests = maxRequests;
        this.windowMs = windowMs;
        this.requests = new Map(); // key -> [timestamps]
    }

    isAllowed(key) {
        const now = Date.now();
        const userRequests = this.requests.get(key) || [];

        // Limpiar timestamps antiguos
        const validRequests = userRequests.filter(
            timestamp => now - timestamp < this.windowMs
        );

        if (validRequests.length >= this.maxRequests) {
            return false;
        }

        validRequests.push(now);
        this.requests.set(key, validRequests);
        return true;
    }

    getRemainingTime(key) {
        const userRequests = this.requests.get(key) || [];
        if (userRequests.length === 0) return 0;

        const oldestRequest = Math.min(...userRequests);
        const timeLeft = this.windowMs - (Date.now() - oldestRequest);
        return Math.max(0, Math.ceil(timeLeft / 1000)); // segundos
    }
}

// Instancias globales
export const rateLimiters = {
    search: new RateLimiter(30, 60000),      // 30 búsquedas por minuto
    create: new RateLimiter(10, 60000),      // 10 creaciones por minuto
    update: new RateLimiter(20, 60000),      // 20 actualizaciones por minuto
    messages: new RateLimiter(5, 60000)      // 5 mensajes por minuto
};

// Uso en handlers
export async function handleBusquedaInteligente(query) {
    const userId = await getUserId();
    const limitKey = `search_${userId}`;

    if (!rateLimiters.search.isAllowed(limitKey)) {
        const waitTime = rateLimiters.search.getRemainingTime(limitKey);
        mostrarAlerta('warning',
            `Demasiadas búsquedas. Espera ${waitTime} segundos.`);
        return;
    }

    // Continuar con búsqueda...
}
```

---

### 4. Content Security Policy (CSP)

**Agregar en netlify.toml:**

```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"

    # Nueva CSP
    Content-Security-Policy = """
      default-src 'self';
      script-src 'self' https://cdn.jsdelivr.net;
      style-src 'self' 'unsafe-inline';
      img-src 'self' data: https:;
      font-src 'self';
      connect-src 'self' https://*.supabase.co;
      frame-ancestors 'none';
    """
```

---

## Mejoras de Rendimiento

### 1. Lazy Loading de Módulos

**Implementación:**

```javascript
// app.js - Carga bajo demanda
async function inicializarApp() {
    // Módulos críticos (carga inmediata)
    await verificarSesion();
    await handleCargarSiniestros(0, false);

    // Módulos secundarios (lazy load)
    const tabButtons = document.querySelectorAll('.tab-button');

    tabButtons.forEach(button => {
        button.addEventListener('click', async (e) => {
            const tabName = e.target.dataset.tab;

            // Cargar módulo solo cuando se necesita
            if (tabName === 'mensajes' && !window.mensajesLoaded) {
                const { setupMensajesHandlers } = await import(
                    './handlers/mensajes.handlers.js'
                );
                setupMensajesHandlers();
                window.mensajesLoaded = true;
            }

            if (tabName === 'reportes' && !window.reportesLoaded) {
                const { setupReportesHandlers } = await import(
                    './handlers/reportes.handlers.js'
                );
                setupReportesHandlers();
                window.reportesLoaded = true;
            }

            // ... otros tabs
        });
    });
}
```

---

### 2. Service Worker para Cache Offline

**Nuevo archivo: sw.js**

```javascript
// Service Worker para cache de assets
const CACHE_NAME = 'aseguradora-tajy-v1';
const ASSETS_TO_CACHE = [
    '/',
    '/index.html',
    '/login.html',
    '/config.js',
    '/assets/css/styles.css',
    '/assets/js/app.js',
    '/assets/js/supabase.js',
    '/assets/js/auth.js',
    '/logo/logo.png'
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS_TO_CACHE))
    );
});

self.addEventListener('fetch', (event) => {
    // Solo cachear GET requests
    if (event.request.method !== 'GET') return;

    // No cachear Supabase API calls
    if (event.request.url.includes('supabase.co')) return;

    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});
```

**Registrar en app.js:**
```javascript
// Registrar service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('✅ Service Worker registrado'))
        .catch(err => console.error('❌ Error SW:', err));
}
```

---

### 3. Optimización de Imágenes y Assets

**Recomendaciones:**

1. **Logo optimizado:**
   ```bash
   # Convertir a WebP (mejor compresión)
   cwebp -q 80 logo/logo.png -o logo/logo.webp
   ```

2. **Sprites para iconos:**
   ```css
   /* En lugar de emojis Unicode, usar SVG sprites */
   .icono-whatsapp {
       background: url('assets/icons/sprites.svg#whatsapp');
   }
   ```

3. **Preload de fonts:**
   ```html
   <link rel="preload" href="fonts/Roboto.woff2" as="font" type="font/woff2" crossorigin>
   ```

---

### 4. Debounce Optimizado

**Mejorar debounce actual con requestAnimationFrame:**

```javascript
// utils.js - Debounce mejorado
export function debouncedRAF(func, wait) {
    let timeout;
    let rafId;

    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);

            // Usar requestAnimationFrame para sincronizar con repaint
            rafId = requestAnimationFrame(() => {
                func(...args);
            });
        };

        clearTimeout(timeout);
        if (rafId) cancelAnimationFrame(rafId);

        timeout = setTimeout(later, wait);
    };
}

// Uso en búsqueda
const busquedaOptimizada = debouncedRAF(async (query) => {
    await handleBusquedaInteligente(query);
}, 200);
```

---

## Roadmap de Implementación

### Sprint 1: Seguridad Crítica (1 día)

**Prioridad CRÍTICA:**
- [ ] Fix XSS en renderizado de tabla (ui.js:527-543)
- [ ] Implementar validación de contraseñas fuerte
- [ ] Agregar rate limiting client-side
- [ ] Actualizar CSP en netlify.toml

**Estimación:** 4-6 horas
**Impacto:** 🔴 ALTO - Vulnerabilidades de seguridad

---

### Sprint 2: Sistema de Alertas Mejorado (2-3 días)

**Fase 1: Widget Visual (2 horas)**
- [ ] Crear componente de widget de resumen
- [ ] Implementar 3 niveles de urgencia
- [ ] Eliminar toast automático molesto
- [ ] Agregar filtros clickeables

**Fase 2: Notificaciones con Historial (3 horas)**
- [ ] Crear tabla `notificaciones_seguimiento`
- [ ] Implementar badge en navbar
- [ ] Panel desplegable de notificaciones
- [ ] Función snooze básica

**Fase 3: Tab Seguimientos (4 horas)**
- [ ] Crear nueva tab "Seguimientos"
- [ ] Vista de tarjetas
- [ ] Acciones rápidas
- [ ] Filtros por nivel

**Fase 4: Preferencias (2 horas)**
- [ ] Tabla de preferencias de usuario
- [ ] Panel de configuración
- [ ] Umbrales personalizables

**Estimación:** 11 horas (1.5 días)
**Impacto:** 🟢 ALTO - Mejora UX significativa

---

### Sprint 3: Refactorización de Código (2 días)

**Día 1: Modularización**
- [ ] Dividir siniestros.js en 3 módulos
- [ ] Extraer CSS a archivos externos
- [ ] Eliminar duplicación de código
- [ ] Centralizar generación de cache keys

**Día 2: Optimizaciones**
- [ ] Implementar actualización granular de tabla
- [ ] Optimizar renderizado con requestAnimationFrame
- [ ] Lazy loading de módulos secundarios
- [ ] Reducir console.logs

**Estimación:** 12 horas (1.5 días)
**Impacto:** 🟡 MEDIO - Mejora mantenibilidad

---

### Sprint 4: Performance (1-2 días)

**Optimizaciones:**
- [ ] Service Worker para cache offline
- [ ] Optimización de imágenes (WebP)
- [ ] Preload de recursos críticos
- [ ] Minificación de assets en producción

**Monitoreo:**
- [ ] Agregar performance.mark() en operaciones críticas
- [ ] Dashboard de métricas (opcional)

**Estimación:** 8 horas (1 día)
**Impacto:** 🟡 MEDIO - Mejora velocidad

---

### Sprint 5: Testing y Documentación (1 día)

**Testing:**
- [ ] Tests unitarios para validadores
- [ ] Tests de integración para CRUD
- [ ] Tests E2E con Playwright/Cypress (opcional)

**Documentación:**
- [ ] Actualizar CLAUDE.md
- [ ] Documentar nuevas APIs
- [ ] Guía de usuario para alertas

**Estimación:** 6 horas
**Impacto:** 🟢 ALTO - Calidad y mantenibilidad

---

## Métricas de Éxito

### Before / After

| Métrica | Antes | Después (objetivo) |
|---------|-------|-------------------|
| Vulnerabilidades XSS | 1 crítica | 0 |
| Tamaño máximo de archivo | 848 LOC | <400 LOC |
| Tiempo de carga inicial | ~2s | <1s |
| Cache hit rate | ~60% | >80% |
| Satisfacción con alertas | Media | Alta |
| Líneas CSS inline | 1,500 | 0 |
| Cobertura de tests | 0% | >70% |

### KPIs de Alertas

- **Tasa de respuesta a alertas urgentes**: >90% en 24h
- **Falsos positivos (snooze rate)**: <20%
- **Tiempo promedio de resolución**: -30%
- **Quejas por molestia**: -100% (eliminar toasts)

---

## Anexo: Código de Ejemplo Completo

### Ejemplo 1: Widget de Alertas Visual

```javascript
// assets/js/componentes/widget-alertas.js

export function crearWidgetAlertas(estadisticas) {
    const widget = document.createElement('div');
    widget.className = 'alertas-resumen';
    widget.id = 'widgetAlertas';

    widget.innerHTML = `
        <div class="alerta-nivel nivel-urgente"
             onclick="window.filtrarPorNivelAlerta('urgente')"
             role="button"
             tabindex="0"
             aria-label="Filtrar siniestros urgentes">
            <div class="icono-container">
                <span class="icono">🔴</span>
            </div>
            <div class="contenido">
                <span class="cantidad">${estadisticas.urgente}</span>
                <span class="texto">Urgentes</span>
                <span class="subtexto">14+ días</span>
            </div>
        </div>

        <div class="alerta-nivel nivel-importante"
             onclick="window.filtrarPorNivelAlerta('importante')">
            <div class="icono-container">
                <span class="icono">⚠️</span>
            </div>
            <div class="contenido">
                <span class="cantidad">${estadisticas.importante}</span>
                <span class="texto">Importantes</span>
                <span class="subtexto">7-13 días</span>
            </div>
        </div>

        <div class="alerta-nivel nivel-atencion"
             onclick="window.filtrarPorNivelAlerta('atencion')">
            <div class="icono-container">
                <span class="icono">📋</span>
            </div>
            <div class="contenido">
                <span class="cantidad">${estadisticas.atencion}</span>
                <span class="texto">Atención</span>
                <span class="subtexto">3-6 días</span>
            </div>
        </div>

        <div class="alerta-nivel nivel-ok" onclick="window.mostrarTodosSiniestros()">
            <div class="icono-container">
                <span class="icono">✅</span>
            </div>
            <div class="contenido">
                <span class="cantidad">${estadisticas.ok}</span>
                <span class="texto">Al día</span>
                <span class="subtexto">< 3 días</span>
            </div>
        </div>
    `;

    return widget;
}

export function actualizarWidgetAlertas(estadisticas) {
    const widget = document.getElementById('widgetAlertas');
    if (!widget) return;

    // Actualizar solo los números (más eficiente que recrear)
    const niveles = ['urgente', 'importante', 'atencion', 'ok'];

    niveles.forEach(nivel => {
        const elemento = widget.querySelector(`.nivel-${nivel} .cantidad`);
        if (elemento) {
            const valorAnterior = parseInt(elemento.textContent);
            const valorNuevo = estadisticas[nivel];

            // Animación si cambió
            if (valorAnterior !== valorNuevo) {
                elemento.classList.add('actualizado');
                elemento.textContent = valorNuevo;

                setTimeout(() => {
                    elemento.classList.remove('actualizado');
                }, 500);
            }
        }
    });
}
```

**CSS del widget:**
```css
/* assets/css/alertas.css */

.alertas-resumen {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    border-radius: 12px;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    animation: slideDown 0.3s ease-out;
}

@keyframes slideDown {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.alerta-nivel {
    display: flex;
    align-items: center;
    gap: 1rem;
    padding: 1.25rem;
    background: white;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    border-left: 4px solid transparent;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.alerta-nivel:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.15);
}

.alerta-nivel:active {
    transform: translateY(-2px);
}

.nivel-urgente { border-left-color: #dc3545; }
.nivel-importante { border-left-color: #ff9800; }
.nivel-atencion { border-left-color: #ffc107; }
.nivel-ok { border-left-color: #28a745; }

.icono-container {
    flex-shrink: 0;
    width: 50px;
    height: 50px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2rem;
    background: rgba(0, 0, 0, 0.03);
    border-radius: 50%;
}

.alerta-nivel .contenido {
    flex: 1;
    display: flex;
    flex-direction: column;
}

.alerta-nivel .cantidad {
    font-size: 2.5rem;
    font-weight: 700;
    line-height: 1;
    color: #2c3e50;
    transition: all 0.3s ease;
}

.alerta-nivel .cantidad.actualizado {
    transform: scale(1.2);
    color: #007bff;
}

.alerta-nivel .texto {
    font-size: 1rem;
    font-weight: 600;
    color: #34495e;
    margin-top: 0.25rem;
}

.alerta-nivel .subtexto {
    font-size: 0.75rem;
    color: #7f8c8d;
    margin-top: 0.25rem;
}

/* Responsive */
@media (max-width: 768px) {
    .alertas-resumen {
        grid-template-columns: repeat(2, 1fr);
        gap: 0.75rem;
        padding: 0.75rem;
    }

    .alerta-nivel {
        padding: 1rem;
    }

    .alerta-nivel .cantidad {
        font-size: 2rem;
    }
}

/* Animación de pulso para urgentes */
.nivel-urgente.tiene-alertas {
    animation: pulsoSutil 2s ease-in-out infinite;
}

@keyframes pulsoSutil {
    0%, 100% {
        box-shadow: 0 2px 4px rgba(220, 53, 69, 0.2);
    }
    50% {
        box-shadow: 0 4px 12px rgba(220, 53, 69, 0.4);
    }
}
```

---

### Ejemplo 2: Panel de Notificaciones

```javascript
// assets/js/componentes/panel-notificaciones.js

export async function cargarNotificaciones() {
    const userId = await getUserId();

    const { data, error } = await clienteSupabase
        .from('notificaciones_seguimiento')
        .select(`
            *,
            siniestros (
                numero,
                asegurado,
                telefono,
                estado,
                fecha
            )
        `)
        .eq('user_id', userId)
        .eq('leida', false)
        .or(`snoozed_hasta.is.null,snoozed_hasta.lt.${new Date().toISOString()}`)
        .order('nivel_urgencia', { ascending: false })
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error cargando notificaciones:', error);
        return [];
    }

    return data;
}

export function renderizarPanelNotificaciones(notificaciones) {
    const panel = document.getElementById('panelNotificaciones');
    if (!panel) return;

    const listaContainer = panel.querySelector('.lista-notificaciones');

    if (notificaciones.length === 0) {
        listaContainer.innerHTML = `
            <div class="sin-notificaciones">
                <span class="icono">✅</span>
                <p>No hay seguimientos pendientes</p>
            </div>
        `;
        return;
    }

    listaContainer.innerHTML = notificaciones.map(notif => {
        const siniestro = notif.siniestros;
        const diasTranscurridos = calcularDiasTranscurridos(siniestro.fecha);

        const iconoNivel = {
            urgente: '🔴',
            importante: '⚠️',
            atencion: '📋'
        }[notif.nivel_urgencia] || '📋';

        const tiempoRelativo = formatearTiempoRelativo(notif.created_at);

        return `
            <div class="notificacion ${notif.nivel_urgencia} ${notif.leida ? '' : 'no-leida'}"
                 data-id="${notif.id}"
                 data-siniestro-id="${siniestro.id}">
                <div class="notif-icono">${iconoNivel}</div>
                <div class="notif-contenido">
                    <strong>${escapeHtml(siniestro.numero)}</strong>
                    <p>${escapeHtml(siniestro.asegurado)} - ${diasTranscurridos} días sin actualización</p>
                    <span class="notif-tiempo">${tiempoRelativo}</span>
                </div>
                <div class="notif-acciones">
                    <button class="btn-icono"
                            onclick="handleEditarSiniestro(${siniestro.id})"
                            title="Editar">
                        ✏️
                    </button>
                    <button class="btn-icono"
                            onclick="mostrarOpcionesSnooze(${notif.id})"
                            title="Posponer">
                        ⏰
                    </button>
                    <button class="btn-icono"
                            onclick="marcarNotificacionLeida(${notif.id})"
                            title="Marcar leída">
                        ✓
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

export function formatearTiempoRelativo(fecha) {
    const ahora = new Date();
    const entonces = new Date(fecha);
    const diffMs = ahora - entonces;
    const diffMinutos = Math.floor(diffMs / 60000);

    if (diffMinutos < 1) return 'Ahora';
    if (diffMinutos < 60) return `Hace ${diffMinutos} min`;

    const diffHoras = Math.floor(diffMinutos / 60);
    if (diffHoras < 24) return `Hace ${diffHoras}h`;

    const diffDias = Math.floor(diffHoras / 24);
    if (diffDias < 7) return `Hace ${diffDias}d`;

    const diffSemanas = Math.floor(diffDias / 7);
    return `Hace ${diffSemanas}sem`;
}
```

---

## Conclusiones

Este documento presenta un plan completo de optimización para Aseguradora Tajy, con especial énfasis en mejorar el sistema de alertas de seguimiento para que sea:

✅ **Menos molesto**: Eliminando toasts automáticos
✅ **Más informativo**: Niveles de urgencia claros
✅ **Más útil**: Acciones rápidas integradas
✅ **Más flexible**: Configuración personalizable
✅ **Más seguro**: Corrección de vulnerabilidades críticas

### Prioridades Recomendadas

1. **INMEDIATO** (esta semana): Fix XSS + fortalecimiento de passwords
2. **CORTO PLAZO** (próximas 2 semanas): Sistema de alertas mejorado
3. **MEDIANO PLAZO** (próximo mes): Refactorización y optimizaciones
4. **LARGO PLAZO** (próximos 3 meses): Testing, monitoreo, features avanzadas

---

**Documento creado el**: 2026-01-25
**Autor**: Claude (Asistente AI)
**Versión**: 1.0
**Estado**: Propuesta para revisión
