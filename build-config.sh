#!/bin/bash
# ============================================
# BUILD SCRIPT - Generar config.js desde ENV
# ============================================
# Este script se ejecuta en Netlify antes del deploy
# Inyecta variables de entorno en config.js
#
# Variables requeridas en Netlify:
#   - SUPABASE_URL
#   - SUPABASE_ANON_KEY

echo "🔧 Generando config.js desde variables de entorno..."

if [ -z "$SUPABASE_URL" ] || [ -z "$SUPABASE_ANON_KEY" ]; then
    echo "⚠️  Variables de entorno no configuradas, usando config.js existente"
    exit 0
fi

cat > config.js << CONFIGEOF
// ============================================
// CONFIGURACIÓN DE SUPABASE - GENERADO AUTOMÁTICAMENTE
// ============================================
// Este archivo fue generado automáticamente durante el build
// Las credenciales provienen de variables de entorno de Netlify
// NO EDITAR MANUALMENTE - será sobrescrito en cada deploy
// ============================================

const config = {
    url: '$SUPABASE_URL',
    key: '$SUPABASE_ANON_KEY'
};

// Exportar para uso global
if (typeof window !== 'undefined') {
    window.config = config;
}
CONFIGEOF

echo "✅ config.js generado exitosamente"
echo "   URL: ${SUPABASE_URL:0:30}..."
echo "   Key: ${SUPABASE_ANON_KEY:0:30}..."
