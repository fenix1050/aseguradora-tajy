# 🔐 Guía de Configuración de Autenticación

## Pasos para Configurar Autenticación

### 1. Crear Tabla de Usuarios en Supabase

1. Ve a Supabase Dashboard → **SQL Editor**
2. Ejecuta el script `setup_auth.sql`
3. Esto creará la tabla `usuarios` para almacenar información de los tramitadores

### 2. Crear Usuarios en Supabase Auth

1. Ve a Supabase Dashboard → **Authentication** → **Users**
2. Haz clic en **"Add User"** o **"Invite User"**
3. Para cada tramitador:
   - **Email**: `nombre.apellido@tajy.com` (ej: `kevin.ruiz@tajy.com`)
   - **Password**: Crea una contraseña segura
   - **Auto Confirm User**: ✅ Activar (para no requerir confirmación por email)
4. Anota el **UUID** del usuario creado

### 3. Agregar Usuario a la Tabla `usuarios`

1. Ve a **SQL Editor** en Supabase
2. Ejecuta el siguiente SQL (reemplaza con los datos reales):

```sql
INSERT INTO usuarios (id, email, nombre_completo, rol)
VALUES (
    'UUID_DEL_USUARIO',  -- Reemplazar con UUID del paso anterior
    'kevin.ruiz@tajy.com',
    'Kevin Ruiz Díaz',
    'tramitador'
);
```

**Ejemplo con UUID real:**
```sql
INSERT INTO usuarios (id, email, nombre_completo, rol)
VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    'kevin.ruiz@tajy.com',
    'Kevin Ruiz Díaz',
    'tramitador'
);
```

### 4. Configurar Políticas RLS (Opcional pero Recomendado)

Si quieres mayor seguridad, puedes ajustar las políticas RLS para que solo los usuarios autenticados puedan ver/editar datos:

```sql
-- Permitir solo usuarios autenticados
DROP POLICY IF EXISTS "Public can view siniestros" ON siniestros;
CREATE POLICY "Authenticated users can view siniestros"
ON siniestros FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "Public can insert siniestros" ON siniestros;
CREATE POLICY "Authenticated users can insert siniestros"
ON siniestros FOR INSERT
TO authenticated
WITH CHECK (true);

-- Similar para UPDATE y DELETE...
```

### 5. Probar el Login

1. Abre `login.html` en tu navegador
2. Ingresa:
   - **Usuario**: `kevin.ruiz` (o el email completo `kevin.ruiz@tajy.com`)
   - **Contraseña**: La contraseña que configuraste
3. Deberías ser redirigido al dashboard con tu nombre en el header

## 📝 Notas Importantes

- **Email como Usuario**: El sistema acepta tanto el email completo como solo el nombre de usuario (sin @)
- **Nombre Dinámico**: El nombre del tramitador se actualiza automáticamente según quién se loguea
- **Mensajes WhatsApp**: Los mensajes automáticos ahora usan el nombre del tramitador actual
- **Sesión Persistente**: La sesión se mantiene activa hasta que el usuario cierre sesión

## 🔒 Seguridad

- Las credenciales están en `config.js` (agregado a `.gitignore`)
- Los usuarios deben estar autenticados para acceder al sistema
- Las contraseñas se almacenan de forma segura en Supabase Auth (hash bcrypt)

## ❓ Solución de Problemas

**Error: "Invalid login credentials"**
- Verifica que el usuario exista en Authentication
- Verifica que el email/contraseña sean correctos

**Error: "No se encontró perfil de usuario"**
- Asegúrate de haber insertado el usuario en la tabla `usuarios`
- Verifica que el UUID coincida con el usuario en Authentication

**El nombre no aparece en el header**
- Verifica que la tabla `usuarios` tenga el campo `nombre_completo`
- Revisa la consola del navegador para errores

## 🎯 Próximos Pasos

1. Crear más usuarios para otros tramitadores
2. Configurar roles si necesitas diferentes permisos (admin, supervisor, tramitador)
3. Personalizar políticas RLS según necesidades de seguridad
