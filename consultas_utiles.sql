-- ============================================
-- CONSULTAS SQL ÚTILES PARA SUPABASE
-- Aseguradora Tajy - Sistema de Gestión
-- ============================================

-- ============================================
-- CONSULTAS DE LECTURA (SELECT)
-- ============================================

-- 1. Ver todos los siniestros ordenados por fecha (más recientes primero)
SELECT * FROM siniestros ORDER BY fecha DESC;

-- 2. Contar siniestros por estado
SELECT 
    estado,
    COUNT(*) as cantidad
FROM siniestros
GROUP BY estado
ORDER BY cantidad DESC;

-- 3. Ver siniestros pendientes
SELECT * FROM siniestros WHERE estado = 'pendiente';

-- 4. Buscar siniestros por nombre de asegurado
SELECT * FROM siniestros WHERE asegurado ILIKE '%Juan%';

-- 5. Ver siniestros de un rango de fechas
SELECT * FROM siniestros 
WHERE fecha BETWEEN '2026-01-01' AND '2026-01-31';

-- 6. Ver estadísticas resumidas
SELECT * FROM estadisticas_siniestros;

-- 7. Siniestros aprobados pero no en taller
SELECT * FROM siniestros 
WHERE estado = 'aprobado' AND (taller IS NULL OR taller = '');

-- 8. Buscar por número de siniestro
SELECT * FROM siniestros WHERE numero = '2026-001';

-- 9. Ver siniestros con monto específico
SELECT * FROM siniestros 
WHERE monto ILIKE '%5.000.000%';

-- 10. Últimos 10 siniestros creados
SELECT * FROM siniestros 
ORDER BY created_at DESC 
LIMIT 10;

-- ============================================
-- CONSULTAS DE ACTUALIZACIÓN (UPDATE)
-- ============================================

-- 11. Cambiar estado de un siniestro
UPDATE siniestros 
SET estado = 'aprobado' 
WHERE numero = '2026-001';

-- 12. Asignar taller a un siniestro
UPDATE siniestros 
SET taller = 'Taller Central', estado = 'taller' 
WHERE numero = '2026-001';

-- 13. Actualizar monto de un siniestro
UPDATE siniestros 
SET monto = 'Gs. 8.500.000' 
WHERE id = 1;

-- 14. Agregar observaciones
UPDATE siniestros 
SET observaciones = 'Cliente contactado el 15/01/2026' 
WHERE numero = '2026-002';

-- 15. Marcar siniestros como rechazados
UPDATE siniestros 
SET estado = 'rechazado' 
WHERE numero IN ('2026-005', '2026-006');

-- ============================================
-- CONSULTAS DE ELIMINACIÓN (DELETE)
-- ============================================

-- 16. Eliminar un siniestro específico (¡CUIDADO!)
DELETE FROM siniestros WHERE numero = '2026-999';

-- 17. Eliminar siniestros rechazados antiguos
DELETE FROM siniestros 
WHERE estado = 'rechazado' 
AND fecha < '2025-01-01';

-- ============================================
-- CONSULTAS AVANZADAS
-- ============================================

-- 18. Ver siniestros agrupados por tipo
SELECT 
    tipo,
    COUNT(*) as cantidad,
    AVG(CAST(REPLACE(REPLACE(monto, 'Gs. ', ''), '.', '') AS NUMERIC)) as promedio_estimado
FROM siniestros
WHERE monto LIKE 'Gs.%'
GROUP BY tipo;

-- 19. Siniestros por mes
SELECT 
    TO_CHAR(fecha, 'YYYY-MM') as mes,
    COUNT(*) as cantidad
FROM siniestros
GROUP BY TO_CHAR(fecha, 'YYYY-MM')
ORDER BY mes DESC;

-- 20. Búsqueda de texto completo
SELECT * FROM siniestros
WHERE 
    asegurado ILIKE '%García%' OR
    observaciones ILIKE '%García%' OR
    numero ILIKE '%García%';

-- 21. Siniestros sin resolver (pendientes o en proceso) de hace más de 15 días
SELECT 
    *,
    CURRENT_DATE - fecha as dias_transcurridos
FROM siniestros
WHERE estado IN ('pendiente', 'proceso')
AND fecha < CURRENT_DATE - INTERVAL '15 days'
ORDER BY fecha ASC;

-- 22. Estadísticas por sexo de asegurado
SELECT 
    CASE 
        WHEN sexo = 'M' THEN 'Masculino'
        WHEN sexo = 'F' THEN 'Femenino'
        ELSE 'No especificado'
    END as sexo_asegurado,
    COUNT(*) as cantidad
FROM siniestros
GROUP BY sexo;

-- ============================================
-- MANTENIMIENTO DE LA BASE DE DATOS
-- ============================================

-- 23. Ver tamaño de la tabla
SELECT 
    pg_size_pretty(pg_total_relation_size('siniestros')) as tamaño_total;

-- 24. Contar todos los registros
SELECT COUNT(*) as total_siniestros FROM siniestros;

-- 25. Ver campos únicos (números de siniestro)
SELECT COUNT(DISTINCT numero) as siniestros_unicos FROM siniestros;

-- 26. Verificar registros duplicados por número
SELECT numero, COUNT(*) as duplicados
FROM siniestros
GROUP BY numero
HAVING COUNT(*) > 1;

-- 27. Últimas actualizaciones
SELECT * FROM siniestros 
ORDER BY updated_at DESC 
LIMIT 5;

-- ============================================
-- RESPALDO Y LIMPIEZA
-- ============================================

-- 28. Crear tabla de respaldo
CREATE TABLE siniestros_backup AS 
SELECT * FROM siniestros;

-- 29. Restaurar desde respaldo
INSERT INTO siniestros 
SELECT * FROM siniestros_backup 
WHERE numero NOT IN (SELECT numero FROM siniestros);

-- 30. Limpiar datos de prueba (¡CUIDADO!)
-- DELETE FROM siniestros WHERE observaciones ILIKE '%prueba%';

-- ============================================
-- ÍNDICES Y RENDIMIENTO
-- ============================================

-- 31. Verificar índices existentes
SELECT 
    tablename,
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'siniestros';

-- 32. Crear índice personalizado (si es necesario)
-- CREATE INDEX idx_siniestros_custom ON siniestros(campo1, campo2);

-- 33. Análisis de tabla para optimización
ANALYZE siniestros;

-- ============================================
-- CONSULTAS DE REPORTES
-- ============================================

-- 34. Reporte mensual completo
SELECT 
    TO_CHAR(fecha, 'Month YYYY') as periodo,
    COUNT(*) as total_casos,
    COUNT(*) FILTER (WHERE estado = 'pendiente') as pendientes,
    COUNT(*) FILTER (WHERE estado = 'aprobado') as aprobados,
    COUNT(*) FILTER (WHERE estado = 'rechazado') as rechazados
FROM siniestros
WHERE fecha >= DATE_TRUNC('month', CURRENT_DATE)
GROUP BY TO_CHAR(fecha, 'Month YYYY');

-- 35. Siniestros por tipo y estado
SELECT 
    tipo,
    estado,
    COUNT(*) as cantidad
FROM siniestros
GROUP BY tipo, estado
ORDER BY tipo, estado;

-- 36. Top 5 asegurados con más siniestros
SELECT 
    asegurado,
    COUNT(*) as total_siniestros,
    STRING_AGG(numero, ', ') as numeros_siniestros
FROM siniestros
GROUP BY asegurado
ORDER BY COUNT(*) DESC
LIMIT 5;

-- ============================================
-- EXPORTAR DATOS
-- ============================================

-- 37. Preparar datos para exportar (CSV)
SELECT 
    numero,
    asegurado,
    telefono,
    TO_CHAR(fecha, 'DD/MM/YYYY') as fecha,
    tipo,
    estado,
    monto,
    observaciones
FROM siniestros
ORDER BY fecha DESC;

-- ============================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ============================================

-- 38. Ver políticas actuales
SELECT * FROM pg_policies WHERE tablename = 'siniestros';

-- 39. Habilitar RLS (si está deshabilitado)
-- ALTER TABLE siniestros ENABLE ROW LEVEL SECURITY;

-- 40. Crear política para usuarios autenticados
/*
CREATE POLICY "Usuarios autenticados pueden ver todo"
ON siniestros
FOR SELECT
USING (auth.role() = 'authenticated');
*/

-- ============================================
-- TRIGGERS Y FUNCIONES
-- ============================================

-- 41. Ver función de actualización automática
SELECT 
    routine_name,
    routine_definition
FROM information_schema.routines
WHERE routine_name = 'update_updated_at_column';

-- 42. Ver triggers activos
SELECT 
    trigger_name,
    event_manipulation,
    event_object_table
FROM information_schema.triggers
WHERE event_object_table = 'siniestros';

-- ============================================
-- NOTAS IMPORTANTES
-- ============================================
/*
⚠️ PRECAUCIONES:
1. Siempre haz un respaldo antes de ejecutar DELETE o UPDATE masivo
2. Usa WHERE en tus consultas para evitar cambios accidentales
3. Prueba las consultas en un entorno de desarrollo primero
4. Las consultas con ILIKE son case-insensitive pero más lentas

💡 TIPS:
- Usa LIMIT para limitar resultados y mejorar rendimiento
- Los índices aceleran las búsquedas pero ocupan espacio
- ANALYZE actualiza las estadísticas para mejor rendimiento
- Usa transacciones para cambios múltiples relacionados

📊 ANÁLISIS:
- Revisa regularmente las estadísticas
- Monitorea el crecimiento de la base de datos
- Limpia datos antiguos periódicamente
- Optimiza consultas lentas

🔒 SEGURIDAD:
- Nunca expongas la service_role key
- Usa políticas RLS en producción
- Implementa autenticación para usuarios
- Audita accesos regularmente
*/

-- ============================================
-- FIN DEL ARCHIVO
-- ============================================
