-- ============================================
-- 添加 Notion Page ID 映射
-- 让 Worker 能够识别前端传递的 Notion Page ID
-- ============================================

-- 更新租户表，添加前端使用的 Notion Page ID
UPDATE tenants 
SET root_page_id = '02ab3b8678004aa69e9e415905ef32a5'
WHERE id = 'tenant-tech';

UPDATE tenants 
SET root_page_id = '7c1d570661754c8fbc568e00a01fd70e'
WHERE id = 'tenant-life';

-- 验证更新
SELECT id, subdomain, root_page_id, title FROM tenants;
