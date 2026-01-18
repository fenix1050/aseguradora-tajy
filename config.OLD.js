// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
// 
// INSTRUCCIONES:
// 1. Ve a tu proyecto en Supabase (https://supabase.com)
// 2. En el panel izquierdo, haz clic en "Project Settings" (ícono de engranaje)
// 3. Selecciona "API"
// 4. Copia tu "Project URL" y pégala en SUPABASE_URL
// 5. Copia tu "anon public" key y pégala en SUPABASE_ANON_KEY
//
// ============================================

const SUPABASE_CONFIG = {
    // Tu URL de proyecto de Supabase (ejemplo: https://abcdefghijklmnop.supabase.co)
    SUPABASE_URL: 'https://myfisecfgbhpzgpkxxeb.supabase.co',

    // Tu clave pública anon de Supabase (busca la clave que empieza con "eyJ..." en tu proyecto de Supabase)
    // Ve a: Supabase Dashboard → Project Settings → API → anon/public key
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZmlzZWNmZ2JocHpncGt4eGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTcwODYsImV4cCI6MjA4NDE3MzA4Nn0.0fI3Xp_H9nPG9Eqba9_o-iKaY8qrGtrsx_sOg2sRYqw'
};

// ============================================
// NO MODIFICAR DEBAJO DE ESTA LÍNEA
// ============================================

// Validar configuración
function validarConfiguracion() {
    // Verificar que las credenciales existan y no sean placeholders
    if (!SUPABASE_CONFIG.SUPABASE_URL ||
        !SUPABASE_CONFIG.SUPABASE_ANON_KEY ||
        SUPABASE_CONFIG.SUPABASE_URL === 'TU_SUPABASE_URL_AQUI' ||
        SUPABASE_CONFIG.SUPABASE_ANON_KEY === 'TU_SUPABASE_ANON_KEY_AQUI') {
        console.error('⚠️ ERROR: Debes configurar SUPABASE_URL y SUPABASE_ANON_KEY');
        console.log('📝 Instrucciones: Ve a Supabase → Project Settings → API');
        return false;
    }
    console.log('✅ Configuración validada correctamente');
    return true;
}

// Exportar configuración
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SUPABASE_CONFIG;
}
