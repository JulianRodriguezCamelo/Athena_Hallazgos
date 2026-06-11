-- Migración: Normalizar vicepresidencia de tecnología
-- Unifica todas las variantes que contengan "tecnolog" en usuarios y hallazgos

BEGIN;

-- 1. Usuarios
UPDATE users
SET vicepresidencia = 'VICEPRESIDENCIA DE TECNOLOGIA E INFORMACION'
WHERE UPPER(vicepresidencia) LIKE '%TECNOLOG%';

-- 2. Hallazgos
UPDATE hallazgos
SET vicepresidencia = 'VICEPRESIDENCIA DE TECNOLOGIA E INFORMACION'
WHERE UPPER(vicepresidencia) LIKE '%TECNOLOG%';

COMMIT;

-- Verificar resultados
SELECT 'usuarios' AS tabla, vicepresidencia, COUNT(*) AS total
FROM users
WHERE UPPER(vicepresidencia) LIKE '%TECNOLOG%'
GROUP BY vicepresidencia

UNION ALL

SELECT 'hallazgos' AS tabla, vicepresidencia, COUNT(*) AS total
FROM hallazgos
WHERE UPPER(vicepresidencia) LIKE '%TECNOLOG%'
GROUP BY vicepresidencia

ORDER BY tabla, total DESC;
