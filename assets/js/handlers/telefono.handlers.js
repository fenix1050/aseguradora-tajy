// ============================================
// HANDLERS DE TELÉFONO
// ============================================

export function configurarListenerTelefono() {
    const telefonoInput = document.getElementById('telefonoNuevo');
    if (!telefonoInput) return;

    telefonoInput.addEventListener('input', function(e) {
        const valor = e.target.value;
        if (!valor.startsWith('+595 ')) {
            e.target.value = '+595 ';
        }
    });

    telefonoInput.addEventListener('focus', function(e) {
        if (e.target.value === '+595 ') {
            setTimeout(() => {
                e.target.setSelectionRange(5, 5);
            }, 0);
        }
    });

    telefonoInput.addEventListener('keydown', function(e) {
        const cursorPos = e.target.selectionStart;
        if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPos <= 5) {
            e.preventDefault();
        }
    });
}
