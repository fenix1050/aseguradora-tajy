# 🔧 Cómo Habilitar Realtime en Supabase

## Problema

Las notificaciones en tiempo real NO funcionan porque **Supabase Realtime no está habilitado** para la tabla `siniestros`.

## Síntomas

- ✅ Dice "Notificaciones en tiempo real activadas" en consola
- ❌ NO aparecen logs `🔔 Cambio detectado: UPDATE`
- ❌ NO se reciben notificaciones cuando se edita un siniestro

---

## ✅ Solución: Habilitar Realtime en Supabase Dashboard

### **Paso 1: Acceder a Supabase Dashboard**

1. Ve a https://supabase.com/dashboard
2. Login con tu cuenta
3. Selecciona tu proyecto "aseguradora-tajy"

### **Paso 2: Habilitar Realtime en tabla `siniestros`**

#### Opción A: Desde Database → Replication

1. En el menú lateral, click en **Database**
2. Click en **Replication** (en submenu)
3. Busca la tabla **`siniestros`** en la lista
4. Activa el toggle **"Realtime"** (debe ponerse en verde/azul)
5. Guarda los cambios

#### Opción B: Desde Table Editor

1. En el menú lateral, click en **Table Editor**
2. Selecciona la tabla **`siniestros`**
3. Click en el botón **⚙️ Settings** (esquina superior derecha)
4. En la sección **"Realtime"**, activa el checkbox
5. Click en **"Save"**

### **Paso 3: Verificar Configuración**

Deberías ver algo como:

```
Table: siniestros
├─ Realtime: ✅ Enabled
└─ Status: Active
```

---

## 🧪 Verificar que Funciona

### Método 1: Script de Diagnóstico

1. Abre la aplicación en el navegador
2. Abre DevTools (F12) → Consola
3. Copia y pega el contenido de `diagnostico-realtime.js`
4. Presiona Enter
5. Sigue las instrucciones (editar un siniestro cuando lo pida)

**Resultado esperado:**
```
✅ Supabase client está cargado
✅ Usuario autenticado: [uuid]
✅ Conexión a base de datos OK
✅ Canal Realtime suscrito correctamente
✅ ¡EVENTO RECIBIDO! Realtime funciona correctamente
```

### Método 2: Prueba Manual

1. Abre la aplicación en **2 tabs** del mismo navegador
2. **Tab 1:** Deja abierta la lista de siniestros
3. **Tab 2:** Edita un siniestro y guarda
4. **Tab 1:** Deberías ver:
   - Toast: "✏️ Siniestro actualizado..."
   - Tabla se recarga automáticamente
   - En consola: `🔔 Cambio detectado: UPDATE`

---

## ❓ Troubleshooting Adicional

### Problema: No aparece opción "Realtime" en Database

**Causa:** Proyecto de Supabase antiguo o plan free con límites

**Solución:**
1. Verifica que tu plan incluye Realtime (free tier SÍ incluye)
2. Actualiza el proyecto de Supabase si es muy antiguo
3. Contacta soporte de Supabase si persiste

### Problema: Realtime habilitado pero NO funciona

**Causa 1:** RLS (Row Level Security) bloqueando eventos

**Verificar:**
```sql
-- Ejecuta en SQL Editor de Supabase
SELECT * FROM pg_policies
WHERE tablename = 'siniestros';
```

**Debe haber policies que permitan SELECT para el usuario autenticado**

**Solución:**
```sql
-- Si no existe, crear policy de SELECT
CREATE POLICY "Usuarios ven sus siniestros"
ON siniestros FOR SELECT
USING (auth.uid() = user_id);
```

**Causa 2:** Filtro de `user_id` incorrecto

**Verificar en consola:**
```javascript
// Obtener user_id actual
const { data: { user } } = await supabase.auth.getUser();
console.log('User ID:', user.id);

// Ver siniestro que editaste
const { data } = await supabase
    .from('siniestros')
    .select('id, user_id')
    .eq('id', [ID_DEL_SINIESTRO]);
console.log('User ID del siniestro:', data[0].user_id);

// Deben coincidir
```

**Causa 3:** Caché de Supabase

**Solución:**
1. Deshabilita Realtime
2. Espera 30 segundos
3. Habilita Realtime nuevamente
4. Refresca la aplicación (F5)

---

## 📊 Alternativa: Habilitar Realtime via SQL

Si no tienes acceso al Dashboard, puedes habilitar Realtime via SQL:

```sql
-- 1. Habilitar Realtime en tabla siniestros
ALTER TABLE siniestros REPLICA IDENTITY FULL;

-- 2. Publicar tabla en replication slot (Supabase maneja esto automáticamente)
-- No es necesario hacer nada más si usas Supabase Dashboard

-- 3. Verificar que está habilitado
SELECT schemaname, tablename, hasindexes, hasrules, hastriggers
FROM pg_tables
WHERE tablename = 'siniestros';
```

**Nota:** Esto requiere permisos de superusuario. Es más fácil usar el Dashboard.

---

## 🔍 Logs Esperados

Cuando Realtime funciona correctamente, deberías ver en consola:

### Al cargar la app:
```
✅ Notificaciones en tiempo real activadas
```

### Al editar un siniestro:
```
🔔 Cambio detectado: UPDATE { eventType: 'UPDATE', new: {...}, old: {...} }
```

### Al crear un siniestro:
```
🔔 Cambio detectado: INSERT { eventType: 'INSERT', new: {...} }
```

### Al eliminar un siniestro:
```
🔔 Cambio detectado: DELETE { eventType: 'DELETE', old: {...} }
```

---

## 🚀 Después de Habilitar

1. **Refresca la aplicación** (F5)
2. **Prueba editando un siniestro**
3. **Deberías ver el toast**: "✏️ Siniestro actualizado..."
4. **En otra tab/browser**: La tabla se actualizará automáticamente

---

## 📞 Soporte

Si después de seguir estos pasos aún no funciona:

1. Ejecuta el script de diagnóstico y comparte los resultados
2. Revisa la configuración de RLS en tabla `siniestros`
3. Verifica que el plan de Supabase incluye Realtime
4. Contacta soporte de Supabase si es problema del servicio

---

## ✅ Checklist de Verificación

- [ ] Realtime habilitado en tabla `siniestros` (Dashboard → Database → Replication)
- [ ] Policy SELECT existe para usuarios autenticados
- [ ] Script de diagnóstico ejecutado sin errores
- [ ] Prueba con 2 tabs funciona correctamente
- [ ] Logs `🔔 Cambio detectado` aparecen en consola
- [ ] Toast de notificación aparece al editar

---

**Última actualización:** 2026-01-27
**Versión:** 1.0
