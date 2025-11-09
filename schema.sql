-- NotionNext Multi-Tenant Database Schema for Cloudflare D1
-- 兼容 Notion API 的完整数据结构

-- ============================================
-- 1. 租户表 (Tenants)
-- ============================================
CREATE TABLE IF NOT EXISTS tenants (
  id TEXT PRIMARY KEY,
  subdomain TEXT UNIQUE NOT NULL,
  custom_domain TEXT,
  root_page_id TEXT NOT NULL,
  theme TEXT DEFAULT 'heo',
  title TEXT NOT NULL,
  description TEXT,
  author TEXT,
  avatar_url TEXT,
  config TEXT, -- JSON 格式的配置
  status TEXT DEFAULT 'active', -- active, suspended, deleted
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  created_by TEXT,
  storage_used INTEGER DEFAULT 0, -- 存储使用量（字节）
  storage_limit INTEGER DEFAULT 104857600 -- 100MB 限制
);

CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_custom_domain ON tenants(custom_domain);
CREATE INDEX idx_tenants_status ON tenants(status);

-- ============================================
-- 2. 用户表 (Users)
-- ============================================
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'owner', -- owner, editor, viewer
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX idx_users_email ON users(email);

-- ============================================
-- 3. 租户用户关系表
-- ============================================
CREATE TABLE IF NOT EXISTS tenant_users (
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT DEFAULT 'viewer', -- owner, editor, viewer
  created_at INTEGER NOT NULL,
  PRIMARY KEY (tenant_id, user_id),
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_tenant_users_tenant ON tenant_users(tenant_id);
CREATE INDEX idx_tenant_users_user ON tenant_users(user_id);

-- ============================================
-- 4. Blocks 表 (核心内容存储)
-- ============================================
CREATE TABLE IF NOT EXISTS blocks (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  parent_id TEXT,
  parent_table TEXT DEFAULT 'block', -- block, space, collection
  type TEXT NOT NULL, -- page, text, heading_1, heading_2, heading_3, code, image, etc.
  properties TEXT, -- JSON: 富文本和属性
  format TEXT, -- JSON: 格式化信息
  content TEXT, -- JSON: 子块 ID 数组
  version INTEGER DEFAULT 1,
  created_time INTEGER NOT NULL,
  last_edited_time INTEGER NOT NULL,
  created_by TEXT,
  last_edited_by TEXT,
  alive INTEGER DEFAULT 1, -- 1=活跃, 0=已删除
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_blocks_tenant ON blocks(tenant_id);
CREATE INDEX idx_blocks_parent ON blocks(parent_id);
CREATE INDEX idx_blocks_type ON blocks(type);
CREATE INDEX idx_blocks_alive ON blocks(alive);
CREATE INDEX idx_blocks_tenant_parent ON blocks(tenant_id, parent_id);

-- ============================================
-- 5. Collections 表 (数据库/表格)
-- ============================================
CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  parent_id TEXT,
  name TEXT, -- JSON: 富文本格式的名称
  schema TEXT NOT NULL, -- JSON: 字段定义
  icon TEXT,
  cover TEXT,
  description TEXT, -- JSON: 描述
  version INTEGER DEFAULT 1,
  created_time INTEGER NOT NULL,
  last_edited_time INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_collections_tenant ON collections(tenant_id);

-- ============================================
-- 6. Collection Views 表 (视图)
-- ============================================
CREATE TABLE IF NOT EXISTS collection_views (
  id TEXT PRIMARY KEY,
  collection_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  name TEXT,
  type TEXT NOT NULL, -- table, board, gallery, list, calendar, timeline
  format TEXT, -- JSON: 视图配置
  query2 TEXT, -- JSON: 查询/筛选条件
  page_sort TEXT, -- JSON: 排序规则
  version INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_collection_views_collection ON collection_views(collection_id);
CREATE INDEX idx_collection_views_tenant ON collection_views(tenant_id);

-- ============================================
-- 7. Collection Query 表 (查询结果缓存)
-- ============================================
CREATE TABLE IF NOT EXISTS collection_queries (
  collection_id TEXT NOT NULL,
  view_id TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  result_ids TEXT NOT NULL, -- JSON: 查询结果的 block IDs
  aggregations TEXT, -- JSON: 聚合结果
  total INTEGER DEFAULT 0,
  cached_at INTEGER NOT NULL,
  PRIMARY KEY (collection_id, view_id),
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_collection_queries_tenant ON collection_queries(tenant_id);

-- ============================================
-- 8. Space 表 (工作区)
-- ============================================
CREATE TABLE IF NOT EXISTS spaces (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  domain TEXT,
  icon TEXT,
  created_time INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_spaces_tenant ON spaces(tenant_id);

-- ============================================
-- 9. Files 表 (文件/图片元数据)
-- ============================================
CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  block_id TEXT,
  filename TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL, -- R2 存储路径
  url TEXT, -- 访问 URL
  width INTEGER,
  height INTEGER,
  uploaded_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_files_tenant ON files(tenant_id);
CREATE INDEX idx_files_block ON files(block_id);

-- ============================================
-- 10. Activity Log 表 (操作日志)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tenant_id TEXT NOT NULL,
  user_id TEXT,
  action TEXT NOT NULL, -- create, update, delete, view
  resource_type TEXT NOT NULL, -- block, collection, tenant
  resource_id TEXT NOT NULL,
  details TEXT, -- JSON: 详细信息
  ip_address TEXT,
  user_agent TEXT,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE
);

CREATE INDEX idx_activity_logs_tenant ON activity_logs(tenant_id);
CREATE INDEX idx_activity_logs_resource ON activity_logs(resource_type, resource_id);
CREATE INDEX idx_activity_logs_created ON activity_logs(created_at);

-- ============================================
-- 11. API Keys 表 (API 访问密钥)
-- ============================================
CREATE TABLE IF NOT EXISTS api_keys (
  id TEXT PRIMARY KEY,
  tenant_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE, -- SHA-256 hash
  name TEXT NOT NULL,
  permissions TEXT, -- JSON: 权限列表
  last_used_at INTEGER,
  expires_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_api_keys_tenant ON api_keys(tenant_id);
CREATE INDEX idx_api_keys_hash ON api_keys(key_hash);

-- ============================================
-- 初始化默认租户（用于测试）
-- ============================================
INSERT OR IGNORE INTO tenants (
  id, subdomain, root_page_id, theme, title, description, author,
  config, status, created_at, updated_at
) VALUES (
  'default',
  'www',
  'root-page-id',
  'heo',
  'NotionNext Blog',
  'A powerful blog system',
  'NotionNext',
  '{"LANG":"zh-CN","POSTS_PER_PAGE":12}',
  'active',
  strftime('%s', 'now'),
  strftime('%s', 'now')
);

-- ============================================
-- 视图：简化常用查询
-- ============================================

-- 活跃文章视图
CREATE VIEW IF NOT EXISTS view_active_posts AS
SELECT 
  b.id,
  b.tenant_id,
  b.type,
  b.properties,
  b.created_time,
  b.last_edited_time,
  t.subdomain
FROM blocks b
JOIN tenants t ON b.tenant_id = t.id
WHERE b.type = 'page' 
  AND b.alive = 1
  AND t.status = 'active'
  AND json_extract(b.properties, '$.status') = 'Published';

-- 租户统计视图
CREATE VIEW IF NOT EXISTS view_tenant_stats AS
SELECT 
  t.id,
  t.subdomain,
  t.title,
  COUNT(DISTINCT b.id) as total_blocks,
  COUNT(DISTINCT CASE WHEN b.type = 'page' THEN b.id END) as total_pages,
  t.storage_used,
  t.storage_limit,
  t.created_at
FROM tenants t
LEFT JOIN blocks b ON t.id = b.tenant_id AND b.alive = 1
WHERE t.status = 'active'
GROUP BY t.id;
