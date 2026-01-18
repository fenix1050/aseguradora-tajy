# 🚀 Guía de Instalación y Configuración
## Sistema de Gestión de Siniestros - Aseguradora Tajy

---

## 📋 Tabla de Contenidos
1. [Requisitos](#requisitos)
2. [Configuración de Supabase](#configuración-de-supabase)
3. [Configuración del Sistema](#configuración-del-sistema)
4. [Despliegue](#despliegue)
5. [Solución de Problemas](#solución-de-problemas)

---

## ✅ Requisitos

- Una cuenta en Supabase (gratuita)
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Editor de texto para modificar archivos

---

## 🗄️ Configuración de Supabase

### Paso 1: Crear un Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Haz clic en **"Start your project"** o **"Sign In"** si ya tienes cuenta
3. Crea un nuevo proyecto:
   - **Nombre del proyecto:** `aseguradora-tajy` (o el nombre que prefieras)
   - **Database Password:** Crea una contraseña segura y guárdala
   - **Region:** Selecciona la más cercana a tu ubicación (ej: `South America (São Paulo)`)
4. Haz clic en **"Create new project"**
5. Espera 1-2 minutos mientras se crea tu proyecto

### Paso 2: Ejecutar el Script SQL

1. En el panel izquierdo de Supabase, haz clic en el ícono **SQL Editor** (🗂️)
2. Haz clic en **"+ New query"**
3. Copia TODO el contenido del archivo `supabase_setup.sql`
4. Pégalo en el editor SQL
5. Haz clic en el botón **"Run"** (▶️) en la esquina inferior derecha
6. Deberías ver un mensaje de éxito: **"Success. No rows returned"**

### Paso 3: Obtener las Credenciales de API

1. En el panel izquierdo, haz clic en el ícono de **"Settings"** (⚙️)
2. Selecciona **"API"** en el menú
3. Encontrarás dos valores importantes:

   **a) Project URL:**
   ```
   https://abcdefghijklmnop.supabase.co
   ```
   ☝️ Copia este valor (será diferente en tu caso)

   **b) Project API keys → anon public:**
   ```
   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY...
   ```
   ☝️ Copia este valor completo (será MUY largo)

⚠️ **IMPORTANTE:** Nunca compartas tu `service_role` key. Solo usa la `anon public` key.

### Paso 4: Verificar la Base de Datos

1. En el panel izquierdo, haz clic en **"Table Editor"** (📊)
2. Deberías ver una tabla llamada **"siniestros"**
3. Haz clic en ella para ver los datos de ejemplo (3 registros)
4. Si ves los datos, ¡la configuración fue exitosa! ✅

---

## ⚙️ Configuración del Sistema

### Paso 1: Editar el Archivo de Configuración

1. Abre el archivo `config.js` con un editor de texto
2. Busca estas líneas:

```javascript
const SUPABASE_CONFIG = {
    SUPABASE_URL: 'TU_SUPABASE_URL_AQUI',
    SUPABASE_ANON_KEY: 'TU_SUPABASE_ANON_KEY_AQUI'
};
```

3. Reemplaza con tus valores de Supabase:

```javascript
const SUPABASE_CONFIG = {
    SUPABASE_URL: 'https://abcdefghijklmnop.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTY...'
};
```

4. **Guarda el archivo**

### Paso 2: Estructura de Archivos

Asegúrate de tener estos archivos en la misma carpeta:

```
📁 proyecto/
  ├── 📄 index.html          (archivo principal)
  ├── 📄 config.js           (configuración de Supabase)
  └── 📄 supabase_setup.sql  (script SQL - ya usado)
```

---

## 🌐 Despliegue

### Opción A: Ejecutar Localmente

1. Abre el archivo `index.html` directamente en tu navegador
2. Deberías ver el sistema funcionando
3. Verifica el indicador de conexión: debe decir **🟢 Conectado**

### Opción B: Usar un Servidor Local (Recomendado)

Si tienes Python instalado:

```bash
# Python 3
python -m http.server 8000
```

Luego abre: `http://localhost:8000`

### Opción C: Desplegar en la Nube (GRATIS)

#### **GitHub Pages:**
1. Sube los archivos a un repositorio de GitHub
2. Ve a Settings → Pages
3. Selecciona la rama `main` y carpeta `/root`
4. Guarda y espera unos minutos
5. Tu sitio estará en: `https://tu-usuario.github.io/nombre-repo`

#### **Netlify:**
1. Ve a [netlify.com](https://netlify.com)
2. Arrastra la carpeta con tus archivos
3. ¡Listo! Obtendrás una URL automática

#### **Vercel:**
1. Ve a [vercel.com](https://vercel.com)
2. Importa tu proyecto desde GitHub
3. Despliega con un clic

---

## 🧪 Pruebas

### Verificar que Todo Funciona

1. **Conexión:**
   - Abre el sistema
   - Verifica que diga **🟢 Conectado** en la esquina superior derecha

2. **Crear un Siniestro:**
   - Ve a la pestaña **"➕ Nuevo Siniestro"**
   - Llena el formulario
   - Haz clic en **"💾 Guardar Siniestro"**
   - Deberías ver un mensaje: **"✅ Siniestro registrado exitosamente"**

3. **Ver en la Base de Datos:**
   - Ve a Supabase → Table Editor → siniestros
   - Deberías ver tu nuevo registro

4. **Editar un Siniestro:**
   - En la lista, haz clic en el botón **"✏️"** de cualquier siniestro
   - Modifica algún campo
   - Guarda los cambios
   - Verifica que se actualizó

5. **Eliminar un Siniestro:**
   - Haz clic en el botón **"🗑️"**
   - Confirma la eliminación
   - Verifica que desapareció de la lista

---

## 🔧 Solución de Problemas

### Problema: "🔴 No conectado"

**Solución:**
1. Verifica que `config.js` tenga las credenciales correctas
2. Comprueba que copiaste la URL completa (debe empezar con `https://`)
3. Verifica que la `anon public` key esté completa
4. Abre la consola del navegador (F12) y busca errores

### Problema: "Error al cargar siniestros"

**Solución:**
1. Ve a Supabase → Table Editor
2. Verifica que la tabla `siniestros` exista
3. Si no existe, ejecuta nuevamente el script SQL
4. Verifica que las políticas RLS estén habilitadas

### Problema: "Error 401" o "JWT"

**Solución:**
1. Verifica que estás usando la clave `anon public` y NO la `service_role`
2. Regenera las claves en Supabase → Settings → API
3. Actualiza `config.js` con las nuevas claves

### Problema: No se guardan los datos

**Solución:**
1. Abre la consola del navegador (F12)
2. Ve a la pestaña "Console"
3. Busca mensajes de error en rojo
4. Verifica que el script SQL se haya ejecutado correctamente
5. Comprueba las políticas RLS en Supabase

### Problema: "CORS Error"

**Solución:**
1. Usa un servidor local (Python, VS Code Live Server, etc.)
2. NO abras el archivo directamente desde el explorador de archivos
3. Si despliegas en la nube, el problema desaparecerá

---

## 📊 Características del Sistema

### ✅ Funcionalidades Implementadas

1. **CRUD Completo:**
   - ✅ Crear siniestros
   - ✅ Leer/Listar siniestros
   - ✅ Actualizar siniestros
   - ✅ Eliminar siniestros

2. **Búsqueda y Filtros:**
   - ✅ Buscar por nombre de asegurado
   - ✅ Buscar por número de siniestro
   - ✅ Filtrar por estado

3. **Estadísticas en Tiempo Real:**
   - ✅ Total de casos
   - ✅ Casos pendientes
   - ✅ Casos aprobados
   - ✅ Casos en taller

4. **Mensajes WhatsApp:**
   - ✅ Plantillas personalizables
   - ✅ Saludo formal según sexo
   - ✅ Copiar al portapapeles
   - ✅ Abrir WhatsApp directo

5. **Reportes:**
   - ✅ Generar reporte por fechas
   - ✅ Exportar a CSV/Excel
   - ✅ Vista de impresión

---

## 🚀 Próximos Pasos (Mejoras Futuras)

### Autenticación
```javascript
// Agregar login de usuarios
const { data, error } = await supabase.auth.signUp({
  email: 'usuario@ejemplo.com',
  password: 'contraseña-segura'
})
```

### Actualización en Tiempo Real
```javascript
// Los cambios se reflejan automáticamente
supabase
  .channel('siniestros-changes')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'siniestros' }, 
    (payload) => {
      console.log('Cambio detectado:', payload)
      cargarSiniestros() // Actualizar la tabla
    }
  )
  .subscribe()
```

### Subir Archivos
```javascript
// Agregar adjuntos (fotos, documentos)
const { data, error } = await supabase.storage
  .from('documentos')
  .upload('siniestro-123/foto.jpg', file)
```

---

## 📞 Soporte

Si tienes problemas:

1. **Revisa la consola del navegador** (F12 → Console)
2. **Verifica la documentación de Supabase:** [docs.supabase.com](https://supabase.com/docs)
3. **Revisa los logs de Supabase:** Settings → Logs

---

## 📝 Notas Importantes

- ⚠️ El plan gratuito de Supabase incluye:
  - 500 MB de base de datos
  - 1 GB de almacenamiento de archivos
  - 2 GB de ancho de banda
  - 50,000 usuarios autenticados

- 🔒 Las credenciales en `config.js` son públicas (anon key), pero están limitadas por las políticas RLS de Supabase

- 🌐 Para producción, considera implementar autenticación de usuarios

---

## ✅ Checklist de Instalación

```
[ ] Crear cuenta en Supabase
[ ] Crear nuevo proyecto
[ ] Ejecutar script SQL (supabase_setup.sql)
[ ] Copiar Project URL
[ ] Copiar anon public key
[ ] Editar config.js con las credenciales
[ ] Abrir index.html en el navegador
[ ] Verificar conexión (🟢 Conectado)
[ ] Crear un siniestro de prueba
[ ] Verificar que aparece en la tabla
[ ] ¡Todo listo! 🎉
```

---

¡Éxito con tu sistema! 🚀
