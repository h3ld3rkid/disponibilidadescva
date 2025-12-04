-- Fix incorrect month values (2025-13 should be 2026-01)
UPDATE schedules 
SET month = '2026-01' 
WHERE month = '2025-13';