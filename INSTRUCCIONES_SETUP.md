# 📋 Instrucciones de Configuración - Sistema de Gestión de Siniestros

## ✅ Estado Actual

Tu sistema tiene todos los errores corregidos:
- ✅ Función `cambiarTab` corregida
- ✅ Credenciales de Supabase configuradas
- ✅ Validación de configuración mejorada
- ✅ Animaciones CSS agregadas
- ✅ Script SQL de configuración creado

## 🚀 Pasos para Completar la Configuración

### Paso 1: Ejecutar el Script SQL en Supabase

1. **Abre tu proyecto en Supabase:**
   - Ve a https://supabase.com
   - Inicia sesión
   - Abre tu proyecto `myfisecfgbhpzgpkxxeb`

2. **Abre el SQL Editor:**
   - En el menú lateral izquierdo, busca el ícono de código `</>`
   - Haz clic en **"SQL Editor"**

3. **Crea una nueva consulta:**
   - Haz clic en el botón **"New query"** (esquina superior derecha)

4. **Copia y pega el script:**
   - Abre el archivo `setup_supabase.sql` que se encuentra en esta carpeta
   - Copia TODO el contenido
   - Pégalo en el editor SQL de Supabase

5. **Ejecuta el script:**
   - Haz clic en el botón **"Run"** (o presiona Ctrl/Cmd + Enter)
   - Espera a que se complete (verás mensajes de confirmación)

6. **Verifica los resultados:**
   - Deberías ver al final:
     - `total_siniestros: 1` (o más si ya tenías datos)
     - El registro de prueba de "Juan Pérez"
     - `rowsecurity: true`
     - 4 políticas activas

### Paso 2: Verificar en el Navegador

1. **Abre el archivo index.html:**
   - Navega a la carpeta del proyecto
   - Haz doble clic en `index.html`
   - Se abrirá en tu navegador predeterminado

2. **Abre la Consola del Navegador:**
   - Presiona `F12` o `Ctrl+Shift+I` (Windows/Linux)
   - Presiona `Cmd+Option+I` (Mac)
   - Ve a la pestaña **"Console"**

3. **Verifica los mensajes:**
   - ✅ Deberías ver: `✅ Configuración validada correctamente`
   - ✅ Deberías ver: `🚀 Iniciando aplicación...`
   - ✅ Deberías ver: `✅ Conectado exitosamente a Supabase`
   - ✅ Deberías ver: `✅ 1 siniestros cargados` (o el número que tengas)

4. **Verifica la interfaz:**
   - Estado de conexión (esquina superior derecha): **🟢 Conectado**
   - Total de Casos: **1** (o más)
   - La tabla debería mostrar el siniestro de prueba de Juan Pérez

### Paso 3: Probar Funcionalidades

1. **Prueba crear un nuevo siniestro:**
   - Haz clic en el botón **"➕ Nuevo Siniestro"**
   - Llena el formulario con datos de prueba
   - Haz clic en **"💾 Guardar Siniestro"**
   - Deberías ver: `✅ Siniestro registrado exitosamente`
   - El sistema te llevará automáticamente a la lista

2. **Prueba editar un siniestro:**
   - En la lista, haz clic en el botón **"✏️"** (editar)
   - Modifica algún campo
   - Haz clic en **"💾 Guardar Cambios"**
   - Deberías ver: `✅ Cambios guardados exitosamente`

3. **Prueba los mensajes de WhatsApp:**
   - Haz clic en el botón **"💬"** junto a un siniestro
   - Se abrirá la pestaña de mensajes con los datos pre-cargados
   - Selecciona un tipo de plantilla
   - Haz clic en **"📋 Copiar Mensaje"**
   - Deberías ver: `✅ Mensaje copiado al portapapeles`

4. **Prueba los filtros:**
   - Busca por nombre de asegurado
   - Busca por número de siniestro
   - Filtra por estado
   - La tabla se actualizará en tiempo real

## 🔧 Resolución de Problemas

### Si ves "🔴 No conectado"

**Problema: Errores de CORS o Tracking Prevention**
- Estos son errores del navegador bloqueando las peticiones

**Solución:**
1. Usa un navegador diferente (Chrome, Firefox, Edge)
2. Desactiva extensiones de bloqueo (AdBlock, Privacy Badger, etc.)
3. Si usas Safari, ve a Preferencias → Privacidad → Desactiva "Prevent cross-site tracking"

### Si el script SQL falla

**Problema: "relation siniestros already exists"**
- La tabla ya existe

**Solución:**
1. En Supabase, ve a **Table Editor**
2. Busca la tabla `siniestros`
3. Haz clic en los tres puntos `⋮` → **Delete table**
4. Vuelve a ejecutar el script SQL

### Si ves "Error al conectar: new row violates row-level security policy"

**Problema: Las políticas RLS no están configuradas correctamente**

**Solución:**
1. Ve al script SQL
2. Descomenta la primera línea: `DROP TABLE IF EXISTS siniestros CASCADE;`
3. Vuelve a ejecutar el script completo

### Si no ves el siniestro de prueba

**Problema: El INSERT falló**

**Solución:**
1. En Supabase, ve a **Table Editor**
2. Selecciona la tabla `siniestros`
3. Haz clic en **"Insert"** → **"Insert row"**
4. Llena los campos manualmente con los datos de prueba

## 📊 Estructura de la Base de Datos

La tabla `siniestros` tiene las siguientes columnas:

| Columna | Tipo | Descripción |
|---------|------|-------------|
| id | BIGSERIAL | ID único (auto-generado) |
| numero | TEXT | Número del siniestro (único) |
| asegurado | TEXT | Nombre del asegurado |
| sexo | TEXT | M, F o vacío |
| telefono | TEXT | Teléfono con formato |
| fecha | DATE | Fecha del siniestro |
| tipo | TEXT | Tipo de siniestro |
| estado | TEXT | pendiente, proceso, aprobado, taller, rechazado |
| monto | TEXT | Monto estimado |
| poliza | TEXT | Número de póliza |
| taller | TEXT | Nombre del taller |
| observaciones | TEXT | Notas adicionales |
| created_at | TIMESTAMP | Fecha de creación |
| updated_at | TIMESTAMP | Fecha de última actualización |

## 🔐 Seguridad (RLS Policies)

El script configura 4 políticas de seguridad:

1. **Public can view siniestros** - Permite leer todos los registros
2. **Public can insert siniestros** - Permite crear nuevos registros
3. **Public can update siniestros** - Permite actualizar registros
4. **Public can delete siniestros** - Permite eliminar registros

⚠️ **IMPORTANTE:** Estas políticas son para desarrollo/testing. En producción, deberías restringir el acceso según tus necesidades de seguridad.

## 📞 Contacto y Soporte

Si tienes problemas o preguntas:
1. Revisa los mensajes de error en la consola del navegador
2. Verifica que el script SQL se ejecutó correctamente
3. Asegúrate de que las credenciales en `config.js` son correctas

## ✨ Siguientes Pasos

Una vez que todo funcione correctamente:

1. **Personaliza los datos de prueba** con información real
2. **Configura políticas RLS más restrictivas** para producción
3. **Agrega validaciones adicionales** según tus necesidades
4. **Implementa autenticación de usuarios** si es necesario
5. **Considera hacer backups regulares** de tu base de datos

¡Listo! Tu sistema debería estar funcionando correctamente ahora. 🎉
