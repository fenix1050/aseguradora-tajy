# CLAUDE.md - AI Assistant Guide for Aseguradora Tajy

## Project Overview

**Aseguradora Tajy** is a claims management system (Sistema de Gestión de Siniestros) for an insurance company in Paraguay. The application allows tramitadores (claims handlers) to manage insurance claims, send WhatsApp messages to clients, and generate reports.

- **Language**: Spanish (Paraguay locale: es-PY)
- **Currency**: Paraguayan Guaraní (Gs.)
- **Phone format**: Paraguay (+595)
- **Timezone**: GMT-4 (Paraguay)

## Tech Stack

### Frontend
- **HTML5** - Single-page application with tabs
- **CSS3** - Inline styles in `<style>` tags (no external CSS files)
- **Vanilla JavaScript ES6+** - Modular architecture using ES modules
- **Supabase Client Library** - Loaded via CDN from jsdelivr

### Backend
- **Supabase** - PostgreSQL database with REST API
- **Row Level Security (RLS)** - Per-user data isolation via `user_id`
- **Supabase Auth** - Email/password authentication

### Deployment
- **Netlify** - Static site hosting (configured in `netlify.toml`)
- Redirect root `/` to `/login.html`
- Security headers configured (X-Frame-Options, X-XSS-Protection, etc.)

## Directory Structure

```
aseguradora-tajy/
├── index.html              # Main application (after login)
├── login.html              # Authentication page
├── config.js               # Supabase configuration (URL + anon key)
├── netlify.toml            # Netlify deployment configuration
│
├── assets/
│   └── js/
│       ├── app.js          # Entry point - orchestration
│       ├── auth.js         # Authentication, sessions, roles
│       ├── supabase.js     # Supabase client initialization
│       ├── siniestros.js   # Claims CRUD + business logic
│       ├── usuarios.js     # User management (admin)
│       ├── ui.js           # DOM manipulation, modals, tables
│       ├── utils.js        # Cache, validators, fuzzy search
│       └── handlers/
│           ├── siniestros.handlers.js  # Claims event handlers
│           ├── filtros.handlers.js     # Search/filter handlers
│           ├── mensajes.handlers.js    # WhatsApp message handlers
│           ├── reportes.handlers.js    # Report generation handlers
│           ├── usuarios.handlers.js    # User management handlers
│           └── telefono.handlers.js    # Phone input formatting
│
├── logo/                   # Logo assets
├── backups/                # Database backup files
│
├── *.sql                   # Database setup scripts
│   ├── supabase_setup.sql      # Main table creation
│   ├── setup_auth.sql          # Authentication setup
│   ├── migracion_user_id_v2.sql # User ID migration
│   └── consultas_utiles.sql    # Useful SQL queries
│
└── *.md                    # Documentation files
```

## Architecture

### Module Dependency Graph

```
app.js (entry point)
├── supabase.js (client initialization)
├── auth.js (session management)
├── ui.js (DOM operations)
└── handlers/
    ├── siniestros.handlers.js → siniestros.js, ui.js
    ├── filtros.handlers.js → siniestros.js, ui.js
    ├── mensajes.handlers.js → siniestros.js, ui.js
    ├── reportes.handlers.js → siniestros.js, ui.js
    └── usuarios.handlers.js → usuarios.js, ui.js
```

### Data Flow Pattern

1. **User Action** → Handler function in `handlers/*.js`
2. **Handler** → Calls service function in `siniestros.js` or `usuarios.js`
3. **Service** → Interacts with Supabase via `getClienteSupabase()`
4. **Service** → Returns result object `{ success, data?, error? }`
5. **Handler** → Calls UI functions in `ui.js` to update DOM
6. **Handler** → Shows toast notifications via `mostrarAlerta()`

### Global State

- `clienteSupabase` - Supabase client instance (singleton in `supabase.js`)
- `siniestros` - Current page of claims (array in `siniestros.js`)
- `usuarioActual` - Current logged-in user profile (in `auth.js`)
- `cachedUserId` - Cached user UUID for RLS queries (in `auth.js`)
- `memoriaCache` - In-memory cache with 5-minute TTL (in `utils.js`)

## Database Schema

### Table: `siniestros` (Claims)

| Column        | Type          | Description                           |
|---------------|---------------|---------------------------------------|
| id            | BIGSERIAL     | Primary key                           |
| numero        | VARCHAR(50)   | Claim number (unique per user)        |
| asegurado     | VARCHAR(255)  | Insured person's name                 |
| sexo          | VARCHAR(1)    | Gender: 'M', 'F', or ''               |
| telefono      | VARCHAR(50)   | Phone number (+595 format)            |
| fecha         | DATE          | Claim date                            |
| tipo          | VARCHAR(100)  | Claim type                            |
| estado        | VARCHAR(50)   | Status (see below)                    |
| monto         | VARCHAR(100)  | Amount or 'Sí'/'No' for total loss    |
| poliza        | VARCHAR(50)   | Policy number                         |
| taller        | VARCHAR(255)  | Assigned workshop                     |
| observaciones | TEXT          | Notes                                 |
| user_id       | UUID          | Owner user (RLS)                      |
| created_at    | TIMESTAMPTZ   | Auto-generated                        |
| updated_at    | TIMESTAMPTZ   | Auto-updated via trigger              |

### Status Values (`estado`)

- `pendiente` - Pending (yellow)
- `proceso` - In Process (blue)
- `aprobado` - Approved (green)
- `taller` - Liquidated/In Workshop (cyan)
- `rechazado` - Rejected (red)

### Table: `usuarios` (Users)

| Column          | Type        | Description                    |
|-----------------|-------------|--------------------------------|
| id              | UUID        | Primary key                    |
| email           | VARCHAR     | Unique email                   |
| nombre_completo | VARCHAR     | Full name                      |
| rol             | VARCHAR     | Role: 'admin' or 'tramitador'  |
| created_at      | TIMESTAMPTZ | Auto-generated                 |

## Code Conventions

### JavaScript Style

```javascript
// Function naming: camelCase with verb prefix
async function cargarSiniestros() { }
function handleEditarSiniestro(id) { }
function mostrarAlerta(tipo, mensaje) { }

// Handler export pattern
export async function handleCargarSiniestros(pagina = 0, aplicarFiltros = false) {
    // ...
}

// Result object pattern
return { success: true, data: siniestros };
return { success: false, error: 'Error message' };
return { success: false, error: 'Duplicate', duplicado: true };

// IIFE for async in sync contexts
export function handleEditarSiniestro(id) {
    (async () => {
        const siniestro = await getSiniestroByIdWithFallback(id);
        // ...
    })();
}
```

### Module Organization

Each module follows this structure:
```javascript
// ============================================
// MODULE_NAME - Brief description
// ============================================

// Imports
import { ... } from './module.js';

// State (if any)
let privateState = null;

// Exported functions
export function publicFunction() { }

// Private helpers (not exported)
function privateHelper() { }
```

### DOM Interaction

- **UI functions** in `ui.js` handle all DOM manipulation
- **Handlers** call UI functions, never manipulate DOM directly
- Event listeners use `addEventListener()`, not inline `onclick`
- Global `window.*` assignments exist only for legacy HTML compatibility

### Cache Pattern

```javascript
// Check cache first
const cacheKey = `prefix_${userId}_${param}`;
const cached = cacheManager.get(cacheKey);
if (cached) return cached;

// Fetch from DB
const { data, error } = await supabase.from('table').select('*');

// Store in cache
cacheManager.set(cacheKey, data);

// Invalidate on mutations
cacheManager.invalidate('prefix_');
```

### Validation Pattern

```javascript
// In utils.js
export const validadores = {
    numero: (valor) => { /* return error string or null */ },
    telefono: (valor) => { /* return error string or null */ },
    asegurado: (valor) => { /* return error string or null */ }
};

// Usage in handlers
if (!validarCampo('numero', datos.numero, inputElement)) return;
```

## Common Tasks

### Adding a New Field to Claims

1. Add column in Supabase SQL Editor:
   ```sql
   ALTER TABLE siniestros ADD COLUMN new_field VARCHAR(100);
   ```

2. Update `siniestros.js`:
   - Add field in `crearSiniestro()` insert object
   - Add field in `actualizarSiniestro()` update object
   - Include field in `select()` projection if explicit

3. Update `ui.js`:
   - Add field in `llenarFormularioEdicion()`
   - Add field in `leerFormularioEdicion()`
   - Add column in `actualizarTabla()` if visible in list

4. Update HTML forms in `index.html`

### Adding a New Handler

1. Create handler file in `assets/js/handlers/`:
   ```javascript
   // new.handlers.js
   import { ... } from '../ui.js';
   import { ... } from '../siniestros.js';

   export async function handleNewAction() {
       // Implementation
   }
   ```

2. Import and wire in `app.js`:
   ```javascript
   import { handleNewAction } from './handlers/new.handlers.js';

   // In inicializarApp() or via window assignment
   window.newAction = handleNewAction;
   ```

### Adding a New Tab

1. Add tab button in `index.html`:
   ```html
   <button class="tab-button" data-tab="newTab">New Tab</button>
   ```

2. Add tab content:
   ```html
   <div id="newTab" class="tab-content">
       <!-- Content -->
   </div>
   ```

3. Tab switching is automatic via `data-tab` attribute

### Adding a New Message Template

1. Update `generarMensaje()` in `siniestros.js`:
   ```javascript
   const plantillas = {
       // ... existing templates
       newTemplate: `${saludo}, new message text ${datos.numero}...`
   };
   ```

2. Add option in HTML:
   ```html
   <option value="newTemplate">New Template Name</option>
   ```

## User Authentication Flow

1. User loads app → `login.html` (via Netlify redirect)
2. Login form → Supabase `auth.signInWithPassword()`
3. Success → Redirect to `index.html`
4. `app.js` → `verificarSesion()` validates session
5. If valid → Load user profile from `usuarios` table
6. If invalid → Redirect back to `login.html`

### Roles and Permissions

- **admin**: Full access + user management tab
- **tramitador**: Claims CRUD, messages, reports (no user management)

```javascript
// Check role
if (esAdmin()) { /* show admin features */ }
if (tienePermiso('ver_siniestros')) { /* allowed */ }
```

## Security Considerations

### Row Level Security (RLS)

All `siniestros` queries MUST include `user_id`:
```javascript
const userId = await getUserId();
query = query.eq('user_id', userId);
```

### XSS Prevention

- Use `escapeHtml()` for user-generated content in innerHTML
- Prefer `textContent` over `innerHTML` when possible
- Avoid `eval()` and `new Function()`

### Sensitive Data

- `config.js` contains Supabase anon key (public, but avoid exposing URL patterns)
- Never log user passwords or tokens
- Session tokens are managed by Supabase Auth

## Phone Number Format

Paraguay phone format: `+595 XXX XXXXXX` or `+595 XXX XXXXXXX`

```javascript
// Validation regex
const regex = /^\+595\s?\d{3}\s?\d{6,7}$/;

// Clean for WhatsApp API
const numeroLimpio = telefono.replace(/[^\d]/g, '');
```

## Fuzzy Search Implementation

The app uses a custom fuzzy search with:
- Levenshtein distance for typo tolerance
- Spanish phonetic matching (soundex adapted)
- Ranking: exact > startsWith > includes > phonetic > levenshtein

Threshold: 0.35-0.4 minimum score for suggestions.

## Caching Strategy

- **5-minute TTL** for all cached data
- **Prefix-based invalidation** for related data
- Cache keys include `userId` for multi-tenant isolation

```javascript
// Example cache key format
`siniestros_${userId}_p${page}_${column}_${direction}_${filters}`
```

## Error Handling

### Service Layer
```javascript
try {
    const { data, error } = await supabase.from(...);
    if (error) throw error;
    return { success: true, data };
} catch (error) {
    console.error('Error:', error);
    return { success: false, error: error.message };
}
```

### Handler Layer
```javascript
const resultado = await serviceFn();
if (!resultado.success) {
    mostrarAlerta('error', 'Error: ' + resultado.error);
    return;
}
mostrarAlerta('success', 'Operación exitosa');
```

### Session Expiration
`manejarErrorSesion()` in `supabase.js` detects JWT expiration and refreshes automatically.

## Testing Notes

- No automated tests currently
- Manual testing via browser DevTools
- Console logs use emoji prefixes for clarity:
  - `🚀` - Starting operation
  - `✅` - Success
  - `❌` - Error
  - `⚠️` - Warning

## Deployment

### Netlify
1. Push to main branch
2. Netlify auto-deploys from connected repo
3. Config in `netlify.toml`

### Local Development
```bash
# Option 1: Python server
python -m http.server 8000

# Option 2: Any static server
npx serve .
```

## Important Files for Common Changes

| Change Needed                    | Primary Files                                    |
|----------------------------------|--------------------------------------------------|
| UI/styling                       | `index.html` (inline styles)                     |
| Claim fields                     | `siniestros.js`, `ui.js`, `index.html`           |
| Search behavior                  | `filtros.handlers.js`, `utils.js`                |
| Message templates                | `siniestros.js` (`generarMensaje`)               |
| Authentication                   | `auth.js`, `login.html`                          |
| Database config                  | `config.js`, `supabase.js`                       |
| Validation rules                 | `utils.js` (`validadores`)                       |
| Toast notifications              | `ui.js` (`mostrarAlerta`)                        |
| Table rendering                  | `ui.js` (`actualizarTabla`)                      |
| Pagination                       | `ui.js`, `siniestros.js` (LIMITE_POR_PAGINA=50)  |

## Constants

```javascript
// utils.js
DIAS_ALERTA_SEGUIMIENTO = 3  // Days before follow-up alert
LIMITE_POR_PAGINA = 50       // Pagination size

// cacheManager
ttl = 5 * 60 * 1000          // 5 minutes cache TTL
```

## Naming Conventions

- **Functions**: `camelCase` with verb prefix (`cargar`, `mostrar`, `handle`, `validar`)
- **Variables**: `camelCase`
- **Constants**: `SCREAMING_SNAKE_CASE`
- **CSS classes**: `kebab-case` (e.g., `badge-aprobado`, `tab-button`)
- **IDs**: `camelCase` (e.g., `listaSiniestros`, `buscarAsegurado`)
- **Data attributes**: `data-kebab` (e.g., `data-tab`, `data-id`)

## Git Workflow

- Main branch: `main`
- Feature branches: `claude/*` for AI-assisted development
- Commit messages: Spanish, descriptive (e.g., "fix: corregir validación de teléfono")
