# 🚨 Actualización - Sistema de Siniestro Total

## ✅ Cambios Realizados

### 1. Campos Eliminados del Formulario

- ❌ **Tipo de Siniestro** - Campo removido
- ❌ **Taller** - Campo removido
- ❌ **Monto Estimado** - Reemplazado por "Siniestro Total"

### 2. Nuevo Campo: "¿Es Siniestro Total?"

**Ubicación:** [app.html:591-598](app.html:591)

Se agregó un campo de selección obligatorio con dos opciones:
- **No** - Siniestro normal
- **Sí** - Siniestro total (requiere seguimiento especial)

---

## 🎨 Resaltado Visual de Siniestros Totales

Los siniestros marcados como "Sí" en "Siniestro Total" se destacan visualmente en el listado:

### Características Visuales:

1. **Fondo amarillo claro** (`#fff3cd`)
2. **Borde izquierdo amarillo** de 4px (`#ffc107`)
3. **Icono de advertencia** (⚠️) junto al número de siniestro
4. **Texto "SINIESTRO TOTAL"** en negrita en la columna correspondiente

### Ejemplo Visual:

```
┌────────────────────────────────────────────────────────────────┐
│ ║  2026-003 ⚠️  │ Juan Pérez  │ ... │  SINIESTRO TOTAL      │ │ ← Fondo amarillo
└────────────────────────────────────────────────────────────────┘
  ↑ Borde amarillo
```

---

## 📊 Nueva Estructura del Formulario

```
┌─────────────────────────────────────────────────────┐
│  Nº de Siniestro *    │  Nombre del Asegurado *    │
├─────────────────────────────────────────────────────┤
│  Sexo del Asegurado   │  Teléfono (WhatsApp) *     │
├─────────────────────────────────────────────────────┤
│  ¿Es Siniestro Total? *                             │
│  [Seleccione... ▼]                                  │
├─────────────────────────────────────────────────────┤
│  Observaciones                                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│              [💾 Guardar Siniestro]                 │
└─────────────────────────────────────────────────────┘
```

**Campos requeridos:** 3 (Nº Siniestro, Nombre, Teléfono, Siniestro Total)

---

## 🔧 Cambios Técnicos

### En [app.html](app.html):

1. **Formulario simplificado** (líneas 564-606):
   - Solo 4 campos: Número, Asegurado, Sexo, Teléfono
   - Nuevo campo: "¿Es Siniestro Total?"
   - Observaciones

2. **Tabla actualizada** (línea 548):
   - Columna "Monto" → "Siniestro Total"

### En [app.js](app.js):

1. **Función `agregarSiniestro`** (líneas 102-114):
   ```javascript
   const nuevoSiniestro = {
       // ... campos
       tipo: '',                                    // Vacío
       monto: formData.get('siniestro_total'),     // "Sí" o "No"
       taller: '',                                  // Vacío
   };
   ```

2. **Función `actualizarTabla`** (líneas 288-316):
   ```javascript
   const esSiniestroTotal = s.monto === 'Sí';

   if (esSiniestroTotal) {
       tr.style.backgroundColor = '#fff3cd';
       tr.style.borderLeft = '4px solid #ffc107';
   }
   ```

   - Detecta si `monto === 'Sí'`
   - Aplica estilos especiales
   - Agrega icono ⚠️
   - Muestra "SINIESTRO TOTAL" en lugar del valor

---

## 📋 Columnas de la Tabla

| Columna | Contenido |
|---------|-----------|
| Nº Siniestro | Número + ⚠️ (si es total) |
| Asegurado | Nombre completo |
| Teléfono | Número de WhatsApp |
| Fecha | Fecha de registro |
| Tipo | `-` (vacío) |
| Estado | Badge con estado actual |
| **Siniestro Total** | **"SINIESTRO TOTAL"** o "Normal" |
| Acciones | Editar / Mensaje / Eliminar |

---

## 🎯 Beneficios del Sistema

### 1. Identificación Rápida
- Los siniestros totales se destacan visualmente
- Fácil de identificar a simple vista
- Color amarillo indica precaución/atención

### 2. Mejor Seguimiento
- Priorización automática
- Permite enfoque en casos críticos
- Reduce errores de seguimiento

### 3. Formulario Simplificado
- Solo 3 campos obligatorios
- Registro más rápido
- Menos campos irrelevantes

---

## 🔄 Compatibilidad con Datos Existentes

### Registros Antiguos:
- Si `monto` contiene un valor numérico → Se mostrará como "Normal"
- Si `monto` = "Sí" → Se mostrará como "SINIESTRO TOTAL" (resaltado)
- Si `monto` = "No" → Se mostrará como "Normal"

### Migración de Datos:
Si tienes registros antiguos con montos numéricos y quieres clasificarlos:

```sql
-- Marcar montos altos como siniestro total
UPDATE siniestros
SET monto = 'Sí'
WHERE CAST(REPLACE(monto, 'Gs. ', '') AS INTEGER) > 50000000;

-- Marcar el resto como normal
UPDATE siniestros
SET monto = 'No'
WHERE monto NOT IN ('Sí', 'No');
```

---

## 📸 Ejemplo de Vista

### Siniestro Normal:
```
2026-001  │ María González  │ +595981234567  │ 16/01/2026  │ -  │ Pendiente  │ Normal
```

### Siniestro Total:
```
┌──────────────────────────────────────────────────────────────────────────┐
│ 2026-003 ⚠️ │ Juan Pérez │ +595981123456 │ 16/01/2026 │ - │ Pendiente │ SINIESTRO TOTAL │
└──────────────────────────────────────────────────────────────────────────┘
  ↑ Fondo amarillo y borde izquierdo amarillo
```

---

## 🚀 Para Usar

1. Recarga la página con `Ctrl + F5`
2. Ve a "Nuevo Siniestro"
3. Completa el formulario simplificado
4. Selecciona "Sí" o "No" en "¿Es Siniestro Total?"
5. Guarda el siniestro
6. Los siniestros totales aparecerán resaltados en amarillo

---

## 📌 Versión

- **Versión anterior:** 3.2
- **Versión actual:** 3.3

---

## ⚙️ Archivos Modificados

- ✅ [app.html](app.html) - Formulario y tabla actualizados
- ✅ [app.js](app.js) - Lógica de guardado y visualización
- 📄 Este documento de cambios

---

## 💡 Nota Importante

El campo "Monto" ahora almacena:
- **"Sí"** = Siniestro Total
- **"No"** = Siniestro Normal

Esto permite un seguimiento claro y directo sin necesidad de valores numéricos.
