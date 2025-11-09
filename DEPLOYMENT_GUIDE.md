# 🚀 NotionNext Multi-Tenant Worker 部署指南

## 📋 架构概述

```
前端 (Cloudflare Pages)
  ↓ 请求 Notion Page ID
Worker API (Cloudflare Workers)
  ↓ 查询租户映射
D1 Database
  ↓ 返回数据
构建 Notion RecordMap 格式
  ↓
返回给前端
```

**核心特性：**
✅ 完全抛弃 Notion API  
✅ 所有数据存储在 D1 数据库  
✅ 支持多租户隔离  
✅ 兼容 Notion API 格式  
✅ 零依赖，纯 Worker 实现  

---

## 🔧 部署步骤

### 1. 创建 D1 数据库

在 Cloudflare Dashboard 或命令行：

```bash
# 通过 Dashboard
Workers & Pages → D1 SQL Database → Create database
名称: notionnext-db

# 或通过命令行
wrangler d1 create notionnext-db
```

记录返回的 `database_id`，更新到 `wrangler.toml`：

```toml
[[d1_databases]]
binding = "DB"
database_name = "notionnext-db"
database_id = "your-database-id-here"  # ← 替换这里
```

### 2. 初始化数据库结构

在 D1 Dashboard 的 **Console** 标签中执行：

```bash
# 1. 复制 schema.sql 的全部内容并执行
# 2. 复制 test-data.sql 的全部内容并执行
# 3. 执行 fix-page-ids.sql 更新 Page ID 映射
```

或通过命令行：

```bash
wrangler d1 execute notionnext-db --file=./schema.sql
wrangler d1 execute notionnext-db --file=./test-data.sql
wrangler d1 execute notionnext-db --file=./fix-page-ids.sql
```

### 3. 创建 KV Namespace

```bash
# Dashboard
Workers & Pages → KV → Create namespace
名称: notionnext-cache

# 命令行
wrangler kv:namespace create CACHE
```

更新 `wrangler.toml`:

```toml
[[kv_namespaces]]
binding = "CACHE"
id = "your-kv-id-here"  # ← 替换
```

### 4. 创建 R2 Bucket

```bash
# Dashboard
R2 → Create bucket
名称: notionnext-storage

# 命令行
wrangler r2 bucket create notionnext-storage
```

### 5. 部署 Worker

```bash
# 通过 Git push (推荐)
git push origin main

# 或通过命令行
cd worker
wrangler deploy
```

Cloudflare Pages for Workers 会自动：
1. 检测 GitHub 仓库
2. 读取 `wrangler.toml` 配置
3. 绑定 D1/KV/R2 资源
4. 部署 Worker

### 6. 验证部署

访问 Worker URL：

```bash
# 健康检查
curl https://your-worker.workers.dev/health

# 应返回:
{"status":"ok","timestamp":1699999999999,"version":"1.0.0"}

# 测试租户 API
curl https://your-worker.workers.dev/api/tenants

# 应返回租户列表
```

---

## 📊 数据库结构说明

### 租户映射关系

| 字段 | 说明 | 示例 |
|------|------|------|
| `id` | 内部租户 ID | `tenant-tech` |
| `subdomain` | 子域名 | `tech` |
| `root_page_id` | Notion Page ID | `02ab3b8...` |
| `title` | 博客标题 | `技术博客` |

**关键映射：**
```sql
租户 ID        → Notion Page ID              → 前端配置
tenant-tech   → 02ab3b8678004aa69e9e415905ef32a5 → NOTION_PAGE_ID 第一个
tenant-life   → 7c1d570661754c8fbc568e00a01fd70e → NOTION_PAGE_ID 第二个(en:)
```

### Blocks 表结构

存储所有内容块（页面、文章、段落等）：

```javascript
{
  id: '02ab3b8...',           // Notion 格式的 ID
  tenant_id: 'tenant-tech',   // 所属租户
  type: 'collection_view_page', // 块类型
  properties: '{"title":[["技术博客"]]}', // JSON 格式的属性
  content: '["collection-tech"]',  // 子块 ID 数组
  parent_id: 'space-tech',    // 父块 ID
  parent_table: 'space',      // 父表类型
}
```

### Collections 表结构

存储数据库/表格定义：

```javascript
{
  id: 'collection-tech',
  tenant_id: 'tenant-tech',
  name: '[["技术文章"]]',     // Notion 富文本格式
  schema: '{                   // 字段定义
    "title": {"name":"标题", "type":"title"},
    "status": {"name":"状态", "type":"select", "options":[...]},
    "category": {"name":"分类", "type":"select", "options":[...]}
  }',
  parent_id: '02ab3b8...',    // 关联的根页面
}
```

---

## 🔍 API 端点说明

### 1. Notion API 兼容端点

#### `POST /loadPageChunk` 或 `/api/v3/loadPageChunk`

前端最常用的端点，获取页面数据。

**请求：**
```json
{
  "pageId": "02ab3b8678004aa69e9e415905ef32a5"
}
```

**响应：**
```json
{
  "recordMap": {
    "block": {
      "02ab3b8...": {
        "role": "reader",
        "value": {
          "id": "02ab3b8...",
          "type": "collection_view_page",
          "properties": {"title": [["技术博客"]]},
          "content": ["collection-tech"],
          ...
        }
      },
      "post-tech-001": { ... },
      ...
    },
    "collection": {
      "collection-tech": { ... }
    },
    "collection_view": { ... }
  }
}
```

#### `POST /getBlocks`

批量获取 blocks。

#### `POST /syncRecordValues`

同步记录值（数据库查询）。

#### `POST /queryCollection`

查询 collection（文章列表）。

### 2. 多租户管理 API

#### `GET /api/tenants`

获取所有租户列表。

#### `GET /api/tenants/:tenantId`

获取特定租户详情。

#### `POST /api/tenants`

创建新租户。

---

## 🎯 前端配置

### Cloudflare Pages 环境变量

```bash
# 启用 Worker API
NEXT_PUBLIC_USE_CUSTOM_API=true

# Worker URL
NEXT_PUBLIC_WORKER_API=https://notionnext-api.YOUR_USERNAME.workers.dev

# Notion Page ID (必须与 D1 中的映射一致)
NOTION_PAGE_ID=02ab3b8678004aa69e9e415905ef32a5

# 可选：指定租户
NEXT_PUBLIC_TENANT_ID=tenant-tech
```

### blog.config.js 配置

```javascript
const BLOG = {
  USE_CUSTOM_API: process.env.NEXT_PUBLIC_USE_CUSTOM_API === 'true',
  CUSTOM_API_BASE_URL: process.env.NEXT_PUBLIC_WORKER_API,
  NOTION_PAGE_ID: process.env.NOTION_PAGE_ID,
  // ... 其他配置
}
```

---

## 🔄 数据流程详解

### 1. 前端请求

```javascript
// lib/notion/getNotionAPI.js
const notion = new NotionAPI({
  apiBaseUrl: 'https://your-worker.workers.dev'
});

const page = await notion.getPage('02ab3b8678004aa69e9e415905ef32a5');
```

### 2. Worker 处理

```javascript
// 1. 接收 Notion Page ID
const pageId = '02ab3b8678004aa69e9e415905ef32a5';

// 2. 查询租户映射
const tenant = await DB.prepare(`
  SELECT id FROM tenants WHERE root_page_id = ?
`).bind(pageId).first();
// → { id: 'tenant-tech' }

// 3. 获取页面 blocks
const blocks = await DB.prepare(`
  SELECT * FROM blocks WHERE id = ? AND tenant_id = ?
`).bind(pageId, 'tenant-tech').all();

// 4. 获取关联的 collections
const collections = await DB.prepare(`
  SELECT * FROM collections WHERE parent_id = ?
`).bind(pageId).all();

// 5. 获取 collection 中的所有文章
const articles = await DB.prepare(`
  SELECT * FROM blocks 
  WHERE parent_id = 'collection-tech' 
    AND type = 'page'
    AND tenant_id = 'tenant-tech'
`).all();

// 6. 构建 Notion RecordMap 格式
const recordMap = buildRecordMap({ blocks, collections, articles });

// 7. 返回给前端
return Response.json(recordMap);
```

### 3. 前端渲染

```javascript
// NotionRenderer 组件会解析 recordMap
<NotionRenderer recordMap={recordMap} />
```

---

## 🛠️ 调试技巧

### 1. 查看 Worker 日志

```bash
# Dashboard
Workers & Pages → 选择 Worker → Logs → Real-time Logs

# 命令行
wrangler tail notionnext-api
```

### 2. 测试 D1 查询

在 D1 Console 执行：

```sql
-- 查看所有租户
SELECT * FROM tenants;

-- 查看根页面
SELECT id, tenant_id, type, json_extract(properties, '$.title[0][0]') as title
FROM blocks 
WHERE id IN ('02ab3b8678004aa69e9e415905ef32a5', '7c1d570661754c8fbc568e00a01fd70e');

-- 查看文章列表
SELECT 
  id, 
  tenant_id,
  json_extract(properties, '$.title[0][0]') as title,
  json_extract(properties, '$.category[0][0]') as category
FROM blocks 
WHERE parent_table = 'collection' 
  AND type = 'page'
  AND tenant_id = 'tenant-tech'
ORDER BY created_time DESC;
```

### 3. 测试 API 端点

```bash
# 测试健康检查
curl https://your-worker.workers.dev/health

# 测试获取页面 (注意 Content-Type)
curl -X POST https://your-worker.workers.dev/loadPageChunk \
  -H "Content-Type: application/json" \
  -d '{"pageId":"02ab3b8678004aa69e9e415905ef32a5"}'

# 测试租户 API
curl https://your-worker.workers.dev/api/tenants
```

---

## 📝 添加新租户

### 1. 在 D1 中创建租户

```sql
INSERT INTO tenants (
  id, subdomain, root_page_id, theme, title, 
  description, author, status, created_at, updated_at
) VALUES (
  'tenant-new',
  'new',
  'your-new-notion-page-id',  -- 使用新的 32 位 ID
  'heo',
  '新博客',
  '我的新博客描述',
  'Your Name',
  'active',
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
```

### 2. 创建根页面

```sql
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, 
  properties, format, content, version, 
  created_time, last_edited_time, alive
) VALUES (
  'your-new-notion-page-id',
  'tenant-new',
  'space-new',
  'space',
  'collection_view_page',
  '{"title":[["新博客"]]}',
  '{"page_icon":"📚"}',
  '["collection-new"]',
  1,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000,
  1
);
```

### 3. 创建 Collection

```sql
INSERT INTO collections (
  id, tenant_id, parent_id, name, schema, 
  version, created_time, last_edited_time
) VALUES (
  'collection-new',
  'tenant-new',
  'your-new-notion-page-id',
  '[["文章"]]',
  '{
    "title": {"name":"标题","type":"title"},
    "status": {"name":"状态","type":"select","options":[
      {"id":"pub","value":"Published","color":"green"}
    ]}
  }',
  1,
  strftime('%s', 'now') * 1000,
  strftime('%s', 'now') * 1000
);
```

---

## 🚨 常见问题

### Q: Worker 返回 500 错误
**A:** 检查：
1. D1 数据库是否正确绑定？
2. `fix-page-ids.sql` 是否已执行？
3. Worker 日志中的具体错误信息

### Q: 前端显示"找不到页面"
**A:** 检查：
1. `NOTION_PAGE_ID` 是否与 D1 中的 `root_page_id` 一致？
2. 租户状态是否为 `active`？
3. Blocks 表中是否有对应的根页面记录？

### Q: 文章列表为空
**A:** 检查：
1. `test-data.sql` 是否完整执行？
2. Collection 是否正确关联到根页面？
3. 文章的 `parent_table` 是否为 `'collection'`？

---

## 📈 性能优化建议

### 1. 启用 KV 缓存

```javascript
// 缓存页面数据 1 小时
await env.CACHE.put(
  `page:${pageId}`,
  JSON.stringify(recordMap),
  { expirationTtl: 3600 }
);
```

### 2. 批量查询优化

使用 D1 的 batch API：

```javascript
const results = await env.DB.batch([
  db.prepare('SELECT * FROM blocks WHERE id = ?').bind(pageId),
  db.prepare('SELECT * FROM collections WHERE parent_id = ?').bind(pageId),
]);
```

### 3. 索引优化

确保关键字段有索引（已在 schema.sql 中定义）。

---

## 🎉 完成！

现在你的 NotionNext 已经：
✅ 完全独立于 Notion  
✅ 支持多租户隔离  
✅ 部署在 Cloudflare 边缘网络  
✅ 零成本运行（免费额度内）  

**下一步：**
- 添加管理后台界面
- 实现内容编辑器
- 添加图片上传到 R2
- 集成全文搜索
