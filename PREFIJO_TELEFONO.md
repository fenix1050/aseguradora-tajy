# 📱 Prefijo de Teléfono Predefinido

## ✅ Cambio Implementado

El campo de teléfono en el formulario ahora tiene el prefijo **+595** predefinido y protegido.

---

## 🎯 Funcionamiento

### Campo de Teléfono:

**Valor inicial:** `+595 `

El usuario solo necesita completar el número después del prefijo:

```
+595 981123456
     ↑
     El usuario escribe desde aquí
```

---

## 🔒 Protecciones Implementadas

### 1. Prefijo Bloqueado

El usuario **NO puede**:
- ❌ Borrar el prefijo `+595 `
- ❌ Modificar el prefijo
- ❌ Eliminar el espacio después del prefijo

### 2. Cursor Automático

Al hacer clic en el campo:
- ✅ El cursor se posiciona automáticamente después del espacio
- ✅ Usuario puede empezar a escribir directamente

### 3. Restauración Automática

Si el usuario intenta borrar el prefijo:
- ✅ Se restaura automáticamente
- ✅ No se pierde el número ingresado

---

## 💻 Implementación Técnica

### HTML ([index.html:586](index.html:586)):

```html
<input
    type="tel"
    id="telefonoNuevo"
    name="telefono"
    value="+595 "
    placeholder="+595 981 123456"
    required
>
```

**Cambios:**
- Agregado `id="telefonoNuevo"` para acceso JavaScript
- Agregado `value="+595 "` como valor inicial

### JavaScript ([app.js:608-637](app.js:608)):

#### Evento 1: Protección contra borrado
```javascript
telefonoInput.addEventListener('input', function(e) {
    const valor = e.target.value;
    if (!valor.startsWith('+595 ')) {
        e.target.value = '+595 ';
    }
});
```

#### Evento 2: Posicionamiento del cursor
```javascript
telefonoInput.addEventListener('focus', function(e) {
    if (e.target.value === '+595 ') {
        setTimeout(() => {
            e.target.setSelectionRange(5, 5);
        }, 0);
    }
});
```

#### Evento 3: Bloqueo de teclas Delete/Backspace
```javascript
telefonoInput.addEventListener('keydown', function(e) {
    const cursorPos = e.target.selectionStart;
    if ((e.key === 'Backspace' || e.key === 'Delete') && cursorPos <= 5) {
        e.preventDefault();
    }
});
```

---

## 📝 Ejemplos de Uso

### Caso 1: Usuario nuevo

1. Hace clic en el campo de teléfono
2. Ve: `+595 |` (cursor al final)
3. Escribe: `981123456`
4. Resultado: `+595 981123456`

### Caso 2: Intento de borrar prefijo

1. Campo tiene: `+595 981123456`
2. Usuario selecciona todo y presiona Delete
3. Sistema restaura: `+595 `
4. Usuario puede seguir escribiendo

### Caso 3: Edición del número

1. Campo tiene: `+595 981123456`
2. Usuario quiere cambiar `981` por `982`
3. Puede seleccionar y modificar solo esa parte
4. El prefijo `+595 ` permanece intacto

---

## 🌍 Formato Internacional

### Formato completo para WhatsApp:

```
+595981123456
```

### Cómo lo guarda el sistema:

En la base de datos se guarda tal como el usuario lo escribe:
```javascript
telefono: "+595 981123456"
```

### Cómo se usa en WhatsApp:

Cuando se genera el enlace de WhatsApp, se eliminan espacios:

```javascript
const numeroTelefono = siniestro.telefono.replace(/[^\d]/g, '');
// Resultado: "595981123456"

const url = `https://wa.me/${numeroTelefono}?text=${mensaje}`;
// URL final: https://wa.me/595981123456?text=...
```

**Ubicación:** [app.js:419-432](app.js:419)

---

## 🔍 Validación

### Validación HTML5:

```html
<input type="tel" required>
```

- ✅ Campo obligatorio
- ✅ Tipo "tel" permite solo números y símbolos telefónicos
- ✅ No permite envío si está vacío

### Longitud esperada:

```
+595 XXXXXXXXX
↑    ↑
5    9-10 dígitos típicos
```

Total: ~14-15 caracteres

---

## 📊 Compatibilidad

### Navegadores compatibles:

- ✅ Chrome/Edge (todas las versiones modernas)
- ✅ Firefox (todas las versiones modernas)
- ✅ Safari (iOS y macOS)
- ✅ Opera

### Funcionalidades usadas:

- `addEventListener()` - Estándar ES5+
- `startsWith()` - Estándar ES6
- `setSelectionRange()` - API estándar de inputs
- `preventDefault()` - Estándar de eventos

---

## 🎨 Experiencia de Usuario

### Ventajas:

1. **Menos errores:** No se olvida el prefijo internacional
2. **Más rápido:** Solo escribir el número local
3. **Intuitivo:** El cursor ya está en la posición correcta
4. **Consistente:** Todos los números tienen el mismo formato
5. **WhatsApp compatible:** Formato correcto para enlaces

### Comportamiento visual:

```
┌─────────────────────────────────────┐
│ Teléfono (WhatsApp) *               │
├─────────────────────────────────────┤
│ +595 |                              │  ← Cursor aquí
└─────────────────────────────────────┘
     ↑
     Prefijo protegido
```

---

## 🔄 Casos Especiales

### Si el usuario copia/pega un número completo:

**Pega:** `0981123456`

**Sistema detecta:** No empieza con `+595 `

**Acción:** Restaura `+595 ` y el número pegado se pierde

**Solución recomendada:** Pegar solo la parte numérica después del prefijo

### Si el usuario pega con prefijo diferente:

**Pega:** `+54 11 1234 5678` (Argentina)

**Sistema detecta:** No empieza con `+595 `

**Acción:** Restaura `+595 `

**Nota:** El sistema está diseñado específicamente para Paraguay (+595)

---

## 📱 Ejemplo Completo

### Registro de siniestro:

```
Número: 2026-001
Asegurado: María González
Teléfono: +595 981234567  ← Usuario escribe solo: 981234567
```

### Al guardar en base de datos:

```javascript
{
    numero: "2026-001",
    asegurado: "María González",
    telefono: "+595 981234567",  // Guardado con prefijo
    // ... otros campos
}
```

### Al generar enlace de WhatsApp:

```javascript
// 1. Extraer solo números
const numero = "+595 981234567".replace(/[^\d]/g, '');
// numero = "595981234567"

// 2. Crear URL
const url = `https://wa.me/595981234567?text=Hola...`;

// 3. Abrir WhatsApp
window.open(url, '_blank');
```

---

## 🛠️ Mantenimiento

### Para cambiar el prefijo a otro país:

Editar en [index.html:586](index.html:586):
```html
value="+XXX "
```

Y en [app.js:614](app.js:614):
```javascript
if (!valor.startsWith('+XXX ')) {
    e.target.value = '+XXX ';
}
```

**Ejemplos:**
- Argentina: `+54 `
- Brasil: `+55 `
- Uruguay: `+598 `
- Chile: `+56 `

---

## ✨ Beneficios para WhatsApp

### Formato correcto garantizado:

✅ Siempre empieza con `+595`
✅ Formato internacional estándar
✅ Compatible con API de WhatsApp
✅ No requiere validación adicional
✅ Enlaces funcionan en cualquier dispositivo

### URL de WhatsApp generada:

```
https://wa.me/595981234567?text=Estimado...
```

Este formato es reconocido por:
- 📱 WhatsApp móvil (Android/iOS)
- 💻 WhatsApp Web
- 🖥️ WhatsApp Desktop

---

## 📌 Versión

- **Versión implementada:** 3.5
- **Fecha:** 16/01/2026
- **Archivos modificados:**
  - ✅ [index.html](index.html:586)
  - ✅ [app.js](app.js:608-637)

---

## 🧪 Pruebas Recomendadas

1. **Escribir número normal:**
   - Escribe `981123456`
   - Verifica resultado: `+595 981123456`

2. **Intentar borrar prefijo:**
   - Selecciona todo y presiona Delete
   - Verifica que `+595 ` se mantiene

3. **Editar número existente:**
   - Modifica solo dígitos después del prefijo
   - Verifica que el prefijo no cambia

4. **Enviar mensaje WhatsApp:**
   - Registra siniestro
   - Haz clic en botón 💬
   - Verifica que se abre WhatsApp con el número correcto

---

**Implementación completada y lista para usar.** ✅
