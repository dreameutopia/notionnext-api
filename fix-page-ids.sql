-- ============================================
-- 更新租户的 root_page_id 为前端使用的 Notion Page ID
-- ============================================

-- 技术博客：使用前端配置的第一个 Notion Page ID
UPDATE tenants 
SET root_page_id = '02ab3b8678004aa69e9e415905ef32a5'
WHERE id = 'tenant-tech';

-- 生活博客：使用前端配置的第二个 Notion Page ID (en: 前缀的)
UPDATE tenants 
SET root_page_id = '7c1d570661754c8fbc568e00a01fd70e'
WHERE id = 'tenant-life';

-- 同时更新 blocks 表中对应的根页面 ID
UPDATE blocks
SET id = '02ab3b8678004aa69e9e415905ef32a5'
WHERE id = 'page-root-tech';

UPDATE blocks
SET id = '7c1d570661754c8fbc568e00a01fd70e'
WHERE id = 'page-root-life';

-- 更新 collections 的 parent_id
UPDATE collections
SET parent_id = '02ab3b8678004aa69e9e415905ef32a5'
WHERE parent_id = 'page-root-tech';

UPDATE collections
SET parent_id = '7c1d570661754c8fbc568e00a01fd70e'
WHERE parent_id = 'page-root-life';

-- 验证更新结果
SELECT '=== 租户信息 ===' as info;
SELECT id, subdomain, root_page_id, title FROM tenants;

SELECT '=== 根页面 ===' as info;
SELECT id, tenant_id, type, json_extract(properties, '$.title[0][0]') as title 
FROM blocks 
WHERE id IN ('02ab3b8678004aa69e9e415905ef32a5', '7c1d570661754c8fbc568e00a01fd70e');

SELECT '=== Collections ===' as info;
SELECT id, tenant_id, parent_id, json_extract(name, '$[0][0]') as name
FROM collections;
