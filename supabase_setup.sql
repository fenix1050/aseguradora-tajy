-- ============================================
-- SCRIPT DE CONFIGURACIÓN PARA SUPABASE
-- Aseguradora Tajy - Sistema de Gestión de Siniestros
-- ============================================

-- 1. Crear tabla de siniestros
CREATE TABLE IF NOT EXISTS siniestros (
    id BIGSERIAL PRIMARY KEY,
    numero VARCHAR(50) UNIQUE NOT NULL,
    asegurado VARCHAR(255) NOT NULL,
    sexo VARCHAR(1) CHECK (sexo IN ('M', 'F', '')),
    telefono VARCHAR(50) NOT NULL,
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    tipo VARCHAR(100) NOT NULL,
    estado VARCHAR(50) NOT NULL DEFAULT 'pendiente' 
        CHECK (estado IN ('pendiente', 'proceso', 'aprobado', 'taller', 'rechazado')),
    monto VARCHAR(100),
    poliza VARCHAR(50),
    observaciones TEXT,
    taller VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear índices para mejorar el rendimiento
CREATE INDEX idx_siniestros_numero ON siniestros(numero);
CREATE INDEX idx_siniestros_estado ON siniestros(estado);
CREATE INDEX idx_siniestros_fecha ON siniestros(fecha);
CREATE INDEX idx_siniestros_asegurado ON siniestros(asegurado);

-- 3. Crear función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Crear trigger para actualizar updated_at
CREATE TRIGGER update_siniestros_updated_at
    BEFORE UPDATE ON siniestros
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 5. Habilitar Row Level Security (RLS)
ALTER TABLE siniestros ENABLE ROW LEVEL SECURITY;

-- 6. Crear política para permitir todas las operaciones (puedes ajustar esto según tus necesidades)
-- OPCIÓN A: Acceso público (para desarrollo)
CREATE POLICY "Permitir acceso público a siniestros"
    ON siniestros
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- OPCIÓN B: Solo para usuarios autenticados (descomenta si usas autenticación)
/*
CREATE POLICY "Permitir acceso solo a usuarios autenticados"
    ON siniestros
    FOR ALL
    USING (auth.role() = 'authenticated')
    WITH CHECK (auth.role() = 'authenticated');
*/

-- 7. Insertar datos de ejemplo (opcional - puedes comentar esto después de la primera ejecución)
INSERT INTO siniestros (numero, asegurado, sexo, telefono, fecha, tipo, estado, monto, observaciones) 
VALUES 
    ('2026-001', 'Juan Pérez', 'M', '+595981123456', '2026-01-10', 'Colisión', 'aprobado', 'Gs. 5.000.000', 'Colisión frontal'),
    ('2026-002', 'María González', 'F', '+595981234567', '2026-01-12', 'Cristales', 'pendiente', 'Gs. 800.000', 'Parabrisas roto'),
    ('2026-003', 'Carlos Ramírez', 'M', '+595981345678', '2026-01-14', 'Robo', 'proceso', 'Gs. 15.000.000', 'Robo parcial de autopartes')
ON CONFLICT (numero) DO NOTHING;

-- 8. Crear vista para estadísticas (opcional pero útil)
CREATE OR REPLACE VIEW estadisticas_siniestros AS
SELECT 
    COUNT(*) as total_casos,
    COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE estado = 'aprobado') as aprobados,
    COUNT(*) FILTER (WHERE estado = 'taller') as en_taller,
    COUNT(*) FILTER (WHERE estado = 'proceso') as en_proceso,
    COUNT(*) FILTER (WHERE estado = 'rechazado') as rechazados
FROM siniestros;

-- ============================================
-- NOTAS IMPORTANTES:
-- ============================================
-- 1. Ejecuta este script en el "SQL Editor" de Supabase
-- 2. La política de RLS está configurada para acceso público por defecto
-- 3. Para producción, considera implementar autenticación
-- 4. Los datos de ejemplo se insertarán solo la primera vez
-- ============================================
