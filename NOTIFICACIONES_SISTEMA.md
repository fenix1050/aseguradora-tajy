# Sistema de Notificaciones de Seguimiento - Aseguradora Tajy

**Fecha**: 2026-01-25
**Rama**: `claude/optimize-project-alerts-ZkWd8`
**Versión**: 1.0

---

## Descripción General

El **Sistema de Notificaciones de Seguimiento** es una solución discreta y no intrusiva que alerta a los tramitadores sobre siniestros que requieren atención basándose en el tiempo transcurrido sin actualizaciones.

### Características Principales

✅ **Badge con contador** - Notificación visual en el header
✅ **Panel deslizante** - Interfaz elegante que no interrumpe el flujo de trabajo
✅ **3 niveles de urgencia** - Atención (3-6 días), Importante (7-13 días), Urgente (14+ días)
✅ **Función Snooze** - Posponer notificaciones temporalmente
✅ **Acciones rápidas** - Editar, WhatsApp, Posponer desde la notificación
✅ **Persistencia en BD** - Las notificaciones se guardan en Supabase
✅ **Sincronización automática** - Se actualizan al cargar la app

---

## Componentes del Sistema

### 1. Base de Datos

**Tabla**: `notificaciones_seguimiento`

```sql
CREATE TABLE notificaciones_seguimiento (
    id BIGSERIAL PRIMARY KEY,
    siniestro_id BIGINT REFERENCES siniestros(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nivel_urgencia VARCHAR(20) NOT NULL, -- 'atencion', 'importante', 'urgente'
    leida BOOLEAN DEFAULT FALSE,
    snoozed_hasta TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Función SQL**: `sincronizar_notificaciones_seguimiento(p_user_id UUID)`
- Crea notificaciones para siniestros que requieren seguimiento
- Actualiza niveles de urgencia si cambian
- Elimina notificaciones de siniestros ya resueltos

### 2. Módulos JavaScript

**Archivos creados**:
- `assets/js/notificaciones.js` - Lógica de negocio
- `assets/js/handlers/notificaciones.handlers.js` - Manejo de UI

**Funciones principales**:
```javascript
// Cargar notificaciones
await cargarNotificaciones()

// Marcar como leída
await marcarNotificacionLeida(notificacionId)
await marcarTodasLeidas()

// Snooze (posponer)
await snoozeNotificacion(notificacionId, horas)

// Sincronizar con siniestros
await sincronizarNotificaciones()
```

### 3. Interfaz de Usuario

**Badge de notificaciones** (Header):
```html
<button class="btn-notificaciones" id="btnNotificaciones">
    🔔
    <span class="badge-contador" id="badgeContadorNotif">0</span>
</button>
```

**Panel deslizante** (Lateral derecho):
- Header con título y botón cerrar
- Contador de notificaciones no leídas
- Botón "Marcar todas como leídas"
- Lista scrolleable de notificaciones
- Cada notificación muestra:
  - Icono de urgencia (🔴 ⚠️ 📋)
  - Número de siniestro
  - Nombre del asegurado
  - Teléfono
  - Días sin actualización
  - Taller asignado
  - Acciones: Editar, WhatsApp, Posponer, Marcar leída

---

## Niveles de Urgencia

### 📋 Atención (3-6 días)
- **Color**: Amarillo (#fff3cd)
- **Borde**: #ffc107
- **Criterio**: Siniestro con 3 a 6 días sin actualización

### ⚠️ Importante (7-13 días)
- **Color**: Naranja (#ffe6cc)
- **Borde**: #ff9800
- **Criterio**: Siniestro con 7 a 13 días sin actualización

### 🔴 Urgente (14+ días)
- **Color**: Rojo (#ffe6e6)
- **Borde**: #dc3545
- **Criterio**: Siniestro con 14 o más días sin actualización

**Nota**: Solo se crean notificaciones para siniestros en estado `pendiente` o `proceso`.

---

## Uso del Sistema

### Para el Usuario Final

#### 1. Ver Notificaciones
1. Click en el botón 🔔 en el header
2. El panel se abre desde la derecha
3. Ver lista de siniestros que requieren seguimiento

#### 2. Marcar como Leída
- **Opción 1**: Click en el botón ✓ de la notificación
- **Opción 2**: Click en cualquier parte de la notificación
- **Opción 3**: Botón "Marcar todas como leídas" (marca todo de una vez)

#### 3. Posponer (Snooze)
1. Click en "⏰ Posponer" en la notificación
2. Se abre un menú con opciones:
   - ⏱️ 1 hora
   - ⏰ 4 horas
   - 📅 1 día
   - 🗓️ 3 días
   - 📆 1 semana
3. Seleccionar el tiempo deseado
4. La notificación desaparece hasta que venza el snooze

#### 4. Acciones Rápidas
- **✏️ Editar**: Abre el modal de edición del siniestro
- **💬 WhatsApp**: Abre el modal de mensajes WhatsApp
- **⏰ Posponer**: Muestra opciones de snooze

#### 5. Cerrar Panel
- **Opción 1**: Click en el botón × (arriba a la derecha)
- **Opción 2**: Presionar tecla ESC
- **Opción 3**: Click fuera del panel (en el overlay)

---

## Flujo de Datos

### Carga Inicial (al abrir la app)

```
1. Usuario abre la app
   ↓
2. verificarSesion() valida autenticación
   ↓
3. sincronizarNotificaciones() actualiza notificaciones
   ↓
4. cargarNotificaciones() trae notificaciones activas
   ↓
5. actualizarBadgeContador() muestra cantidad no leídas
   ↓
6. Usuario ve badge con número (si hay notificaciones)
```

### Sincronización

La función `sincronizarNotificaciones()` se ejecuta:
- Al cargar la aplicación (una vez)
- Puede llamarse manualmente si se desea

Esta función:
1. Recorre todos los siniestros del usuario
2. Calcula días transcurridos desde la fecha del siniestro
3. Determina el nivel de urgencia
4. Crea/actualiza/elimina notificaciones según corresponda

**Ejemplo**:
- Siniestro creado hace 5 días → Crea notificación nivel "atención"
- Siniestro existente pasa de 6 a 7 días → Actualiza a nivel "importante"
- Siniestro cambia a estado "aprobado" → Elimina notificación

### Snooze (Posponer)

```
1. Usuario presiona "Posponer" en notificación ID=123
   ↓
2. Selecciona "1 día" (24 horas)
   ↓
3. snoozeNotificacion(123, 24)
   ↓
4. Actualiza notificaciones_seguimiento:
   SET snoozed_hasta = NOW() + INTERVAL '24 hours'
   WHERE id = 123
   ↓
5. Notificación desaparece del panel
   ↓
6. Después de 24 horas, aparece nuevamente en cargarNotificaciones()
   (query filtra: snoozed_hasta IS NULL OR snoozed_hasta < NOW())
```

---

## Instalación y Configuración

### Paso 1: Ejecutar Migración SQL

Ejecutar el archivo `migracion_notificaciones_seguimiento.sql` en Supabase SQL Editor:

```bash
# Copiar contenido del archivo y ejecutar en Supabase
cat migracion_notificaciones_seguimiento.sql
```

Esto creará:
- ✅ Tabla `notificaciones_seguimiento`
- ✅ Índices para optimizar queries
- ✅ Trigger para `updated_at`
- ✅ Políticas RLS
- ✅ Función `sincronizar_notificaciones_seguimiento()`

### Paso 2: Verificar Archivos

Asegurarse de que existen:
- ✅ `assets/js/notificaciones.js`
- ✅ `assets/js/handlers/notificaciones.handlers.js`
- ✅ Actualización en `assets/js/app.js`
- ✅ Actualización en `index.html` (CSS + HTML del panel)

### Paso 3: Desplegar

```bash
# Hacer commit de los cambios
git add .
git commit -m "feat: Implement notifications system with snooze"
git push origin claude/optimize-project-alerts-ZkWd8

# Netlify desplegará automáticamente
```

### Paso 4: Generar Notificaciones Iniciales (Opcional)

Si ya hay siniestros en la BD, ejecutar en Supabase SQL Editor:

```sql
-- Reemplazar con el UUID del usuario
SELECT * FROM sincronizar_notificaciones_seguimiento('UUID-del-usuario-aqui');
```

O simplemente recargar la app - se sincronizará automáticamente.

---

## API JavaScript

### Cargar Notificaciones

```javascript
import { cargarNotificaciones } from './notificaciones.js';

const resultado = await cargarNotificaciones();
// {
//   success: true,
//   data: [...notificaciones],
//   contador: 5,
//   estadisticas: {
//     total: 12,
//     noLeidas: 5,
//     urgente: 2,
//     importante: 4,
//     atencion: 6
//   }
// }
```

### Marcar como Leída

```javascript
import { marcarNotificacionLeida, marcarTodasLeidas } from './notificaciones.js';

// Una notificación
await marcarNotificacionLeida(123);

// Todas
await marcarTodasLeidas();
```

### Snooze

```javascript
import { snoozeNotificacion } from './notificaciones.js';

// Posponer por 24 horas
await snoozeNotificacion(123, 24);

// Posponer por 1 hora
await snoozeNotificacion(123, 1);
```

### Sincronizar

```javascript
import { sincronizarNotificaciones } from './notificaciones.js';

const resultado = await sincronizarNotificaciones();
// {
//   success: true,
//   stats: {
//     total_creadas: 3,
//     total_actualizadas: 2,
//     total_eliminadas: 1
//   }
// }
```

---

## Estilos CSS

### Colores Principales

```css
/* Variables CSS (ya definidas en index.html) */
--tajy-red: #c4161c;
--tajy-red-dark: #b8151a;

/* Niveles de urgencia */
--color-urgente-bg: #ffe6e6;
--color-urgente-border: #dc3545;

--color-importante-bg: #ffe6cc;
--color-importante-border: #ff9800;

--color-atencion-bg: #fff3cd;
--color-atencion-border: #ffc107;
```

### Clases Principales

- `.btn-notificaciones` - Badge en header
- `.badge-contador` - Número de notificaciones no leídas
- `#panelNotificaciones` - Panel deslizante
- `.notificacion` - Tarjeta de notificación individual
- `.notificacion.no-leida` - Notificación sin leer (destaca)
- `.notificacion.leida` - Notificación leída (opacidad reducida)
- `.snooze-menu` - Menú de opciones de snooze

---

## Personalización

### Cambiar Umbrales de Urgencia

Editar `assets/js/notificaciones.js` y `migracion_notificaciones_seguimiento.sql`:

```javascript
// En notificaciones.js (línea ~70)
if (dias >= 14) nivelAlerta = 'urgente';      // Cambiar 14 a X
else if (dias >= 7) nivelAlerta = 'importante'; // Cambiar 7 a Y
else if (dias >= 3) nivelAlerta = 'atencion';  // Cambiar 3 a Z
```

```sql
-- En migracion_notificaciones_seguimiento.sql (línea ~160)
IF v_dias >= 14 THEN
    v_nivel := 'urgente';
ELSIF v_dias >= 7 THEN
    v_nivel := 'importante';
ELSE
    v_nivel := 'atencion';
END IF;
```

### Agregar Más Opciones de Snooze

Editar `assets/js/notificaciones.js`:

```javascript
export const OPCIONES_SNOOZE = [
    { texto: '30 minutos', horas: 0.5, icono: '⏱️' }, // Nueva opción
    { texto: '1 hora', horas: 1, icono: '⏱️' },
    { texto: '4 horas', horas: 4, icono: '⏰' },
    { texto: '1 día', horas: 24, icono: '📅' },
    { texto: '3 días', horas: 72, icono: '🗓️' },
    { texto: '1 semana', horas: 168, icono: '📆' },
    { texto: '2 semanas', horas: 336, icono: '📆' } // Nueva opción
];
```

### Cambiar Estados que Generan Notificaciones

Editar `migracion_notificaciones_seguimiento.sql` (línea ~148):

```sql
-- Por defecto: 'pendiente', 'proceso'
WHERE user_id = p_user_id
AND estado IN ('pendiente', 'proceso', 'taller') -- Agregar 'taller' si se desea
AND EXTRACT(DAY FROM NOW() - fecha) >= 3
```

---

## Troubleshooting

### No aparecen notificaciones

1. **Verificar que hay siniestros que requieren seguimiento**:
   ```sql
   SELECT id, numero, asegurado, fecha,
          EXTRACT(DAY FROM NOW() - fecha) AS dias
   FROM siniestros
   WHERE estado IN ('pendiente', 'proceso')
   AND EXTRACT(DAY FROM NOW() - fecha) >= 3;
   ```

2. **Ejecutar sincronización manual**:
   ```sql
   SELECT * FROM sincronizar_notificaciones_seguimiento(auth.uid());
   ```

3. **Verificar RLS**:
   - Asegurarse de que `user_id` en `notificaciones_seguimiento` coincide con `auth.uid()`

### Badge no muestra número

1. **Abrir consola del navegador** (F12)
2. Buscar errores en la carga de notificaciones
3. Verificar que `handleCargarNotificaciones()` se ejecuta correctamente
4. Verificar que `badgeContadorNotif` existe en el DOM

### Panel no se abre

1. **Verificar event listener**:
   - Abrir consola → ejecutar `window.togglePanelNotificaciones()`
   - Si funciona → problema con el event listener
   - Si no funciona → problema con la función

2. **Verificar que el panel existe**:
   ```javascript
   document.getElementById('panelNotificaciones')
   // Debe retornar el elemento, no null
   ```

### Snooze no funciona

1. **Verificar que la fecha se guarda correctamente**:
   ```sql
   SELECT id, siniestro_id, snoozed_hasta
   FROM notificaciones_seguimiento
   WHERE snoozed_hasta IS NOT NULL;
   ```

2. **Verificar query de carga**:
   - El query debe filtrar `snoozed_hasta IS NULL OR snoozed_hasta < NOW()`

---

## Métricas y Monitoreo

### Consultas Útiles

**Notificaciones por nivel**:
```sql
SELECT nivel_urgencia, COUNT(*) as cantidad
FROM notificaciones_seguimiento
WHERE user_id = auth.uid()
AND (snoozed_hasta IS NULL OR snoozed_hasta < NOW())
GROUP BY nivel_urgencia;
```

**Notificaciones no leídas**:
```sql
SELECT COUNT(*) as no_leidas
FROM notificaciones_seguimiento
WHERE user_id = auth.uid()
AND leida = FALSE
AND (snoozed_hasta IS NULL OR snoozed_hasta < NOW());
```

**Siniestros sin notificación (deberían tenerla)**:
```sql
SELECT s.id, s.numero, s.asegurado,
       EXTRACT(DAY FROM NOW() - s.fecha) AS dias
FROM siniestros s
LEFT JOIN notificaciones_seguimiento n ON s.id = n.siniestro_id AND n.user_id = s.user_id
WHERE s.user_id = auth.uid()
AND s.estado IN ('pendiente', 'proceso')
AND EXTRACT(DAY FROM NOW() - s.fecha) >= 3
AND n.id IS NULL;
```

---

## Roadmap Futuro

### Versión 1.1 (Próximamente)
- [ ] Notificaciones en tiempo real con Supabase Realtime
- [ ] Sonido al recibir nueva notificación
- [ ] Agrupación por nivel en el panel
- [ ] Filtros en el panel (solo urgentes, solo importantes, etc.)
- [ ] Historial de notificaciones leídas

### Versión 1.2 (Futuro)
- [ ] Notificaciones por email (resumen diario/semanal)
- [ ] Push notifications (navegador)
- [ ] Personalización de umbrales por usuario
- [ ] Dashboard de estadísticas de seguimiento
- [ ] Recordatorios recurrentes configurables

---

## Conclusión

El sistema de notificaciones de seguimiento proporciona una forma discreta y eficiente de mantener a los tramitadores informados sobre siniestros que requieren atención, mejorando la productividad y asegurando que ningún caso quede olvidado.

**Ventajas**:
- ✅ No intrusivo (no hay toasts molestos)
- ✅ Información contextual completa
- ✅ Acciones rápidas integradas
- ✅ Flexible (snooze personalizable)
- ✅ Persistente (guardado en BD)
- ✅ Escalable (soporta muchas notificaciones)

---

**Documento creado**: 2026-01-25
**Autor**: Claude (Asistente AI)
**Versión**: 1.0
**Estado**: ✅ Implementado y documentado
