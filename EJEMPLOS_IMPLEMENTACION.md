# 💻 Ejemplos de Implementación - Mejoras Prioritarias

Este documento contiene ejemplos de código listos para implementar las mejoras más importantes.

---

## 1. 🔐 Seguridad: Variables de Entorno

### Crear `config.js` (NO subir a Git)
```javascript
// config.js
const config = {
    url: 'https://myfisecfgbhpzgpkxxeb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' // Tu clave aquí
};

// Exportar solo si es módulo, o usar window.config
if (typeof window !== 'undefined') {
    window.config = config;
}
```

### Actualizar `index.html`
```html
<!-- Antes de app.js -->
<script src="config.js"></script>
<script src="app.js?v=3.7"></script>
```

### Actualizar `app.js`
```javascript
// Reemplazar la sección de configuración
const config = window.config || {
    url: '', // Vacío por defecto
    key: ''
};

// Validar al inicio
if (!config.url || !config.key) {
    console.error('⚠️ Configuración no encontrada');
    mostrarAlerta('error', 'Error de configuración. Contacte al administrador.');
}
```

### Crear `.gitignore`
```
config.js
.env
*.log
node_modules/
```

---

## 2. 📄 Paginación de Resultados

### Actualizar `app.js` - Función de carga
```javascript
let paginaActual = 0;
const limitePorPagina = 50;
let totalRegistros = 0;

async function cargarSiniestros(pagina = 0) {
    if (!clienteSupabase) {
        console.error('Supabase no está inicializado');
        return;
    }

    mostrarCargando('loadingLista', true);
    paginaActual = pagina;

    try {
        // Obtener total de registros
        const { count } = await clienteSupabase
            .from('siniestros')
            .select('*', { count: 'exact', head: true });
        
        totalRegistros = count || 0;

        // Cargar página específica
        const { data, error } = await clienteSupabase
            .from('siniestros')
            .select('*')
            .order('created_at', { ascending: false })
            .range(pagina * limitePorPagina, (pagina + 1) * limitePorPagina - 1);

        if (error) throw error;

        siniestros = data || [];
        actualizarTabla();
        actualizarEstadisticas();
        actualizarControlesPaginacion();
        
        console.log(`✅ ${siniestros.length} siniestros cargados (página ${pagina + 1})`);
    } catch (error) {
        console.error('Error al cargar siniestros:', error);
        mostrarAlerta('error', 'Error al cargar los siniestros: ' + error.message);
    } finally {
        mostrarCargando('loadingLista', false);
    }
}

function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(totalRegistros / limitePorPagina);
    const contenedor = document.getElementById('paginacion');
    
    if (!contenedor) return;

    let html = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
            <div>
                <span>Mostrando ${paginaActual * limitePorPagina + 1} - ${Math.min((paginaActual + 1) * limitePorPagina, totalRegistros)} de ${totalRegistros}</span>
            </div>
            <div style="display: flex; gap: 10px;">
                <button class="btn btn-primary" onclick="cargarSiniestros(0)" ${paginaActual === 0 ? 'disabled' : ''}>
                    ⏮️ Primera
                </button>
                <button class="btn btn-primary" onclick="cargarSiniestros(${paginaActual - 1})" ${paginaActual === 0 ? 'disabled' : ''}>
                    ⬅️ Anterior
                </button>
                <span style="padding: 10px;">
                    Página ${paginaActual + 1} de ${totalPaginas}
                </span>
                <button class="btn btn-primary" onclick="cargarSiniestros(${paginaActual + 1})" ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''}>
                    Siguiente ➡️
                </button>
                <button class="btn btn-primary" onclick="cargarSiniestros(${totalPaginas - 1})" ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''}>
                    Última ⏭️
                </button>
            </div>
        </div>
    `;
    
    contenedor.innerHTML = html;
}
```

### Actualizar `index.html` - Agregar contenedor de paginación
```html
<!-- Después de la tabla, antes de cerrar el div.card -->
<div id="paginacion"></div>
```

---

## 3. 🔍 Filtrado en Servidor (Optimizado)

### Reemplazar función `filtrarTabla()` en `app.js`
```javascript
let filtrosActuales = {
    asegurado: '',
    numero: '',
    estado: ''
};

async function filtrarTabla() {
    const buscarAsegurado = document.getElementById('buscarAsegurado').value.trim();
    const buscarSiniestro = document.getElementById('buscarSiniestro').value.trim();
    const filtroEstado = document.getElementById('filtroEstado').value;

    // Actualizar filtros
    filtrosActuales = {
        asegurado: buscarAsegurado,
        numero: buscarSiniestro,
        estado: filtroEstado
    };

    // Aplicar filtros
    await aplicarFiltros();
}

async function aplicarFiltros() {
    if (!clienteSupabase) return;

    mostrarCargando('loadingLista', true);

    try {
        let query = clienteSupabase
            .from('siniestros')
            .select('*')
            .order('created_at', { ascending: false });

        // Aplicar filtros
        if (filtrosActuales.asegurado) {
            query = query.ilike('asegurado', `%${filtrosActuales.asegurado}%`);
        }
        
        if (filtrosActuales.numero) {
            query = query.ilike('numero', `%${filtrosActuales.numero}%`);
        }
        
        if (filtrosActuales.estado) {
            query = query.eq('estado', filtrosActuales.estado);
        }

        const { data, error } = await query;

        if (error) throw error;

        siniestros = data || [];
        actualizarTabla();
        actualizarEstadisticas();
        
        // Mostrar mensaje si no hay resultados
        if (siniestros.length === 0) {
            mostrarAlerta('info', 'No se encontraron siniestros con los filtros aplicados');
        }
    } catch (error) {
        console.error('Error al filtrar:', error);
        mostrarAlerta('error', 'Error al aplicar filtros: ' + error.message);
    } finally {
        mostrarCargando('loadingLista', false);
    }
}

// Debounce para búsquedas
function debounce(func, wait) {
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

// Aplicar debounce a los inputs de búsqueda
const filtrarTablaDebounced = debounce(filtrarTabla, 500);
```

### Actualizar `index.html` - Cambiar eventos
```html
<input type="text" id="buscarAsegurado" placeholder="🔍 Buscar por asegurado..." onkeyup="filtrarTablaDebounced()">
<input type="text" id="buscarSiniestro" placeholder="🔍 Buscar por número de siniestro..." onkeyup="filtrarTablaDebounced()">
<select id="filtroEstado" onchange="filtrarTabla()">
```

---

## 4. ✅ Validación Mejorada de Formularios

### Agregar a `app.js`
```javascript
// Validadores
const validadores = {
    numero: (valor) => {
        // Formato: YYYY-XXX
        const regex = /^\d{4}-\d+$/;
        if (!regex.test(valor)) {
            return 'El formato debe ser YYYY-XXX (ej: 2026-001)';
        }
        return null;
    },
    
    telefono: (valor) => {
        // Formato: +595 XXX XXXXXX
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

// Función de validación en tiempo real
function validarCampo(campo, valor) {
    const errorElement = document.getElementById(`${campo}Error`);
    const inputElement = document.getElementById(campo) || document.querySelector(`[name="${campo}"]`);
    
    if (!inputElement) return;

    const error = validadores[campo] ? validadores[campo](valor) : null;

    if (error) {
        inputElement.style.borderColor = '#dc3545';
        if (errorElement) {
            errorElement.textContent = error;
            errorElement.style.display = 'block';
        } else {
            // Crear elemento de error si no existe
            const errorDiv = document.createElement('div');
            errorDiv.id = `${campo}Error`;
            errorDiv.className = 'error-message';
            errorDiv.textContent = error;
            errorDiv.style.color = '#dc3545';
            errorDiv.style.fontSize = '0.85em';
            errorDiv.style.marginTop = '5px';
            inputElement.parentElement.appendChild(errorDiv);
        }
        return false;
    } else {
        inputElement.style.borderColor = '#28a745';
        if (errorElement) {
            errorElement.style.display = 'none';
        }
        return true;
    }
}

// Verificar duplicados antes de guardar
async function verificarDuplicado(numero) {
    if (!clienteSupabase) return false;
    
    const { data, error } = await clienteSupabase
        .from('siniestros')
        .select('id')
        .eq('numero', numero)
        .limit(1);
    
    return data && data.length > 0;
}
```

### Actualizar función `agregarSiniestro()`
```javascript
async function agregarSiniestro(event) {
    event.preventDefault();

    if (!clienteSupabase) {
        mostrarAlerta('error', 'No hay conexión con la base de datos');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const numero = formData.get('numero');
    const asegurado = formData.get('asegurado');
    const telefono = formData.get('telefono');

    // Validaciones
    if (!validarCampo('numero', numero)) return;
    if (!validarCampo('asegurado', asegurado)) return;
    if (!validarCampo('telefono', telefono)) return;

    // Verificar duplicado
    const existe = await verificarDuplicado(numero);
    if (existe) {
        mostrarAlerta('error', '❌ Ya existe un siniestro con ese número');
        return;
    }

    const btnGuardar = document.getElementById('btnGuardar');
    btnGuardar.disabled = true;
    btnGuardar.textContent = '⏳ Guardando...';

    try {
        const fechaActual = new Date().toISOString().split('T')[0];

        const nuevoSiniestro = {
            numero: numero,
            asegurado: asegurado,
            sexo: formData.get('sexo') || '',
            telefono: telefono,
            fecha: fechaActual,
            tipo: '',
            estado: 'pendiente',
            monto: formData.get('siniestro_total') || 'No',
            poliza: '',
            taller: '',
            observaciones: formData.get('observaciones') || ''
        };

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .insert([nuevoSiniestro])
            .select();

        if (error) throw error;

        mostrarAlerta('success', '✅ Siniestro registrado exitosamente');
        form.reset();
        await cargarSiniestros();
        cambiarTabDirecto('lista');
    } catch (error) {
        console.error('Error al crear siniestro:', error);
        mostrarAlerta('error', '❌ Error al guardar: ' + error.message);
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = '💾 Guardar Siniestro';
    }
}
```

### Agregar estilos CSS para errores
```css
.error-message {
    color: #dc3545;
    font-size: 0.85em;
    margin-top: 5px;
    display: block;
}

.form-group input:invalid,
.form-group select:invalid {
    border-color: #dc3545;
}

.form-group input:valid,
.form-group select:valid {
    border-color: #28a745;
}
```

---

## 5. 🎨 Skeleton Loaders

### Agregar CSS
```css
.skeleton {
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: loading 1.5s ease-in-out infinite;
    border-radius: 4px;
}

@keyframes loading {
    0% {
        background-position: 200% 0;
    }
    100% {
        background-position: -200% 0;
    }
}

.skeleton-row {
    display: flex;
    gap: 10px;
    padding: 12px;
}

.skeleton-cell {
    flex: 1;
    height: 20px;
}
```

### Función para mostrar skeleton
```javascript
function mostrarSkeletonTabla() {
    const tbody = document.getElementById('listaSiniestros');
    tbody.innerHTML = '';
    
    for (let i = 0; i < 5; i++) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 150px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 80px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 100px;"></div></td>
            <td><div class="skeleton" style="height: 20px; width: 120px;"></div></td>
        `;
        tbody.appendChild(tr);
    }
}
```

### Actualizar `cargarSiniestros()`
```javascript
async function cargarSiniestros(pagina = 0) {
    // ...
    mostrarSkeletonTabla(); // Mostrar skeleton inmediatamente
    mostrarCargando('loadingLista', true);
    
    try {
        // ... código de carga ...
    } finally {
        mostrarCargando('loadingLista', false);
    }
}
```

---

## 6. 📊 Ordenamiento de Tabla

### Agregar a `app.js`
```javascript
let ordenActual = {
    columna: 'created_at',
    direccion: 'desc'
};

function ordenarPor(columna) {
    // Si es la misma columna, invertir dirección
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }

    // Aplicar ordenamiento
    aplicarOrdenamiento();
    actualizarIconosOrdenamiento();
}

function aplicarOrdenamiento() {
    siniestros.sort((a, b) => {
        let valorA = a[ordenActual.columna];
        let valorB = b[ordenActual.columna];

        // Manejar diferentes tipos
        if (ordenActual.columna === 'fecha' || ordenActual.columna === 'created_at') {
            valorA = new Date(valorA);
            valorB = new Date(valorB);
        } else if (typeof valorA === 'string') {
            valorA = valorA.toLowerCase();
            valorB = valorB.toLowerCase();
        }

        if (ordenActual.direccion === 'asc') {
            return valorA > valorB ? 1 : -1;
        } else {
            return valorA < valorB ? 1 : -1;
        }
    });

    actualizarTabla();
}

function actualizarIconosOrdenamiento() {
    // Remover todos los iconos
    document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());

    // Agregar icono a la columna actual
    const headers = document.querySelectorAll('#tablaSiniestros th');
    headers.forEach((header, index) => {
        const columnas = ['numero', 'asegurado', 'telefono', 'fecha', 'estado', 'monto'];
        if (columnas[index] === ordenActual.columna) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            icon.textContent = ordenActual.direccion === 'asc' ? ' ↑' : ' ↓';
            icon.style.marginLeft = '5px';
            header.appendChild(icon);
        }
    });
}
```

### Actualizar `index.html` - Headers clickeables
```html
<thead>
    <tr>
        <th onclick="ordenarPor('numero')" style="cursor: pointer;">Nº Siniestro</th>
        <th onclick="ordenarPor('asegurado')" style="cursor: pointer;">Asegurado</th>
        <th onclick="ordenarPor('telefono')" style="cursor: pointer;">Teléfono</th>
        <th onclick="ordenarPor('fecha')" style="cursor: pointer;">Fecha</th>
        <th onclick="ordenarPor('estado')" style="cursor: pointer;">Estado</th>
        <th>Siniestro Total</th>
        <th>Acciones</th>
    </tr>
</thead>
```

---

## 7. 💾 Caché Local Básico

### Agregar a `app.js`
```javascript
const cacheManager = {
    prefix: 'tajy_',
    ttl: 5 * 60 * 1000, // 5 minutos

    set: (key, data) => {
        try {
            const item = {
                data,
                timestamp: Date.now()
            };
            localStorage.setItem(cacheManager.prefix + key, JSON.stringify(item));
        } catch (e) {
            console.warn('Error al guardar en caché:', e);
        }
    },

    get: (key) => {
        try {
            const item = localStorage.getItem(cacheManager.prefix + key);
            if (!item) return null;

            const parsed = JSON.parse(item);
            const age = Date.now() - parsed.timestamp;

            if (age > cacheManager.ttl) {
                localStorage.removeItem(cacheManager.prefix + key);
                return null;
            }

            return parsed.data;
        } catch (e) {
            console.warn('Error al leer caché:', e);
            return null;
        }
    },

    clear: () => {
        Object.keys(localStorage)
            .filter(key => key.startsWith(cacheManager.prefix))
            .forEach(key => localStorage.removeItem(key));
    }
};

// Usar caché en cargarSiniestros
async function cargarSiniestros(pagina = 0) {
    // Intentar cargar desde caché primero
    const cacheKey = `siniestros_${pagina}`;
    const cached = cacheManager.get(cacheKey);
    
    if (cached) {
        siniestros = cached;
        actualizarTabla();
        actualizarEstadisticas();
        console.log('✅ Datos cargados desde caché');
    }

    // Cargar datos frescos en background
    // ... código de carga normal ...
    
    // Guardar en caché
    cacheManager.set(cacheKey, siniestros);
}
```

---

## 8. 🎯 Toast Notifications Mejoradas

### Agregar CSS
```css
.toast-container {
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.toast {
    background: white;
    padding: 15px 20px;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    min-width: 300px;
    display: flex;
    align-items: center;
    gap: 12px;
    animation: slideInRight 0.3s ease-out;
    border-left: 4px solid;
}

.toast-success { border-left-color: #28a745; }
.toast-error { border-left-color: #dc3545; }
.toast-info { border-left-color: #17a2b8; }
.toast-warning { border-left-color: #ffc107; }

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.toast-close {
    margin-left: auto;
    cursor: pointer;
    font-size: 20px;
    color: #999;
}

.toast-close:hover {
    color: #333;
}
```

### Reemplazar función `mostrarAlerta()`
```javascript
function mostrarAlerta(tipo, mensaje, duracion = 5000) {
    // Crear contenedor si no existe
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    // Crear toast
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    
    const icon = {
        success: '✅',
        error: '❌',
        info: 'ℹ️',
        warning: '⚠️'
    }[tipo] || 'ℹ️';

    toast.innerHTML = `
        <span style="font-size: 1.2em;">${icon}</span>
        <span style="flex: 1;">${mensaje}</span>
        <span class="toast-close" onclick="this.parentElement.remove()">&times;</span>
    `;

    container.appendChild(toast);

    // Auto-remover después de duración
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.3s ease-out reverse';
        setTimeout(() => toast.remove(), 300);
    }, duracion);
}
```

---

## 📝 Notas de Implementación

1. **Orden sugerido de implementación:**
   - Seguridad (config.js) - CRÍTICO
   - Validación de formularios - Importante
   - Debounce en búsquedas - Mejora UX inmediata
   - Paginación - Escalabilidad
   - Filtrado en servidor - Rendimiento
   - Resto de mejoras según prioridad

2. **Testing:** Probar cada mejora individualmente antes de continuar.

3. **Backup:** Hacer backup del código actual antes de implementar cambios grandes.

4. **Versionado:** Incrementar versión en `app.js` después de cada cambio importante.
