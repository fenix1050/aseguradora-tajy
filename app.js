// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
// Configuración movida a config.js para mayor seguridad
// Usar window.config directamente para evitar duplicación

// Obtener config de window.config (definido en config.js)
const getConfig = () => {
    if (window.config) {
        return window.config;
    }
    // Fallback si config.js no está cargado
    console.warn('⚠️ config.js no está cargado. Usando valores por defecto.');
    return {
        url: 'https://myfisecfgbhpzgpkxxeb.supabase.co',
        key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZmlzZWNmZ2JocHpncGt4eGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTcwODYsImV4cCI6MjA4NDE3MzA4Nn0.0fI3Xp_H9nPG9Eqba9_o-iKaY8qrGtrsx_sOg2sRYqw'
    };
};

let clienteSupabase;
let siniestros = [];
let usuarioActual = null; // Información del usuario autenticado
let paginaActual = 0;
const limitePorPagina = 50;
let totalRegistros = 0;
let ordenActual = { columna: 'created_at', direccion: 'desc' };
let filtrosActuales = { asegurado: '', numero: '', estado: '' };

// ============================================
// CACHÉ Y UTILIDADES
// ============================================

const cacheManager = {
    prefix: 'tajy_',
    ttl: 5 * 60 * 1000, // 5 minutos
    set: (key, data) => {
        try {
            const item = { data, timestamp: Date.now() };
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
            return null;
        }
    }
};

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

// ============================================
// AUTENTICACIÓN
// ============================================

async function verificarSesion() {
    if (!clienteSupabase) {
        console.warn('⚠️ Supabase no inicializado, saltando verificación de sesión');
        return false;
    }
    
    try {
        const { data: { session }, error } = await clienteSupabase.auth.getSession();
        if (error || !session) {
            console.log('❌ No hay sesión activa, redirigiendo al login');
            window.location.href = 'login.html';
            return false;
        }

        // Obtener información del usuario
        const { data: { user } } = await clienteSupabase.auth.getUser();
        if (!user) {
            console.log('❌ No se pudo obtener usuario, redirigiendo al login');
            window.location.href = 'login.html';
            return false;
        }

        // Obtener perfil del usuario desde la tabla usuarios
        try {
            const { data: perfil, error: perfilError } = await clienteSupabase
                .from('usuarios')
                .select('nombre_completo, rol')
                .eq('email', user.email)
                .single();

            if (!perfilError && perfil) {
                usuarioActual = {
                    email: user.email,
                    nombre: perfil.nombre_completo,
                    rol: perfil.rol
                };
            } else {
                // Si no hay perfil, usar email como nombre
                usuarioActual = {
                    email: user.email,
                    nombre: user.email.split('@')[0],
                    rol: 'tramitador'
                };
            }
        } catch (e) {
            // Si no existe la tabla usuarios, usar email
            usuarioActual = {
                email: user.email,
                nombre: user.email.split('@')[0],
                rol: 'tramitador'
            };
        }

        // Actualizar header con nombre del usuario
        actualizarHeaderUsuario();
        
        return true;
    } catch (error) {
        console.error('Error al verificar sesión:', error);
        window.location.href = 'login.html';
        return false;
    }
}

function actualizarHeaderUsuario() {
    const nombreElement = document.getElementById('userName');
    const roleElement = document.getElementById('userRole');

    if (nombreElement && usuarioActual) {
        nombreElement.textContent = usuarioActual.nombre;
    }

    if (roleElement && usuarioActual) {
        const rolTexto = usuarioActual.rol === 'admin' ? 'Administrador' : 'Tramitador de Siniestros';
        roleElement.textContent = rolTexto;
    }

    // Mostrar pestaña de administración solo para admins
    const tabAdmin = document.getElementById('tabAdmin');
    if (tabAdmin && usuarioActual && usuarioActual.rol === 'admin') {
        tabAdmin.style.display = 'block';
    }
}

async function cerrarSesion() {
    if (clienteSupabase) {
        await clienteSupabase.auth.signOut();
    }
    localStorage.removeItem('userSession');
    localStorage.removeItem('userProfile');
    window.location.href = 'login.html';
}

// ============================================
// FUNCIONES DE CONEXIÓN
// ============================================

async function inicializarSupabase() {
    try {
        const config = getConfig();
        
        if (!config.url || !config.key) {
            console.error('⚠️ ERROR: Configuración incompleta');
            mostrarAlerta('error', 'Error de configuración. Contacte al administrador.');
            actualizarEstadoConexion(false);
            return false;
        }

        console.log('✅ Configuración validada correctamente');

        const { createClient } = window.supabase;
        clienteSupabase = createClient(config.url, config.key);

        // Verificar autenticación
        const autenticado = await verificarSesion();
        if (!autenticado) {
            return false;
        }

        // Verificar conexión
        const { data, error } = await clienteSupabase.from('siniestros').select('count');

        if (error) {
            console.error('Error al conectar con Supabase:', error);
            mostrarAlerta('error', '❌ Error al conectar: ' + error.message);
            actualizarEstadoConexion(false);
            return false;
        }

        console.log('✅ Conectado exitosamente a Supabase');
        actualizarEstadoConexion(true);
        return true;
    } catch (error) {
        console.error('Error al inicializar Supabase:', error);
        mostrarAlerta('error', '❌ Error al inicializar: ' + error.message);
        actualizarEstadoConexion(false);
        return false;
    }
}

// ============================================
// FUNCIONES DE DATOS (CRUD)
// ============================================

async function cargarSiniestros(pagina = 0, aplicarFiltros = false) {
    if (!clienteSupabase) {
        console.error('Supabase no está inicializado');
        return;
    }

    mostrarSkeletonTabla();
    mostrarCargando('loadingLista', true);
    paginaActual = pagina;

    try {
        let query = clienteSupabase.from('siniestros').select('*', { count: 'exact' });

        // Aplicar filtros si están activos
        if (aplicarFiltros) {
            if (filtrosActuales.asegurado) {
                query = query.ilike('asegurado', `%${filtrosActuales.asegurado}%`);
            }
            if (filtrosActuales.numero) {
                query = query.ilike('numero', `%${filtrosActuales.numero}%`);
            }
            if (filtrosActuales.estado) {
                query = query.eq('estado', filtrosActuales.estado);
            }
        }

        // Aplicar ordenamiento
        query = query.order(ordenActual.columna, { ascending: ordenActual.direccion === 'asc' });

        // Aplicar paginación
        const desde = pagina * limitePorPagina;
        const hasta = (pagina + 1) * limitePorPagina - 1;
        query = query.range(desde, hasta);

        const { data, error, count } = await query;

        if (error) throw error;

        siniestros = data || [];
        totalRegistros = count || 0;

        actualizarTabla();
        actualizarEstadisticas();
        actualizarControlesPaginacion();
        
        // Guardar en caché
        cacheManager.set('siniestros', siniestros);
        
        console.log(`✅ ${siniestros.length} siniestros cargados (página ${pagina + 1}, total: ${totalRegistros})`);
    } catch (error) {
        console.error('Error al cargar siniestros:', error);
        mostrarAlerta('error', 'Error al cargar los siniestros: ' + error.message);
    } finally {
        mostrarCargando('loadingLista', false);
    }
}

// Validadores
const validadores = {
    numero: (valor) => {
        const regex = /^\d{4}-\d+$/;
        if (!regex.test(valor)) {
            return 'El formato debe ser YYYY-XXX (ej: 2026-001)';
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

function validarCampo(campo, valor, inputElement) {
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

async function verificarDuplicado(numero) {
    if (!clienteSupabase) return false;
    const { data } = await clienteSupabase
        .from('siniestros')
        .select('id')
        .eq('numero', numero)
        .limit(1);
    return data && data.length > 0;
}

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
    const numInput = form.querySelector('[name="numero"]');
    const asegInput = form.querySelector('[name="asegurado"]');
    const telInput = form.querySelector('[name="telefono"]');

    if (!validarCampo('numero', numero, numInput)) return;
    if (!validarCampo('asegurado', asegurado, asegInput)) return;
    if (!validarCampo('telefono', telefono, telInput)) return;

    // Verificar duplicado
    const existe = await verificarDuplicado(numero);
    if (existe) {
        mostrarAlerta('error', '❌ Ya existe un siniestro con ese número');
        numInput.style.borderColor = '#dc3545';
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
        if (telInput) telInput.value = '+595 ';

        await cargarSiniestros(0, false);
        cambiarTabDirecto('lista');
    } catch (error) {
        console.error('Error al crear siniestro:', error);
        if (error.code === '23505') {
            mostrarAlerta('error', '❌ Error: Ya existe un siniestro con ese número');
        } else {
            mostrarAlerta('error', '❌ Error al guardar: ' + error.message);
        }
    } finally {
        btnGuardar.disabled = false;
        btnGuardar.textContent = '💾 Guardar Siniestro';
    }
}

function editarSiniestro(id) {
    const siniestro = siniestros.find(s => s.id === id);
    if (!siniestro) return;

    document.getElementById('editId').value = id;
    document.getElementById('editNumero').value = siniestro.numero;
    document.getElementById('editAsegurado').value = siniestro.asegurado;
    document.getElementById('editTelefono').value = siniestro.telefono;
    document.getElementById('editSexo').value = siniestro.sexo || '';
    document.getElementById('editEstado').value = siniestro.estado;
    document.getElementById('editMonto').value = siniestro.monto;
    document.getElementById('editTaller').value = siniestro.taller || '';
    document.getElementById('editObservaciones').value = siniestro.observaciones || '';

    document.getElementById('modalEditar').style.display = 'block';
}

async function guardarEdicion(event) {
    event.preventDefault();

    if (!clienteSupabase) {
        mostrarAlerta('error', 'No hay conexión con la base de datos');
        return;
    }

    const id = parseInt(document.getElementById('editId').value);

    try {
        const datosActualizados = {
            numero: document.getElementById('editNumero').value,
            asegurado: document.getElementById('editAsegurado').value,
            telefono: document.getElementById('editTelefono').value,
            sexo: document.getElementById('editSexo').value || '',
            estado: document.getElementById('editEstado').value,
            monto: document.getElementById('editMonto').value,
            taller: document.getElementById('editTaller').value || '',
            observaciones: document.getElementById('editObservaciones').value || ''
        };

        const { data, error } = await clienteSupabase
            .from('siniestros')
            .update(datosActualizados)
            .eq('id', id)
            .select();

        if (error) throw error;

        console.log('✅ Siniestro actualizado:', data[0]);
        mostrarAlerta('success', '✅ Cambios guardados exitosamente');

        await cargarSiniestros();
        cerrarModal();
    } catch (error) {
        console.error('Error al actualizar siniestro:', error);
        mostrarAlerta('error', '❌ Error al guardar cambios: ' + error.message);
    }
}

async function eliminarSiniestro(id) {
    if (!confirm('¿Estás seguro de eliminar este siniestro?')) return;

    if (!clienteSupabase) {
        mostrarAlerta('error', 'No hay conexión con la base de datos');
        return;
    }

    try {
        const { error } = await clienteSupabase
            .from('siniestros')
            .delete()
            .eq('id', id);

        if (error) throw error;

        console.log('✅ Siniestro eliminado');
        mostrarAlerta('success', '✅ Siniestro eliminado exitosamente');

        await cargarSiniestros();
    } catch (error) {
        console.error('Error al eliminar siniestro:', error);
        mostrarAlerta('error', '❌ Error al eliminar: ' + error.message);
    }
}

// ============================================
// FUNCIONES DE UI
// ============================================

function actualizarEstadoConexion(conectado) {
    const statusElement = document.getElementById('connectionStatus');
    if (conectado) {
        statusElement.className = 'connection-status status-connected';
        statusElement.innerHTML = '🟢 Conectado';
    } else {
        statusElement.className = 'connection-status status-disconnected';
        statusElement.innerHTML = '🔴 No conectado';
    }
}

function mostrarCargando(elementId, mostrar) {
    const element = document.getElementById(elementId);
    if (element) {
        if (mostrar) {
            element.classList.add('active');
        } else {
            element.classList.remove('active');
        }
    }
}

// Toast notifications mejoradas
function mostrarAlerta(tipo, mensaje, duracion = 5000) {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

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

    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideInRight 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, duracion);
}

// Skeleton loader para tabla
function mostrarSkeletonTabla() {
    const tbody = document.getElementById('listaSiniestros');
    if (!tbody) return;
    
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

function cambiarTabDirecto(tabId) {
    document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));

    const tabContent = document.getElementById(tabId);
    if (tabContent) tabContent.classList.add('active');

    const tabButton = document.querySelector(`[data-tab="${tabId}"]`);
    if (tabButton) tabButton.classList.add('active');

    // Cargar usuarios si se accede a la pestaña de administración
    if (tabId === 'admin' && usuarioActual && usuarioActual.rol === 'admin') {
        cargarUsuarios();
    }
}

function actualizarTabla() {
    const tbody = document.getElementById('listaSiniestros');
    tbody.innerHTML = '';

    if (siniestros.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #666;">No hay siniestros registrados</td></tr>';
        return;
    }

    siniestros.forEach(s => {
        const estadoBadge = `badge-${s.estado}`;
        const esSiniestroTotal = s.monto === 'Sí';
        const tr = document.createElement('tr');

        // Aplicar estilo especial si es siniestro total
        if (esSiniestroTotal) {
            tr.style.backgroundColor = '#fff3cd';
            tr.style.borderLeft = '4px solid #ffc107';
        }

        tr.innerHTML = `
            <td><strong>${s.numero}</strong>${esSiniestroTotal ? ' ⚠️' : ''}</td>
            <td>${s.asegurado}</td>
            <td>${s.telefono}</td>
            <td>${new Date(s.fecha).toLocaleDateString('es-PY')}</td>
            <td><span class="badge ${estadoBadge}">${obtenerTextoEstado(s.estado)}</span></td>
            <td><strong>${esSiniestroTotal ? 'SINIESTRO TOTAL' : 'Normal'}</strong></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small" onclick="editarSiniestro(${s.id})" title="Editar">✏️</button>
                    <button class="btn btn-success btn-small" onclick="enviarMensaje(${s.id})" title="Enviar mensaje">💬</button>
                    <button class="btn btn-danger btn-small" onclick="eliminarSiniestro(${s.id})" title="Eliminar">🗑️</button>
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function obtenerTextoEstado(estado) {
    const textos = {
        'pendiente': 'Pendiente',
        'proceso': 'En Proceso',
        'aprobado': 'Aprobado',
        'taller': 'En Taller',
        'rechazado': 'Rechazado'
    };
    return textos[estado] || estado;
}

function actualizarEstadisticas() {
    document.getElementById('totalCasos').textContent = siniestros.length;
    document.getElementById('pendientes').textContent = siniestros.filter(s => s.estado === 'pendiente').length;
    document.getElementById('aprobados').textContent = siniestros.filter(s => s.estado === 'aprobado').length;
    document.getElementById('enTaller').textContent = siniestros.filter(s => s.estado === 'taller').length;
}

function cerrarModal() {
    document.getElementById('modalEditar').style.display = 'none';
}

// Filtrado optimizado en servidor
const filtrarTablaDebounced = debounce(filtrarTabla, 500);

async function filtrarTabla() {
    const buscarAsegurado = document.getElementById('buscarAsegurado')?.value.trim() || '';
    const buscarSiniestro = document.getElementById('buscarSiniestro')?.value.trim() || '';
    const filtroEstado = document.getElementById('filtroEstado')?.value || '';

    filtrosActuales = {
        asegurado: buscarAsegurado,
        numero: buscarSiniestro,
        estado: filtroEstado
    };

    // Recargar desde el servidor con filtros aplicados
    paginaActual = 0;
    await cargarSiniestros(0, true);
}

function actualizarControlesPaginacion() {
    const totalPaginas = Math.ceil(totalRegistros / limitePorPagina);
    let contenedor = document.getElementById('paginacion');
    
    if (!contenedor) {
        contenedor = document.createElement('div');
        contenedor.id = 'paginacion';
        const card = document.querySelector('#lista .card');
        if (card) {
            card.appendChild(contenedor);
        }
        return;
    }

    if (totalPaginas <= 1) {
        contenedor.innerHTML = '';
        return;
    }

    contenedor.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px; padding-top: 20px; border-top: 2px solid #dee2e6;">
            <div>
                <span style="color: #666;">Mostrando ${paginaActual * limitePorPagina + 1} - ${Math.min((paginaActual + 1) * limitePorPagina, totalRegistros)} de ${totalRegistros}</span>
            </div>
            <div style="display: flex; gap: 10px; align-items: center;">
                <button class="btn btn-primary" onclick="cargarSiniestros(0, true)" ${paginaActual === 0 ? 'disabled' : ''} style="padding: 8px 15px;">
                    ⏮️ Primera
                </button>
                <button class="btn btn-primary" onclick="cargarSiniestros(${paginaActual - 1}, true)" ${paginaActual === 0 ? 'disabled' : ''} style="padding: 8px 15px;">
                    ⬅️ Anterior
                </button>
                <span style="padding: 8px 15px; color: #666;">
                    Página ${paginaActual + 1} de ${totalPaginas}
                </span>
                <button class="btn btn-primary" onclick="cargarSiniestros(${paginaActual + 1}, true)" ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''} style="padding: 8px 15px;">
                    Siguiente ➡️
                </button>
                <button class="btn btn-primary" onclick="cargarSiniestros(${totalPaginas - 1}, true)" ${paginaActual >= totalPaginas - 1 ? 'disabled' : ''} style="padding: 8px 15px;">
                    Última ⏭️
                </button>
            </div>
        </div>
    `;
}

// Ordenamiento de columnas
function ordenarPor(columna) {
    if (ordenActual.columna === columna) {
        ordenActual.direccion = ordenActual.direccion === 'asc' ? 'desc' : 'asc';
    } else {
        ordenActual.columna = columna;
        ordenActual.direccion = 'asc';
    }
    
    cargarSiniestros(paginaActual, true);
    actualizarIconosOrdenamiento();
}

function actualizarIconosOrdenamiento() {
    document.querySelectorAll('.sort-icon').forEach(icon => icon.remove());
    const headers = document.querySelectorAll('#tablaSiniestros th[data-sort]');
    headers.forEach((header) => {
        const columna = header.getAttribute('data-sort');
        if (columna === ordenActual.columna) {
            const icon = document.createElement('span');
            icon.className = 'sort-icon';
            icon.textContent = ordenActual.direccion === 'asc' ? ' ↑' : ' ↓';
            icon.style.marginLeft = '5px';
            header.appendChild(icon);
        }
    });
}

// ============================================
// MENSAJES WHATSAPP
// ============================================

function obtenerSaludoFormal(nombre, sexo) {
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

function enviarMensaje(id) {
    const siniestro = siniestros.find(s => s.id === id);
    if (!siniestro) return;

    document.getElementById('nombreMensaje').value = siniestro.asegurado;
    document.getElementById('numeroMensaje').value = siniestro.numero;
    document.getElementById('tallerMensaje').value = siniestro.taller || '';
    document.getElementById('sexoMensaje').value = siniestro.sexo || '';

    cambiarTabDirecto('mensajes');
    actualizarPlantilla();
}

function actualizarPlantilla() {
    const tipo = document.getElementById('tipoMensaje').value;
    const nombre = document.getElementById('nombreMensaje').value || '[Nombre]';
    const numero = document.getElementById('numeroMensaje').value || '[Nº Siniestro]';
    const taller = document.getElementById('tallerMensaje').value || '[Taller]';
    const sexo = document.getElementById('sexoMensaje').value;

    const saludo = obtenerSaludoFormal(nombre, sexo);

    // Obtener nombre del tramitador actual
    const nombreTramitador = usuarioActual ? usuarioActual.nombre : 'Aseguradora Tajy';

    const plantillas = {
        aprobado: `${saludo}, le saluda ${nombreTramitador} de la Aseguradora Tajy. Le comento que su siniestro ${numero} ha sido aprobado, puede pasar por el taller para la realización del presupuesto.`,
        consulta: `${saludo}, necesitamos que nos envíe los documentos solicitados para continuar con el trámite de su siniestro ${numero}. 📑✉️`,
        seguimiento: `${saludo}, nos comunicamos para realizar un seguimiento a su siniestro ${numero}. Si tiene consultas, quedo a disposición. 📞🤝`,
        rechazado: `${saludo}, lamentamos informarle que su siniestro ${numero} ha sido rechazado. Para más detalles puede contactarnos. ❌📋`,
        presupuesto: `${saludo}, por favor remítanos el presupuesto de los daños del siniestro ${numero} para proceder. 💰📝`
    };

    document.getElementById('previaMensaje').textContent = plantillas[tipo] || '';
}

function copiarMensaje() {
    const mensaje = document.getElementById('previaMensaje').textContent;
    navigator.clipboard.writeText(mensaje).then(() => {
        mostrarAlerta('success', '✅ Mensaje copiado al portapapeles');
    }).catch(err => {
        console.error('Error al copiar:', err);
        mostrarAlerta('error', '❌ Error al copiar el mensaje');
    });
}

function abrirWhatsApp() {
    const nombre = document.getElementById('nombreMensaje').value;
    const mensaje = document.getElementById('previaMensaje').textContent;

    const siniestro = siniestros.find(s => s.asegurado === nombre);
    const numeroTelefono = siniestro ? siniestro.telefono.replace(/[^\d]/g, '') : '';

    if (!numeroTelefono) {
        mostrarAlerta('error', '❌ No se encontró el número de teléfono');
        return;
    }

    const url = `https://wa.me/${numeroTelefono}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, '_blank');
}

// ============================================
// REPORTES
// ============================================

async function generarReporte() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;

    if (!fechaDesde || !fechaHasta) {
        mostrarAlerta('error', 'Por favor, selecciona ambas fechas');
        return;
    }

    const reporteSiniestros = siniestros.filter(s => {
        const fechaSiniestro = new Date(s.fecha);
        return fechaSiniestro >= new Date(fechaDesde) && fechaSiniestro <= new Date(fechaHasta);
    });

    if (reporteSiniestros.length === 0) {
        mostrarAlerta('error', 'No se encontraron siniestros en el período seleccionado');
        return;
    }

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
                <p><strong>Período:</strong> ${new Date(fechaDesde).toLocaleDateString('es-PY')} - ${new Date(fechaHasta).toLocaleDateString('es-PY')}</p>
                <p><strong>Total de registros:</strong> ${reporteSiniestros.length}</p>
                <p><strong>Generado:</strong> ${new Date().toLocaleString('es-PY')}</p>
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

    reporteSiniestros.forEach(s => {
        html += `
            <tr>
                <td>${s.numero}</td>
                <td>${s.asegurado}</td>
                <td>${s.telefono}</td>
                <td>${new Date(s.fecha).toLocaleDateString('es-PY')}</td>
                <td>${s.tipo}</td>
                <td>${obtenerTextoEstado(s.estado)}</td>
                <td>${s.monto}</td>
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

    const ventanaReporte = window.open('', '_blank');
    ventanaReporte.document.write(html);
    ventanaReporte.document.close();
}

function exportarExcel() {
    const fechaDesde = document.getElementById('fechaDesde').value;
    const fechaHasta = document.getElementById('fechaHasta').value;

    if (!fechaDesde || !fechaHasta) {
        mostrarAlerta('error', 'Por favor, selecciona ambas fechas');
        return;
    }

    const reporteSiniestros = siniestros.filter(s => {
        const fechaSiniestro = new Date(s.fecha);
        return fechaSiniestro >= new Date(fechaDesde) && fechaSiniestro <= new Date(fechaHasta);
    });

    if (reporteSiniestros.length === 0) {
        mostrarAlerta('error', 'No se encontraron siniestros en el período seleccionado');
        return;
    }

    let csv = 'Nº Siniestro,Asegurado,Teléfono,Fecha,Tipo,Estado,Monto,Observaciones\n';

    reporteSiniestros.forEach(s => {
        csv += `"${s.numero}","${s.asegurado}","${s.telefono}","${new Date(s.fecha).toLocaleDateString('es-PY')}","${s.tipo}","${obtenerTextoEstado(s.estado)}","${s.monto}","${s.observaciones || ''}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', `reporte_siniestros_${fechaDesde}_${fechaHasta}.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    mostrarAlerta('success', '✅ Reporte exportado exitosamente');
}

// ============================================
// GESTIÓN DE USUARIOS (SOLO ADMIN)
// ============================================

async function cargarUsuarios() {
    if (!clienteSupabase) {
        console.error('Supabase no está inicializado');
        return;
    }

    // Verificar que el usuario sea admin
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarAlerta('error', '❌ No tienes permisos para ver los usuarios');
        return;
    }

    mostrarCargando('loadingUsuarios', true);

    try {
        const { data, error } = await clienteSupabase
            .from('usuarios')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        actualizarTablaUsuarios(data || []);
        console.log(`✅ ${data?.length || 0} usuarios cargados`);
    } catch (error) {
        console.error('Error al cargar usuarios:', error);
        mostrarAlerta('error', 'Error al cargar los usuarios: ' + error.message);
    } finally {
        mostrarCargando('loadingUsuarios', false);
    }
}

function actualizarTablaUsuarios(usuarios) {
    const tbody = document.getElementById('listaUsuarios');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (usuarios.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: #666;">No hay usuarios registrados</td></tr>';
        return;
    }

    usuarios.forEach(usuario => {
        const tr = document.createElement('tr');
        const rolBadge = usuario.rol === 'admin' ?
            '<span class="badge badge-aprobado">Administrador</span>' :
            '<span class="badge badge-proceso">Tramitador</span>';

        const esUsuarioActual = usuarioActual && usuario.email === usuarioActual.email;
        const botonEliminar = esUsuarioActual ?
            '<button class="btn btn-danger btn-small" disabled title="No puedes eliminarte a ti mismo">🗑️</button>' :
            `<button class="btn btn-danger btn-small" onclick="eliminarUsuario('${usuario.id}')" title="Eliminar usuario">🗑️</button>`;

        tr.innerHTML = `
            <td><strong>${usuario.nombre_completo}</strong></td>
            <td>${usuario.email}</td>
            <td>${rolBadge}</td>
            <td>${new Date(usuario.created_at).toLocaleDateString('es-PY')}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small" onclick="cambiarRolUsuario('${usuario.id}', '${usuario.rol}')" title="Cambiar rol">🔄</button>
                    ${botonEliminar}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function crearUsuario(event) {
    event.preventDefault();

    if (!clienteSupabase) {
        mostrarAlerta('error', 'No hay conexión con la base de datos');
        return;
    }

    // Verificar que el usuario sea admin
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarAlerta('error', '❌ No tienes permisos para crear usuarios');
        return;
    }

    const form = event.target;
    const formData = new FormData(form);
    const btnCrear = document.getElementById('btnCrearUsuario');

    btnCrear.disabled = true;
    btnCrear.textContent = '⏳ Creando...';

    try {
        const email = formData.get('email');
        const password = formData.get('password');
        const nombre = formData.get('nombre');
        const rol = formData.get('rol');

        // Crear usuario en Supabase Auth
        const { data: authData, error: authError } = await clienteSupabase.auth.signUp({
            email: email,
            password: password,
            options: {
                data: {
                    nombre_completo: nombre
                }
            }
        });

        if (authError) throw authError;

        // Insertar en la tabla usuarios
        const { error: dbError } = await clienteSupabase
            .from('usuarios')
            .insert([{
                email: email,
                nombre_completo: nombre,
                rol: rol
            }]);

        if (dbError) throw dbError;

        mostrarAlerta('success', '✅ Usuario creado exitosamente');
        form.reset();
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al crear usuario:', error);
        if (error.message.includes('already registered')) {
            mostrarAlerta('error', '❌ Este email ya está registrado');
        } else {
            mostrarAlerta('error', '❌ Error al crear usuario: ' + error.message);
        }
    } finally {
        btnCrear.disabled = false;
        btnCrear.textContent = '👤 Crear Usuario';
    }
}

async function cambiarRolUsuario(userId, rolActual) {
    if (!clienteSupabase || !usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarAlerta('error', '❌ No tienes permisos para cambiar roles');
        return;
    }

    const nuevoRol = rolActual === 'admin' ? 'tramitador' : 'admin';
    const confirmacion = confirm(`¿Cambiar el rol de este usuario a ${nuevoRol === 'admin' ? 'Administrador' : 'Tramitador'}?`);

    if (!confirmacion) return;

    try {
        const { error } = await clienteSupabase
            .from('usuarios')
            .update({ rol: nuevoRol })
            .eq('id', userId);

        if (error) throw error;

        mostrarAlerta('success', `✅ Rol actualizado a ${nuevoRol === 'admin' ? 'Administrador' : 'Tramitador'}`);
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al cambiar rol:', error);
        mostrarAlerta('error', '❌ Error al cambiar el rol: ' + error.message);
    }
}

async function eliminarUsuario(userId) {
    if (!clienteSupabase || !usuarioActual || usuarioActual.rol !== 'admin') {
        mostrarAlerta('error', '❌ No tienes permisos para eliminar usuarios');
        return;
    }

    const confirmacion = confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.');
    if (!confirmacion) return;

    try {
        const { error } = await clienteSupabase
            .from('usuarios')
            .delete()
            .eq('id', userId);

        if (error) throw error;

        mostrarAlerta('success', '✅ Usuario eliminado exitosamente');
        await cargarUsuarios();
    } catch (error) {
        console.error('Error al eliminar usuario:', error);
        mostrarAlerta('error', '❌ Error al eliminar usuario: ' + error.message);
    }
}

// ============================================
// INICIALIZACIÓN
// ============================================

window.onload = async function() {
    console.log('🚀 Iniciando aplicación...');

    // Configurar event listeners para tabs
    document.querySelectorAll('.tab-button').forEach(button => {
        button.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            cambiarTabDirecto(tabId);
        });
    });

    // Inicializar Supabase
    const conectado = await inicializarSupabase();

    if (conectado) {
        await cargarSiniestros(0, false);
    } else {
        console.warn('⚠️ La aplicación funcionará en modo offline');
        mostrarAlerta('info', '⚠️ No se pudo conectar a la base de datos.');
    }

    // Inicializar plantilla de mensajes
    actualizarPlantilla();

    // Agregar listeners para mensajes
    document.getElementById('nombreMensaje').addEventListener('input', actualizarPlantilla);
    document.getElementById('numeroMensaje').addEventListener('input', actualizarPlantilla);
    document.getElementById('tallerMensaje').addEventListener('input', actualizarPlantilla);
    document.getElementById('tipoMensaje').addEventListener('change', actualizarPlantilla);
    document.getElementById('sexoMensaje').addEventListener('change', actualizarPlantilla);

    // Mantener el prefijo +595 en el campo de teléfono
    const telefonoInput = document.getElementById('telefonoNuevo');
    if (telefonoInput) {
        telefonoInput.addEventListener('input', function(e) {
            const valor = e.target.value;
            // Si el usuario borra el prefijo, lo restauramos
            if (!valor.startsWith('+595 ')) {
                e.target.value = '+595 ';
            }
        });

        // Posicionar el cursor después del prefijo al hacer focus
        telefonoInput.addEventListener('focus', function(e) {
            // Si el valor es solo el prefijo, colocar cursor al final
            if (e.target.value === '+595 ') {
                setTimeout(() => {
                    e.target.setSelectionRange(5, 5);
                }, 0);
            }
        });

        // Prevenir que el usuario seleccione y borre el prefijo
        telefonoInput.addEventListener('keydown', function(e) {
            const cursorPos = e.target.selectionStart;
            // Si intenta borrar y el cursor está en posición <= 5, prevenir
            if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPos <= 5) {
                e.preventDefault();
            }
        });
    }

    console.log('✅ Aplicación lista');
};

// Cerrar modal al hacer clic fuera de él
window.onclick = function(event) {
    const modal = document.getElementById('modalEditar');
    if (event.target === modal) {
        cerrarModal();
    }
};
