# 🚀 Guía de Deployment - Aseguradora Tajy

Esta guía explica cómo deployar la aplicación en **Netlify** de forma segura.

---

## 📋 Tabla de Contenidos

1. [Pre-requisitos](#pre-requisitos)
2. [Configuración en Netlify](#configuración-en-netlify)
3. [Variables de Entorno](#variables-de-entorno)
4. [Proceso de Deploy](#proceso-de-deploy)
5. [Verificación](#verificación)
6. [Troubleshooting](#troubleshooting)

---

## 🔧 Pre-requisitos

Antes de deployar, asegúrate de tener:

- [ ] Cuenta en [Netlify](https://netlify.com)
- [ ] Proyecto Supabase configurado
- [ ] Credenciales de Supabase:
  - URL del proyecto (ej: `https://abcdef.supabase.co`)
  - Anon/Public Key (clave pública)
- [ ] Repositorio Git conectado a Netlify

---

## ⚙️ Configuración en Netlify

### **1. Conectar Repositorio**

1. Ir a [Netlify Dashboard](https://app.netlify.com)
2. Click en **"Add new site"** → **"Import an existing project"**
3. Seleccionar proveedor Git (GitHub, GitLab, Bitbucket)
4. Autorizar acceso a Netlify
5. Seleccionar repositorio: `aseguradora-tajy`

### **2. Configurar Build Settings**

En la configuración del site:

- **Build command**: `bash build-config.sh || echo 'Build config skipped'`
- **Publish directory**: `.` (raíz del proyecto)
- **Production branch**: `main`

Netlify automáticamente detectará `netlify.toml` que ya tiene estas configuraciones.

---

## 🔐 Variables de Entorno

### **Paso 1: Obtener credenciales de Supabase**

1. Ir a [Supabase Dashboard](https://supabase.com/dashboard)
2. Seleccionar tu proyecto
3. Ir a **Settings** → **API**
4. Copiar:
   - **Project URL** (ej: `https://myfisecfgbhpzgpkxxeb.supabase.co`)
   - **Project API keys** → **anon/public** (ej: `eyJhbGciOiJIUzI1NiIsInR5cCI...`)

### **Paso 2: Configurar en Netlify**

1. En Netlify Dashboard, ir a **Site settings** → **Environment variables**
2. Click en **"Add a variable"**
3. Agregar las siguientes variables:

| Variable Name      | Value                                    | Scope      |
|--------------------|------------------------------------------|------------|
| `SUPABASE_URL`     | `https://tu-proyecto.supabase.co`        | Production |
| `SUPABASE_ANON_KEY`| `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`| Production |

**⚠️ IMPORTANTE**:
- NO incluyas comillas en los valores
- Verifica que no haya espacios al inicio/final
- Usa el scope **"Production"** para producción

### **Paso 3: Verificar configuración**

Después de agregar las variables:

1. Ir a **Deploys** → **Trigger deploy** → **Clear cache and deploy site**
2. Esperar a que termine el deployment
3. Revisar logs del build para confirmar que `build-config.sh` se ejecutó

---

## 🚀 Proceso de Deploy

### **Deploy Automático (Recomendado)**

Cada push a la rama `main` triggerea un deploy automático:

```bash
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main
```

Netlify automáticamente:
1. Detecta el push
2. Ejecuta `build-config.sh` (genera `config.js`)
3. Publica el sitio

### **Deploy Manual**

Desde Netlify Dashboard:

1. Ir a **Deploys**
2. Click en **"Trigger deploy"**
3. Seleccionar **"Deploy site"** o **"Clear cache and deploy site"**

---

## ✅ Verificación

Después del deploy, verificar:

### **1. Estado del Deploy**

En Netlify Dashboard → Deploys:
- ✅ Build debe mostrar **"Published"**
- ✅ Build logs deben mostrar: `✅ config.js generado exitosamente`

### **2. Funcionamiento de la App**

1. Abrir URL del sitio (ej: `https://aseguradora-tajy.netlify.app`)
2. Verificar que redirija a `/login.html`
3. Abrir DevTools Console (F12)
4. **NO** debe aparecer: `❌ ERROR: Credenciales de Supabase no configuradas`
5. Intentar login con credenciales válidas

### **3. Verificar config.js**

En DevTools Console:
```javascript
console.log(window.config);
// Debe mostrar:
// { url: "https://...", key: "eyJh..." }
```

Si muestra placeholders (`TU_SUPABASE_URL_AQUI`), las variables de entorno NO están configuradas.

---

## 🐛 Troubleshooting

### **Problema: "Credenciales no configuradas"**

**Síntoma**: Al abrir la app aparece error en console:
```
❌ ERROR: Credenciales de Supabase no configuradas.
```

**Solución**:
1. Verificar que las variables de entorno estén configuradas en Netlify
2. Hacer un deploy limpio: **Clear cache and deploy site**
3. Verificar en build logs que `build-config.sh` se ejecutó
4. Revisar que los nombres de variables sean exactos:
   - `SUPABASE_URL` (no `SUPABASE_API_URL`)
   - `SUPABASE_ANON_KEY` (no `SUPABASE_KEY`)

---

### **Problema: Build falla con "command not found"**

**Síntoma**: Build log muestra:
```
bash: build-config.sh: No such file or directory
```

**Solución**:
1. Verificar que `build-config.sh` está en el repositorio
2. Verificar permisos: `chmod +x build-config.sh`
3. Hacer commit y push del script

---

### **Problema: config.js no se genera**

**Síntoma**: Variables de entorno configuradas pero config.js tiene placeholders

**Solución**:
1. Revisar build logs completos en Netlify
2. Verificar que `netlify.toml` tiene:
   ```toml
   [build]
     command = "bash build-config.sh || echo 'Build config skipped'"
   ```
3. Verificar sintaxis del script `build-config.sh`

---

### **Problema: CORS errors en producción**

**Síntoma**: Error en console:
```
Access to fetch at 'https://....supabase.co' from origin '...' has been blocked by CORS
```

**Solución**:
1. Ir a Supabase Dashboard → **Settings** → **API**
2. En **"Site URL"** agregar: `https://tu-sitio.netlify.app`
3. En **"Additional Redirect URLs"** agregar la misma URL
4. Guardar cambios

---

## 🔄 Rotar Credenciales (Seguridad)

Si las credenciales fueron expuestas:

### **Paso 1: Generar nuevo Anon Key**

1. Ir a Supabase Dashboard → **Settings** → **API**
2. En **Project API keys** → **anon/public**
3. Click en **"Regenerate"** (si está disponible)
4. O crear un nuevo proyecto Supabase y migrar los datos

### **Paso 2: Actualizar en Netlify**

1. Ir a **Site settings** → **Environment variables**
2. Editar `SUPABASE_ANON_KEY` con el nuevo valor
3. Guardar
4. Trigger deploy: **Clear cache and deploy site**

### **Paso 3: Actualizar desarrollo local**

```bash
# Actualizar config.js local con nuevo key
# Editar manualmente el archivo
nano config.js
```

---

## 📚 Recursos Adicionales

- [Netlify Docs - Environment Variables](https://docs.netlify.com/environment-variables/overview/)
- [Netlify Docs - Build Configuration](https://docs.netlify.com/configure-builds/overview/)
- [Supabase Docs - API Keys](https://supabase.com/docs/guides/api/api-keys)
- [Supabase Docs - Auth Config](https://supabase.com/docs/guides/auth/config)

---

## 📞 Soporte

Si encuentras problemas durante el deployment:

1. Revisar [Build logs en Netlify](https://app.netlify.com)
2. Consultar [Issues del repositorio](https://github.com/tu-usuario/aseguradora-tajy/issues)
3. Contactar al equipo de desarrollo

---

**Última actualización**: 2025-01-29
**Versión**: 1.0
