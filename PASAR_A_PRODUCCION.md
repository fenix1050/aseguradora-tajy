# 🚀 Guía para Pasar a Producción

## 📋 Pasos Recomendados

### Opción 1: Renombrar archivos (RECOMENDADO)

Esta opción mantiene un respaldo del sistema antiguo.

#### Paso 1: Respaldar archivos antiguos

```bash
# Renombrar archivos antiguos
index.html → index.OLD.html
index_fixed.html → index_fixed.OLD.html
```

**En Windows:**
1. Haz clic derecho en `index.html`
2. Selecciona "Cambiar nombre"
3. Renombra a `index.OLD.html`
4. Repite con `index_fixed.html` → `index_fixed.OLD.html`

#### Paso 2: Renombrar archivos nuevos

```bash
# Archivos nuevos a producción
app.html → index.html
app.js → (mantener como app.js)
```

**En Windows:**
1. Haz clic derecho en `app.html`
2. Selecciona "Cambiar nombre"
3. Renombra a `index.html`

#### Paso 3: Actualizar referencias en index.html

Abre el nuevo `index.html` (antes app.html) y verifica que el script apunte correctamente:

```html
<!-- Debe seguir siendo app.js -->
<script src="app.js?v=3.4"></script>
```

**✅ NO necesitas cambiar nada** - el archivo ya apunta a `app.js`

#### Paso 4: Verificar la ruta del logo

En `index.html` (línea 469), verifica la ruta:

```html
<img src="logo/logo.png" alt="Logo Aseguradora Tajy">
```

Si tu logo está en la raíz (no en carpeta `logo/`), cambia a:

```html
<img src="logo.png" alt="Logo Aseguradora Tajy">
```

#### Paso 5: Probar

```
http://localhost:8000/index.html
```

O simplemente:

```
http://localhost:8000
```

---

### Opción 2: Eliminar archivos antiguos (MÁS LIMPIO)

Si estás 100% seguro de que el nuevo sistema funciona correctamente.

#### Paso 1: Eliminar archivos antiguos

**Archivos a eliminar:**
- ❌ `index.html` (versión antigua)
- ❌ `index_fixed.html` (versión antigua)
- ❌ `config.js` (ya no se usa, credenciales están en app.js)

**Mantener estos archivos:**
- ✅ `app.html` → renombrar a `index.html`
- ✅ `app.js` (mantener el nombre)
- ✅ `iniciar_servidor.bat`
- ✅ `setup_supabase.sql`
- ✅ Todos los archivos `.md` (documentación)

#### Paso 2: Renombrar

```
app.html → index.html
```

#### Paso 3: Verificar y probar

Igual que en la Opción 1.

---

## 📁 Estructura Final Recomendada

```
Sistema de Gestion - Aseguradora Tajy/
├── index.html                    ← Nuevo (antes app.html)
├── app.js                         ← Mantener nombre
├── logo.png                       ← O en carpeta logo/
├── iniciar_servidor.bat
├── setup_supabase.sql
│
├── RESPALDOS (opcional)/
│   ├── index.OLD.html             ← Respaldo
│   ├── index_fixed.OLD.html       ← Respaldo
│   └── config.OLD.js              ← Respaldo
│
└── DOCUMENTACION/
    ├── CAMBIOS_FORMULARIO.md
    ├── CAMBIOS_SINIESTRO_TOTAL.md
    ├── RESUMEN_FINAL_CAMBIOS.md
    ├── INSTRUCCIONES_LOGO.md
    ├── INSTRUCCIONES_SETUP.md
    ├── SOLUCION_CORS.md
    ├── SOLUCION_RAPIDA.md
    └── PASAR_A_PRODUCCION.md      ← Este archivo
```

---

## ⚙️ Configuración del Servidor

### Para Desarrollo Local:

```bash
# Sigue usando
iniciar_servidor.bat
```

Accede a: `http://localhost:8000`

### Para Producción (Servidor Web):

Si vas a subir a un servidor web real:

1. **Sube estos archivos al servidor:**
   - ✅ `index.html`
   - ✅ `app.js`
   - ✅ `logo.png` (o carpeta `logo/`)
   - ✅ Carpeta `logo/` si tu logo está ahí

2. **NO subas:**
   - ❌ `iniciar_servidor.bat` (solo para desarrollo local)
   - ❌ `setup_supabase.sql` (ya ejecutado en Supabase)
   - ❌ Archivos `.OLD.html` (respaldos)
   - ❌ Archivos `.md` (documentación - opcional)

3. **Accede mediante:**
   ```
   https://tu-dominio.com/
   o
   https://tu-dominio.com/index.html
   ```

---

## 🔐 Seguridad en Producción

### ⚠️ IMPORTANTE: Credenciales Expuestas

Actualmente, las credenciales de Supabase están en `app.js`:

```javascript
const config = {
    url: 'https://myfisecfgbhpzgpkxxeb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
};
```

**Esto es SEGURO para:**
- ✅ Desarrollo local
- ✅ Aplicaciones de uso interno
- ✅ La clave es ANON_KEY (solo lectura/escritura según RLS)

**Pero considera:**
- 🔒 La ANON_KEY es pública por diseño
- 🔒 La seguridad real viene de las políticas RLS en Supabase
- 🔒 Nunca expongas SERVICE_ROLE_KEY (bypass de RLS)

### Verificar Políticas RLS en Supabase:

1. Ve a Supabase → Table Editor → `siniestros`
2. Verifica que RLS esté **ENABLED**
3. Revisa las 4 políticas:
   - ✅ SELECT público
   - ✅ INSERT público
   - ✅ UPDATE público
   - ✅ DELETE público

---

## 🧪 Lista de Verificación Pre-Producción

Antes de pasar a producción, verifica:

### Funcionalidad:
- [ ] La aplicación carga correctamente
- [ ] Se conecta a Supabase (🟢 Conectado)
- [ ] Puedes registrar nuevos siniestros
- [ ] Los siniestros aparecen en la lista
- [ ] Puedes editar siniestros existentes
- [ ] Puedes eliminar siniestros
- [ ] El resaltado de "Siniestro Total" funciona
- [ ] Los mensajes de WhatsApp funcionan
- [ ] Los reportes se generan correctamente

### Visual:
- [ ] El logo se muestra correctamente
- [ ] Las estadísticas se actualizan
- [ ] Los filtros funcionan
- [ ] Los botones responden
- [ ] No hay errores en la consola (F12)

### Datos:
- [ ] Los datos de prueba están correctos
- [ ] No hay información sensible de prueba
- [ ] Las fechas se registran correctamente

---

## 🔄 Comandos Rápidos (Windows)

### Usando Command Prompt:

```bash
# Navegar a la carpeta del proyecto
cd "e:\Proyectos\Sistema de Gestion - Aseguradora Tajy"

# Respaldar archivos antiguos
ren index.html index.OLD.html
ren index_fixed.html index_fixed.OLD.html
ren config.js config.OLD.js

# Renombrar nuevo archivo a producción
ren app.html index.html

# Listar archivos para verificar
dir
```

### O usando PowerShell:

```powershell
# Navegar a la carpeta
cd "e:\Proyectos\Sistema de Gestion - Aseguradora Tajy"

# Respaldar
Rename-Item -Path "index.html" -NewName "index.OLD.html"
Rename-Item -Path "index_fixed.html" -NewName "index_fixed.OLD.html"
Rename-Item -Path "config.js" -NewName "config.OLD.js"

# Renombrar a producción
Rename-Item -Path "app.html" -NewName "index.html"

# Listar
Get-ChildItem
```

---

## 📝 Después del Cambio

### 1. Actualizar marcadores/favoritos

Si tenías guardado:
```
http://localhost:8000/app.html
```

Ahora usa:
```
http://localhost:8000/
o
http://localhost:8000/index.html
```

### 2. Limpiar caché del navegador

```
Ctrl + Shift + Delete
```

Marca "Imágenes y archivos en caché" y borra.

### 3. Verificar en diferentes navegadores

- ✅ Chrome
- ✅ Edge
- ✅ Firefox

---

## 🆘 Rollback (Volver Atrás)

Si algo sale mal y quieres volver al sistema anterior:

```bash
# Eliminar nueva versión
del index.html

# Restaurar respaldo
ren index.OLD.html index.html
ren config.OLD.js config.js

# Reiniciar servidor
# Ctrl+C en la ventana del servidor
# Ejecutar nuevamente iniciar_servidor.bat
```

---

## ✅ Resumen de Pasos (Opción Recomendada)

1. **Respaldar:**
   ```
   index.html → index.OLD.html
   index_fixed.html → index_fixed.OLD.html
   config.js → config.OLD.js
   ```

2. **Renombrar:**
   ```
   app.html → index.html
   ```

3. **Verificar ruta del logo en index.html:**
   ```html
   <img src="logo/logo.png"> o <img src="logo.png">
   ```

4. **Probar:**
   ```
   http://localhost:8000
   ```

5. **Limpiar caché del navegador** (`Ctrl + Shift + Delete`)

6. **Verificar funcionalidad completa**

7. **Si todo funciona, puedes eliminar archivos `.OLD.html`**

---

## 💡 Notas Adicionales

### ¿Por qué mantener `app.js` con ese nombre?

- ✅ Ya está referenciado en `index.html`
- ✅ El versionado `?v=3.4` ayuda con el caché
- ✅ Nombre descriptivo
- ✅ Evita conflictos con librerías que usen `main.js`

### ¿Qué pasa con config.js?

- ❌ Ya no se usa
- ❌ Las credenciales están ahora en `app.js`
- ✅ Puedes eliminarlo o guardarlo como respaldo

### ¿Necesito modificar algo en Supabase?

- ❌ No
- ✅ Todo sigue funcionando igual
- ✅ Las credenciales son las mismas
- ✅ Las políticas RLS siguen activas

---

## 🎯 Listo para Producción

Una vez completados todos los pasos:

✅ Tu aplicación estará accesible en `http://localhost:8000`
✅ Con todas las nuevas funcionalidades
✅ Sistema simplificado y optimizado
✅ Respaldos de versiones anteriores guardados

**¡Éxito con tu sistema en producción!** 🚀
