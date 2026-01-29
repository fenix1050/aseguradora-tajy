// ============================================
// CONFIGURACIÓN DE SUPABASE - PLANTILLA
// ============================================
// ⚠️ INSTRUCCIONES:
// 1. Copiar este archivo como 'config.js'
// 2. Reemplazar los valores de ejemplo con tus credenciales reales
// 3. Obtener credenciales en: https://supabase.com/dashboard
//    - Project Settings > API
// 4. NUNCA subir config.js al repositorio (está en .gitignore)
// ============================================

const config = {
    // URL de tu proyecto Supabase
    // Ejemplo: 'https://abcdefghijklmnop.supabase.co'
    url: 'TU_SUPABASE_URL_AQUI',
    
    // Clave pública (anon key) de Supabase
    // Ejemplo: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
    key: 'TU_SUPABASE_ANON_KEY_AQUI'
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.config = config;
}
