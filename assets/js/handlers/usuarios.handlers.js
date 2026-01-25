// ============================================
// HANDLERS DE USUARIOS (ADMIN)
// ============================================

import { getUsuarioActual } from '../auth.js';
import { mostrarAlerta, mostrarCargando } from '../ui.js';
import { formatearFecha } from '../utils.js';
import {
    cargarUsuarios as cargarUsuariosService,
    crearUsuario as crearUsuarioService,
    cambiarRolUsuario as cambiarRolService,
    eliminarUsuario as eliminarUsuarioService,
    esUsuarioActual
} from '../usuarios.js';

export async function handleTabAdmin() {
    const usuarioActual = getUsuarioActual();
    if (!usuarioActual || usuarioActual.rol !== 'admin') {
        return;
    }
    await handleCargarUsuarios();
}

export async function handleCargarUsuarios() {
    mostrarCargando('loadingUsuarios', true);

    const resultado = await cargarUsuariosService();

    mostrarCargando('loadingUsuarios', false);

    if (!resultado.success) {
        mostrarAlerta('error', resultado.error);
        return;
    }

    actualizarTablaUsuarios(resultado.data);
}

export function actualizarTablaUsuarios(usuarios) {
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

        const esActual = esUsuarioActual(usuario.email);
        const botonEliminar = esActual ?
            '<button class="btn btn-danger btn-small" disabled title="No puedes eliminarte a ti mismo">🗑️</button>' :
            `<button class="btn btn-danger btn-small btn-eliminar-usuario" data-id="${usuario.id}" title="Eliminar usuario">🗑️</button>`;

        tr.innerHTML = `
            <td><strong>${usuario.nombre_completo}</strong></td>
            <td>${usuario.email}</td>
            <td>${rolBadge}</td>
            <td>${formatearFecha(usuario.created_at)}</td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-small btn-cambiar-rol" data-id="${usuario.id}" data-rol="${usuario.rol}" title="Cambiar rol">🔄</button>
                    ${botonEliminar}
                </div>
            </td>
        `;
        tbody.appendChild(tr);
    });

    // Event listeners
    tbody.querySelectorAll('.btn-cambiar-rol').forEach(btn => {
        btn.addEventListener('click', () => handleCambiarRol(btn.dataset.id, btn.dataset.rol));
    });
    tbody.querySelectorAll('.btn-eliminar-usuario').forEach(btn => {
        btn.addEventListener('click', () => handleEliminarUsuario(btn.dataset.id));
    });
}

export async function handleCrearUsuario(event) {
    event.preventDefault();

    const form = event.target;
    const formData = new FormData(form);

    const datos = {
        email: formData.get('email'),
        password: formData.get('password'),
        nombre: formData.get('nombre'),
        rol: formData.get('rol')
    };

    const btnCrear = document.getElementById('btnCrearUsuario');
    btnCrear.disabled = true;
    btnCrear.textContent = '⏳ Creando...';

    const resultado = await crearUsuarioService(datos);

    btnCrear.disabled = false;
    btnCrear.textContent = '👤 Crear Usuario';

    if (!resultado.success) {
        mostrarAlerta('error', '❌ ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Usuario creado exitosamente');
    form.reset();
    await handleCargarUsuarios();
}

export async function handleCambiarRol(userId, rolActual) {
    const nuevoRol = rolActual === 'admin' ? 'Tramitador' : 'Administrador';
    if (!confirm(`¿Cambiar el rol de este usuario a ${nuevoRol}?`)) return;

    const resultado = await cambiarRolService(userId, rolActual);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al cambiar el rol: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', `✅ Rol actualizado a ${resultado.nuevoRol === 'admin' ? 'Administrador' : 'Tramitador'}`);
    await handleCargarUsuarios();
}

export async function handleEliminarUsuario(userId) {
    if (!confirm('¿Estás seguro de eliminar este usuario? Esta acción no se puede deshacer.')) return;

    const resultado = await eliminarUsuarioService(userId);

    if (!resultado.success) {
        mostrarAlerta('error', '❌ Error al eliminar usuario: ' + resultado.error);
        return;
    }

    mostrarAlerta('success', '✅ Usuario eliminado exitosamente');
    await handleCargarUsuarios();
}
