-- ============================================
-- SCRIPT DE CONFIGURACIÓN PARA SUPABASE
-- Sistema de Gestión de Siniestros - Aseguradora Tajy
-- ============================================
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase (https://supabase.com)
-- 2. En el menú lateral, haz clic en "SQL Editor"
-- 3. Haz clic en "New Query"
-- 4. Copia y pega TODO este archivo
-- 5. Haz clic en "Run" para ejecutar el script
--
-- Este script hará lo siguiente:
-- - Eliminar la tabla existente si hay problemas
-- - Crear la tabla con la estructura correcta
-- - Configurar las políticas RLS (Row Level Security) correctamente
-- - Insertar un registro de prueba
-- ============================================

-- ============================================
-- PASO 1: LIMPIAR DATOS EXISTENTES (OPCIONAL)
-- ============================================
-- Si quieres empezar desde cero, descomenta las siguientes líneas:
-- DROP TABLE IF EXISTS siniestros CASCADE;

-- ============================================
-- PASO 2: CREAR LA TABLA
-- ============================================

CREATE TABLE IF NOT EXISTS siniestros (
    -- Identificador único
    id BIGSERIAL PRIMARY KEY,

    -- Información básica del siniestro
    numero TEXT UNIQUE NOT NULL,
    asegurado TEXT NOT NULL,
    sexo TEXT CHECK (sexo IN ('M', 'F', '')),
    telefono TEXT NOT NULL,

    -- Detalles del siniestro
    fecha DATE NOT NULL,
    tipo TEXT NOT NULL,
    estado TEXT DEFAULT 'pendiente' CHECK (estado IN ('pendiente', 'proceso', 'aprobado', 'taller', 'rechazado')),

    -- Información adicional
    monto TEXT,
    poliza TEXT,
    taller TEXT,
    observaciones TEXT,

    -- Metadatos
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================
-- PASO 3: CREAR ÍNDICES PARA MEJORAR RENDIMIENTO
-- ============================================

-- Índice para búsquedas por número de siniestro
CREATE INDEX IF NOT EXISTS idx_siniestros_numero ON siniestros(numero);

-- Índice para búsquedas por asegurado
CREATE INDEX IF NOT EXISTS idx_siniestros_asegurado ON siniestros(asegurado);

-- Índice para filtros por estado
CREATE INDEX IF NOT EXISTS idx_siniestros_estado ON siniestros(estado);

-- Índice para ordenar por fecha
CREATE INDEX IF NOT EXISTS idx_siniestros_fecha ON siniestros(fecha DESC);

-- ============================================
-- PASO 4: CREAR FUNCIÓN PARA ACTUALIZAR updated_at
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Crear trigger para actualizar automáticamente updated_at
DROP TRIGGER IF EXISTS update_siniestros_updated_at ON siniestros;
CREATE TRIGGER update_siniestros_updated_at
    BEFORE UPDATE ON siniestros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- PASO 5: CONFIGURAR ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en la tabla
ALTER TABLE siniestros ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes que puedan causar conflictos
DROP POLICY IF EXISTS "Permitir acceso público a siniestros" ON siniestros;
DROP POLICY IF EXISTS "allow_all_siniestros" ON siniestros;
DROP POLICY IF EXISTS "Enable read access for all users" ON siniestros;
DROP POLICY IF EXISTS "Enable insert access for all users" ON siniestros;
DROP POLICY IF EXISTS "Enable update access for all users" ON siniestros;
DROP POLICY IF EXISTS "Enable delete access for all users" ON siniestros;

-- Crear políticas que permiten acceso completo para usuarios anónimos
-- IMPORTANTE: Estas políticas son para desarrollo/testing
-- En producción, deberías restringir el acceso según tus necesidades

-- Política para SELECT (leer datos)
CREATE POLICY "Public can view siniestros"
ON siniestros FOR SELECT
TO public
USING (true);

-- Política para INSERT (crear nuevos registros)
CREATE POLICY "Public can insert siniestros"
ON siniestros FOR INSERT
TO public
WITH CHECK (true);

-- Política para UPDATE (actualizar registros)
CREATE POLICY "Public can update siniestros"
ON siniestros FOR UPDATE
TO public
USING (true)
WITH CHECK (true);

-- Política para DELETE (eliminar registros)
CREATE POLICY "Public can delete siniestros"
ON siniestros FOR DELETE
TO public
USING (true);

-- ============================================
-- PASO 6: INSERTAR DATOS DE PRUEBA
-- ============================================

-- Eliminar datos de prueba existentes (si los hay)
DELETE FROM siniestros WHERE numero IN ('2026-001', 'TEST-001');

-- Insertar un registro de prueba
INSERT INTO siniestros (
    numero,
    asegurado,
    sexo,
    telefono,
    fecha,
    tipo,
    estado,
    monto,
    poliza,
    taller,
    observaciones
) VALUES (
    '2026-001',
    'Juan Pérez',
    'M',
    '+595 981 123456',
    '2026-01-09',
    'Colisión',
    'aprobado',
    'Gs. 5.000.000',
    'POL-2024-12345',
    'Taller Central',
    'Siniestro de prueba - Colisión frontal leve'
);

-- ============================================
-- PASO 7: VERIFICAR LA CONFIGURACIÓN
-- ============================================

-- Contar registros en la tabla
SELECT COUNT(*) as total_siniestros FROM siniestros;

-- Mostrar el registro de prueba
SELECT * FROM siniestros WHERE numero = '2026-001';

-- Verificar que RLS está habilitado
SELECT
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'siniestros';

-- Listar todas las políticas activas
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'siniestros';

-- ============================================
-- SCRIPT COMPLETADO
-- ============================================
--
-- Si ves el mensaje "Success. No rows returned" es NORMAL
--
-- Para verificar que todo funcionó:
-- 1. Deberías ver que el SELECT COUNT devuelve al menos 1 registro
-- 2. Deberías ver el registro de prueba de Juan Pérez
-- 3. Deberías ver que rowsecurity = true
-- 4. Deberías ver 4 políticas activas (SELECT, INSERT, UPDATE, DELETE)
--
-- Ahora puedes cerrar este editor SQL y volver a tu aplicación web.
-- Actualiza la página (F5) y deberías ver:
-- - Estado: 🟢 Conectado
-- - El siniestro de prueba en la lista
-- ============================================
