-- ============================================
-- MIGRACIÓN: Sistema de Notificaciones de Seguimiento
-- Fecha: 2026-01-25
-- Descripción: Crea tabla para trackear notificaciones de seguimiento
--              con funcionalidad de snooze y marcar como leída
-- ============================================

-- Crear tabla de notificaciones
CREATE TABLE IF NOT EXISTS notificaciones_seguimiento (
    id BIGSERIAL PRIMARY KEY,
    siniestro_id BIGINT REFERENCES siniestros(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    nivel_urgencia VARCHAR(20) NOT NULL CHECK (nivel_urgencia IN ('atencion', 'importante', 'urgente')),
    leida BOOLEAN DEFAULT FALSE,
    snoozed_hasta TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- Constraint para evitar duplicados de notificación activa por siniestro
    UNIQUE(siniestro_id, user_id, nivel_urgencia)
);

-- Crear índices para optimizar queries
CREATE INDEX IF NOT EXISTS idx_notif_user_leida
    ON notificaciones_seguimiento(user_id, leida);

CREATE INDEX IF NOT EXISTS idx_notif_siniestro
    ON notificaciones_seguimiento(siniestro_id);

CREATE INDEX IF NOT EXISTS idx_notif_user_urgencia
    ON notificaciones_seguimiento(user_id, nivel_urgencia);

CREATE INDEX IF NOT EXISTS idx_notif_snoozed
    ON notificaciones_seguimiento(snoozed_hasta)
    WHERE snoozed_hasta IS NOT NULL;

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_notificaciones_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_notificaciones_timestamp ON notificaciones_seguimiento;
CREATE TRIGGER trigger_update_notificaciones_timestamp
    BEFORE UPDATE ON notificaciones_seguimiento
    FOR EACH ROW
    EXECUTE FUNCTION update_notificaciones_timestamp();

-- Habilitar Row Level Security (RLS)
ALTER TABLE notificaciones_seguimiento ENABLE ROW LEVEL SECURITY;

-- Policy: Los usuarios solo pueden ver sus propias notificaciones
DROP POLICY IF EXISTS "Users can only see their own notifications" ON notificaciones_seguimiento;
CREATE POLICY "Users can only see their own notifications"
    ON notificaciones_seguimiento FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden insertar sus propias notificaciones
DROP POLICY IF EXISTS "Users can only insert their own notifications" ON notificaciones_seguimiento;
CREATE POLICY "Users can only insert their own notifications"
    ON notificaciones_seguimiento FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden actualizar sus propias notificaciones
DROP POLICY IF EXISTS "Users can only update their own notifications" ON notificaciones_seguimiento;
CREATE POLICY "Users can only update their own notifications"
    ON notificaciones_seguimiento FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Los usuarios solo pueden eliminar sus propias notificaciones
DROP POLICY IF EXISTS "Users can only delete their own notifications" ON notificaciones_seguimiento;
CREATE POLICY "Users can only delete their own notifications"
    ON notificaciones_seguimiento FOR DELETE
    USING (auth.uid() = user_id);

-- ============================================
-- FUNCIÓN: Sincronizar notificaciones con siniestros
-- ============================================
-- Esta función crea/actualiza notificaciones basadas en el estado de seguimiento de los siniestros

CREATE OR REPLACE FUNCTION sincronizar_notificaciones_seguimiento(p_user_id UUID)
RETURNS TABLE(
    total_creadas BIGINT,
    total_actualizadas BIGINT,
    total_eliminadas BIGINT
) AS $$
DECLARE
    v_creadas BIGINT := 0;
    v_actualizadas BIGINT := 0;
    v_eliminadas BIGINT := 0;
    v_siniestro RECORD;
    v_dias INTEGER;
    v_nivel VARCHAR(20);
BEGIN
    -- Eliminar notificaciones de siniestros que ya no requieren seguimiento
    WITH deleted AS (
        DELETE FROM notificaciones_seguimiento
        WHERE user_id = p_user_id
        AND siniestro_id IN (
            SELECT id FROM siniestros
            WHERE user_id = p_user_id
            AND estado NOT IN ('pendiente', 'proceso')
        )
        RETURNING *
    )
    SELECT COUNT(*) INTO v_eliminadas FROM deleted;

    -- Recorrer siniestros que requieren seguimiento
    FOR v_siniestro IN (
        SELECT
            id,
            fecha,
            estado,
            EXTRACT(DAY FROM NOW() - fecha)::INTEGER AS dias_transcurridos
        FROM siniestros
        WHERE user_id = p_user_id
        AND estado IN ('pendiente', 'proceso')
        AND EXTRACT(DAY FROM NOW() - fecha) >= 3
    ) LOOP
        -- Determinar nivel de urgencia
        v_dias := v_siniestro.dias_transcurridos;

        IF v_dias >= 14 THEN
            v_nivel := 'urgente';
        ELSIF v_dias >= 7 THEN
            v_nivel := 'importante';
        ELSE
            v_nivel := 'atencion';
        END IF;

        -- Verificar si ya existe la notificación
        IF EXISTS (
            SELECT 1 FROM notificaciones_seguimiento
            WHERE siniestro_id = v_siniestro.id
            AND user_id = p_user_id
            AND nivel_urgencia = v_nivel
        ) THEN
            -- Ya existe, actualizar si es necesario
            UPDATE notificaciones_seguimiento
            SET updated_at = NOW()
            WHERE siniestro_id = v_siniestro.id
            AND user_id = p_user_id
            AND nivel_urgencia = v_nivel;

            v_actualizadas := v_actualizadas + 1;
        ELSE
            -- No existe, crear nueva
            INSERT INTO notificaciones_seguimiento (
                siniestro_id,
                user_id,
                nivel_urgencia,
                leida,
                created_at
            ) VALUES (
                v_siniestro.id,
                p_user_id,
                v_nivel,
                FALSE,
                NOW()
            );

            v_creadas := v_creadas + 1;
        END IF;
    END LOOP;

    RETURN QUERY SELECT v_creadas, v_actualizadas, v_eliminadas;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- COMENTARIOS
-- ============================================

COMMENT ON TABLE notificaciones_seguimiento IS
    'Almacena notificaciones de seguimiento para siniestros que requieren atención';

COMMENT ON COLUMN notificaciones_seguimiento.nivel_urgencia IS
    'Nivel de urgencia: atencion (3-6 días), importante (7-13 días), urgente (14+ días)';

COMMENT ON COLUMN notificaciones_seguimiento.leida IS
    'Indica si el usuario ya vio la notificación';

COMMENT ON COLUMN notificaciones_seguimiento.snoozed_hasta IS
    'Fecha hasta la cual la notificación está pospuesta (snooze). NULL si no está pospuesta';

COMMENT ON FUNCTION sincronizar_notificaciones_seguimiento IS
    'Sincroniza notificaciones con el estado actual de los siniestros. Llamar periódicamente.';

-- ============================================
-- DATOS DE PRUEBA (Opcional - comentar en producción)
-- ============================================

-- Nota: Para generar notificaciones iniciales, ejecutar:
-- SELECT * FROM sincronizar_notificaciones_seguimiento(auth.uid());

-- ============================================
-- FIN DE MIGRACIÓN
-- ============================================
