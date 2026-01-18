# 🛡️ Sistema de Gestión de Siniestros - Aseguradora Tajy

Sistema completo de gestión de siniestros con backend en Supabase (PostgreSQL) y frontend en HTML/JavaScript vanilla.

![Estado](https://img.shields.io/badge/estado-activo-success)
![Versión](https://img.shields.io/badge/versión-1.0.0-blue)
![Base de Datos](https://img.shields.io/badge/base%20de%20datos-Supabase-green)
![Licencia](https://img.shields.io/badge/licencia-MIT-lightgrey)

---

## 📋 Características

### ✅ Gestión Completa de Siniestros
- ✔️ Crear, leer, actualizar y eliminar siniestros
- ✔️ Campos completos: número, asegurado, teléfono, fecha, tipo, estado, monto, etc.
- ✔️ Estados: Pendiente, En Proceso, Aprobado, En Taller, Rechazado
- ✔️ Validación de datos en tiempo real

### 🔍 Búsqueda y Filtros
- ✔️ Búsqueda por nombre de asegurado
- ✔️ Búsqueda por número de siniestro
- ✔️ Filtrado por estado
- ✔️ Actualización en tiempo real

### 📊 Estadísticas y Reportes
- ✔️ Dashboard con métricas en tiempo real
- ✔️ Total de casos, pendientes, aprobados, en taller
- ✔️ Reportes por rango de fechas
- ✔️ Exportación a CSV/Excel
- ✔️ Vista de impresión optimizada

### 💬 Mensajes WhatsApp Automatizados
- ✔️ 5 plantillas predefinidas
- ✔️ Personalización automática con datos del siniestro
- ✔️ Saludo formal según sexo (Sr./Sra.)
- ✔️ Copiar al portapapeles
- ✔️ Abrir WhatsApp directo desde el sistema

### 🗄️ Base de Datos Robusta
- ✔️ PostgreSQL vía Supabase
- ✔️ API REST automática
- ✔️ Políticas de seguridad (RLS)
- ✔️ Timestamps automáticos (created_at, updated_at)
- ✔️ Índices optimizados para búsquedas rápidas

---

## 🚀 Inicio Rápido

### Requisitos Previos
- Cuenta en [Supabase](https://supabase.com) (gratis)
- Navegador web moderno
- Editor de texto

### Instalación

1. **Configurar Supabase:**
   ```bash
   # 1. Crear proyecto en Supabase
   # 2. Ejecutar supabase_setup.sql en SQL Editor
   # 3. Copiar credenciales (URL y anon key)
   ```

2. **Configurar el Sistema:**
   ```javascript
   // Editar config.js
   const SUPABASE_CONFIG = {
       SUPABASE_URL: 'https://tu-proyecto.supabase.co',
       SUPABASE_ANON_KEY: 'tu-anon-key-aqui'
   };
   ```

3. **Ejecutar:**
   ```bash
   # Opción 1: Abrir directamente
   # Doble clic en index.html
   
   # Opción 2: Servidor local
   python -m http.server 8000
   # Luego abrir: http://localhost:8000
   ```

📖 **Guía completa:** Ver [GUIA_INSTALACION.md](GUIA_INSTALACION.md)

---

## 📁 Estructura del Proyecto

```
aseguradora-tajy/
│
├── 📄 index.html              # Aplicación principal
├── 📄 config.js               # Configuración de Supabase
├── 📄 supabase_setup.sql      # Script de base de datos
├── 📄 consultas_utiles.sql    # Consultas SQL útiles
├── 📄 GUIA_INSTALACION.md     # Guía paso a paso
└── 📄 README.md               # Este archivo
```

---

## 🗄️ Modelo de Base de Datos

### Tabla: `siniestros`

| Campo         | Tipo      | Descripción                    | Requerido |
|---------------|-----------|--------------------------------|-----------|
| id            | BIGSERIAL | ID único (auto-incremental)    | Sí        |
| numero        | VARCHAR   | Número de siniestro (único)    | Sí        |
| asegurado     | VARCHAR   | Nombre del asegurado           | Sí        |
| sexo          | VARCHAR   | M/F (para mensajes formales)   | No        |
| telefono      | VARCHAR   | Teléfono WhatsApp              | Sí        |
| fecha         | DATE      | Fecha del siniestro            | Sí        |
| tipo          | VARCHAR   | Tipo de siniestro              | Sí        |
| estado        | VARCHAR   | Estado actual                  | Sí        |
| monto         | VARCHAR   | Monto estimado                 | No        |
| poliza        | VARCHAR   | Número de póliza               | No        |
| taller        | VARCHAR   | Taller asignado                | No        |
| observaciones | TEXT      | Notas adicionales              | No        |
| created_at    | TIMESTAMP | Fecha de creación (automático) | Sí        |
| updated_at    | TIMESTAMP | Última actualización (auto)    | Sí        |

### Estados Disponibles
- 🟡 **Pendiente** - Siniestro recién ingresado
- 🔵 **En Proceso** - En evaluación
- 🟢 **Aprobado** - Aprobado para reparación
- 🔷 **En Taller** - En proceso de reparación
- 🔴 **Rechazado** - No aprobado

### Tipos de Siniestro
- Colisión
- Robo
- Incendio
- Daños a Terceros
- Cristales
- Granizo
- Otro

---

## 💻 Tecnologías Utilizadas

### Frontend
- HTML5
- CSS3 (diseño moderno y responsive)
- JavaScript ES6+ (vanilla)
- Supabase Client Library (CDN)

### Backend
- Supabase (PostgreSQL)
- API REST automática
- Row Level Security (RLS)
- Triggers y Functions

### Características Técnicas
- ✅ Responsive Design (móvil, tablet, desktop)
- ✅ Progressive Web App ready
- ✅ Sin dependencias de frameworks
- ✅ Conexión en tiempo real
- ✅ Optimizado para rendimiento

---

## 🎨 Interfaz de Usuario

### Pestañas Principales

1. **📋 Lista de Siniestros**
   - Tabla completa con todos los siniestros
   - Búsqueda y filtros en vivo
   - Acciones rápidas (editar, mensaje, eliminar)

2. **➕ Nuevo Siniestro**
   - Formulario completo
   - Validación en tiempo real
   - Guardado instantáneo

3. **💬 Mensajes Automáticos**
   - 5 plantillas profesionales
   - Previsualización estilo WhatsApp
   - Personalización automática

4. **📊 Reportes**
   - Filtrado por fechas
   - Exportación a Excel/CSV
   - Vista de impresión

---

## 📱 Plantillas de Mensajes WhatsApp

### 1. Siniestro Aprobado
```
Estimado/a Sr./Sra. [Nombre], le saluda Kevin Ruiz Diaz de la 
Aseguradora Tajy. Le comento que su siniestro [número] ha sido 
aprobado, puede pasar por el taller para la realización del presupuesto.
```

### 2. Solicitud de Documentos
```
Estimado/a Sr./Sra. [Nombre], necesitamos que nos envíe los documentos 
solicitados para continuar con el trámite de su siniestro [número]. 📑✉️
```

### 3. Seguimiento de Caso
```
Estimado/a Sr./Sra. [Nombre], nos comunicamos para realizar un 
seguimiento a su siniestro [número]. Si tiene consultas, quedo 
a disposición. 📞🤝
```

### 4. Siniestro Rechazado
```
Estimado/a Sr./Sra. [Nombre], lamentamos informarle que su siniestro 
[número] ha sido rechazado. Para más detalles puede contactarnos. ❌📋
```

### 5. Solicitud de Presupuesto
```
Estimado/a Sr./Sra. [Nombre], por favor remítanos el presupuesto de 
los daños del siniestro [número] para proceder. 💰📝
```

---

## 🔐 Seguridad

### Características de Seguridad
- ✅ Row Level Security (RLS) habilitado
- ✅ Políticas de acceso configurables
- ✅ Solo clave pública expuesta (anon key)
- ✅ Validación de datos en frontend y backend
- ✅ Protección contra SQL injection
- ✅ HTTPS obligatorio

### Recomendaciones para Producción
1. Implementar autenticación de usuarios
2. Configurar políticas RLS personalizadas
3. Habilitar backups automáticos
4. Monitorear logs de acceso
5. Implementar rate limiting

---

## 📊 Límites del Plan Gratuito de Supabase

| Recurso               | Límite Gratuito    |
|-----------------------|--------------------|
| Base de datos         | 500 MB             |
| Almacenamiento        | 1 GB               |
| Ancho de banda        | 2 GB               |
| Usuarios autenticados | 50,000             |
| API requests          | Ilimitadas         |

💡 **Nota:** Suficiente para miles de siniestros

---

## 🛠️ Consultas SQL Útiles

Ver el archivo [consultas_utiles.sql](consultas_utiles.sql) para:
- Consultas de lectura y análisis
- Reportes avanzados
- Mantenimiento de la base de datos
- Optimización de rendimiento
- Respaldo y restauración

---

## 🚀 Despliegue en Producción

### GitHub Pages
```bash
git add .
git commit -m "Deploy"
git push origin main
# Habilitar GitHub Pages en Settings
```

### Netlify
1. Arrastra la carpeta al dashboard
2. ¡Listo! URL automática

### Vercel
```bash
vercel deploy
```

---

## 🐛 Solución de Problemas Comunes

### "🔴 No conectado"
- Verifica credenciales en `config.js`
- Comprueba que el proyecto de Supabase esté activo
- Revisa la consola del navegador (F12)

### "Error al cargar siniestros"
- Ejecuta el script SQL nuevamente
- Verifica que la tabla `siniestros` exista
- Comprueba las políticas RLS

### "CORS Error"
- Usa un servidor local (no abrir archivo directamente)
- Despliega en la nube (GitHub Pages, Netlify, etc.)

📖 Ver [GUIA_INSTALACION.md](GUIA_INSTALACION.md) para más detalles

---

## 🔄 Actualizaciones Futuras

### En desarrollo
- [ ] Autenticación de usuarios
- [ ] Roles y permisos
- [ ] Subida de archivos adjuntos
- [ ] Notificaciones en tiempo real
- [ ] Dashboard analítico avanzado
- [ ] Exportación a PDF
- [ ] Integración con API de WhatsApp Business
- [ ] App móvil (React Native)

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

## 👨‍💻 Autor

**Kevin Ruiz Díaz**  
Tramitador de Siniestros  
Aseguradora Tajy - Area Digital

---

## 🙏 Agradecimientos

- [Supabase](https://supabase.com) por su excelente plataforma
- Comunidad de desarrolladores open source

---

## 📞 Soporte

Para problemas o preguntas:
1. Revisa la [Guía de Instalación](GUIA_INSTALACION.md)
2. Consulta [consultas_utiles.sql](consultas_utiles.sql)
3. Abre un issue en GitHub
4. Contacta al administrador del sistema

---

## 🌟 Características Destacadas

- 🚀 **Rápido:** Carga en menos de 1 segundo
- 💾 **Persistente:** Datos almacenados de forma segura
- 📱 **Responsive:** Funciona en cualquier dispositivo
- 🔒 **Seguro:** Políticas RLS y validación de datos
- 🆓 **Gratis:** 100% gratuito con Supabase
- 🌐 **Desplegable:** Compatible con cualquier hosting estático

---

**¡Gracias por usar el Sistema de Gestión de Siniestros!** 🛡️

⭐ Si te gusta el proyecto, considera darle una estrella en GitHub
