// ============================================
// CONFIGURACIÓN DE SUPABASE
// ============================================
// ⚠️ IMPORTANTE: Este archivo contiene credenciales sensibles
// NO subir a repositorios públicos
// ============================================

const config = {
    url: 'https://myfisecfgbhpzgpkxxeb.supabase.co',
    key: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im15ZmlzZWNmZ2JocHpncGt4eGViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg1OTcwODYsImV4cCI6MjA4NDE3MzA4Nn0.0fI3Xp_H9nPG9Eqba9_o-iKaY8qrGtrsx_sOg2sRYqw'
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.config = config;
}
