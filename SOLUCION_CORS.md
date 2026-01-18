# 🔧 Solución al Error de CORS - Tracking Prevention

## 🔴 Problema Identificado

El error `Tracking Prevention blocked access to storage` ocurre porque:
1. Estás abriendo el archivo HTML directamente (protocolo `file://`)
2. El navegador bloquea peticiones cross-origin por seguridad

## ✅ Soluciones Disponibles

### Opción 1: Usar Servidor Local (RECOMENDADO)

#### Con el Script Automático:

1. **Haz doble clic en el archivo:**
   ```
   iniciar_servidor.bat
   ```

2. **Se abrirá una ventana de comandos** que dice:
   ```
   Iniciando servidor local...
   El servidor se iniciará en: http://localhost:8000
   ```

3. **Abre tu navegador y ve a:**
   ```
   http://localhost:8000/index.html
   ```

4. **¡Listo!** Ahora debería conectarse correctamente a Supabase

#### Requisitos:
- **Python** debe estar instalado
- Si no lo tienes, descarga desde: https://www.python.org/downloads/
- Durante la instalación, marca "Add Python to PATH"

---

### Opción 2: Usar un Servidor HTTP con Node.js

Si tienes Node.js instalado:

1. **Abre una terminal** en la carpeta del proyecto

2. **Instala http-server globalmente:**
   ```bash
   npm install -g http-server
   ```

3. **Inicia el servidor:**
   ```bash
   http-server -p 8000
   ```

4. **Abre el navegador en:**
   ```
   http://localhost:8000/index.html
   ```

---

### Opción 3: Usar Visual Studio Code con Live Server

Si tienes VS Code:

1. **Instala la extensión "Live Server":**
   - Abre VS Code
   - Ve a Extensiones (Ctrl+Shift+X)
   - Busca "Live Server"
   - Haz clic en "Install"

2. **Abre el proyecto en VS Code:**
   - File → Open Folder
   - Selecciona la carpeta del proyecto

3. **Inicia Live Server:**
   - Haz clic derecho en `index.html`
   - Selecciona "Open with Live Server"
   - O haz clic en "Go Live" en la barra inferior

4. **Se abrirá automáticamente en:**
   ```
   http://127.0.0.1:5500/index.html
   ```

---

### Opción 4: Cambiar Configuración del Navegador

**Microsoft Edge:**
1. Ve a `edge://settings/privacy`
2. En "Prevención de seguimiento", selecciona **"Básica"** (en lugar de Estricta)
3. Recarga la página (F5)

**Safari:**
1. Preferencias → Privacidad
2. Desactiva "Prevent cross-site tracking"
3. Recarga la página

**Firefox:**
1. Ve a `about:config`
2. Busca `privacy.trackingprotection.enabled`
3. Cambia a `false`
4. Recarga la página

⚠️ **Nota:** Esto reduce la privacidad del navegador

---

### Opción 5: Usar Chrome (Más Compatible)

Chrome tiene mejor compatibilidad con Supabase:

1. **Descarga Chrome:** https://www.google.com/chrome/
2. **Abre el archivo** `index.html` en Chrome
3. **Acepta** los permisos si aparecen

---

## 🎯 Solución Más Rápida

1. **Haz doble clic** en `iniciar_servidor.bat`
2. **Abre** http://localhost:8000/index.html
3. **¡Funciona!** ✅

---

## 🔍 Verificar que Funciona

Cuando esté bien configurado, deberías ver en la consola del navegador:

```
✅ Configuración validada correctamente
🚀 Iniciando aplicación...
✅ Conectado exitosamente a Supabase
✅ 1 siniestros cargados
```

Y en la interfaz:
- Estado: **🟢 Conectado**
- Total de Casos: **1** (o más)
- El siniestro de Juan Pérez en la lista

---

## ❓ ¿Todavía No Funciona?

Si después de usar el servidor local sigue sin funcionar:

1. **Verifica que el script SQL se ejecutó correctamente:**
   - Ve a Supabase → Table Editor
   - Deberías ver la tabla `siniestros` con 1 registro

2. **Verifica las políticas RLS:**
   - Ve a Supabase → Authentication → Policies
   - Busca la tabla `siniestros`
   - Deberías ver 4 políticas activas

3. **Verifica la consola del navegador:**
   - Presiona F12
   - Ve a la pestaña "Console"
   - Copia cualquier error y revísalo

4. **Intenta deshabilitar RLS temporalmente:**
   - En Supabase, ve a la tabla `siniestros`
   - Haz clic en "RLS disabled"
   - Esto es solo para testing

---

## 🚀 Resumen Rápido

| Solución | Dificultad | Velocidad |
|----------|-----------|-----------|
| Script BAT + Python | ⭐ Fácil | 🚀 1 minuto |
| Live Server (VS Code) | ⭐⭐ Media | 🚀 2 minutos |
| Chrome | ⭐ Fácil | 🚀 30 segundos |
| Cambiar config navegador | ⭐⭐⭐ Difícil | 🐌 5 minutos |

**Recomendación:** Usa el script `iniciar_servidor.bat` - es la solución más simple y efectiva.
