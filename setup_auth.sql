-- ============================================
-- SCRIPT DE CONFIGURACIÓN PARA AUTENTICACIÓN
-- Sistema de Gestión de Siniestros - Aseguradora Tajy
-- ============================================
-- Este script crea la tabla de usuarios para los tramitadores
-- ============================================

-- Crear tabla de usuarios (tramitadores)
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    nombre_completo TEXT NOT NULL,
    rol TEXT DEFAULT 'tramitador' CHECK (rol IN ('tramitador', 'admin', 'supervisor')),
    activo BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por email
CREATE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email);

-- Crear función para actualizar updated_at
CREATE OR REPLACE FUNCTION update_usuarios_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar updated_at
DROP TRIGGER IF EXISTS update_usuarios_updated_at ON usuarios;
CREATE TRIGGER update_usuarios_updated_at
    BEFORE UPDATE ON usuarios
    FOR EACH ROW
    EXECUTE FUNCTION update_usuarios_updated_at();

-- Habilitar RLS en la tabla usuarios
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura de usuarios (para mostrar nombres)
CREATE POLICY "Public can view usuarios"
ON usuarios FOR SELECT
TO public
USING (true);

-- Política para permitir actualización de perfil propio (opcional)
CREATE POLICY "Users can update own profile"
ON usuarios FOR UPDATE
TO authenticated
USING (auth.uid()::text = id::text)
WITH CHECK (auth.uid()::text = id::text);

-- ============================================
-- DATOS DE EJEMPLO (Insertar manualmente después de crear usuarios en Supabase Auth)
-- ============================================
-- Para crear un usuario:
-- 1. Ve a Supabase Dashboard → Authentication → Users → Add User
-- 2. Crea el usuario con email y contraseña
-- 3. Luego ejecuta este INSERT con el UUID del usuario creado:

-- Ejemplo (reemplaza el UUID con el de tu usuario):
-- INSERT INTO usuarios (id, email, nombre_completo, rol)
-- VALUES (
--     'UUID_DEL_USUARIO_AQUI',  -- Reemplazar con UUID real
--     'kevin.ruiz@tajy.com',
--     'Kevin Ruiz Díaz',
--     'tramitador'
-- );

-- ============================================
-- VERIFICACIÓN
-- ============================================
-- Verificar que la tabla fue creada:
-- SELECT * FROM usuarios;
