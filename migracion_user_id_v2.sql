-- ============================================
-- MIGRACIÓN V2: AISLAMIENTO TOTAL POR USUARIO
-- Sistema de Gestión de Siniestros - Aseguradora Tajy
-- ============================================
--
-- CAMBIO: El admin ahora también tiene su lista aislada.
-- El rol admin solo aplica para gestión de usuarios, no para ver siniestros de otros.
--
-- INSTRUCCIONES:
-- 1. Ve a tu proyecto en Supabase
-- 2. SQL Editor → New Query
-- 3. Copia y ejecuta este script
-- ============================================

-- ============================================
-- PASO 1: ELIMINAR FUNCIÓN is_admin (YA NO SE USA)
-- ============================================

DROP FUNCTION IF EXISTS is_admin();

-- ============================================
-- PASO 2: ELIMINAR POLÍTICAS ANTERIORES
-- ============================================

DROP POLICY IF EXISTS "Users can view own siniestros" ON siniestros;
DROP POLICY IF EXISTS "Users can insert own siniestros" ON siniestros;
DROP POLICY IF EXISTS "Users can update own siniestros" ON siniestros;
DROP POLICY IF EXISTS "Users can delete own siniestros" ON siniestros;

-- ============================================
-- PASO 3: NUEVAS POLÍTICAS (SIN EXCEPCIONES DE ADMIN)
-- ============================================

-- SELECT: Cada usuario solo ve sus propios siniestros
CREATE POLICY "Users can view own siniestros"
ON siniestros FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- INSERT: Usuario solo puede crear con su propio user_id
CREATE POLICY "Users can insert own siniestros"
ON siniestros FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- UPDATE: Usuario solo puede editar sus propios siniestros
CREATE POLICY "Users can update own siniestros"
ON siniestros FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- DELETE: Usuario solo puede eliminar sus propios siniestros
CREATE POLICY "Users can delete own siniestros"
ON siniestros FOR DELETE
TO authenticated
USING (user_id = auth.uid());

-- ============================================
-- PASO 4: VERIFICAR
-- ============================================

SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'siniestros';

-- ============================================
-- NOTA SOBRE DATOS LEGACY (user_id = NULL)
-- ============================================
-- Los siniestros existentes con user_id = NULL ya no serán visibles
-- para ningún usuario. Si necesitas asignarlos a un usuario:
--
-- UPDATE siniestros SET user_id = 'UUID-DEL-USUARIO' WHERE user_id IS NULL;
--
-- ============================================
