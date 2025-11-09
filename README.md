# Cloudflare Worker API 部署指南

## 前置要求

1. Cloudflare 账号
2. Node.js 18+
3. Wrangler CLI

## 安装依赖

```bash
cd worker
npm install
```

## 初始化数据库

### 1. 创建 D1 数据库

```bash
# 生产环境
wrangler d1 create notionnext-db

# 开发环境
wrangler d1 create notionnext-db-dev
```

复制输出的 `database_id`，更新 `wrangler.toml` 中的对应字段。

### 2. 初始化数据库架构

```bash
# 生产环境
wrangler d1 execute notionnext-db --file=./schema.sql

# 开发环境
wrangler d1 execute notionnext-db-dev --file=./schema.sql
```

### 3. 创建 KV 命名空间（用于缓存）

```bash
wrangler kv:namespace create CACHE
wrangler kv:namespace create CACHE --preview
```

更新 `wrangler.toml` 中的 KV ID。

### 4. 创建 R2 存储桶（用于文件存储）

```bash
wrangler r2 bucket create notionnext-storage
```

## 本地开发

```bash
npm run dev
```

API 将在 http://localhost:8787 启动

## 测试 API

### 创建租户

```bash
curl -X POST http://localhost:8787/api/tenants \
  -H "Content-Type: application/json" \
  -d '{
    "subdomain": "myblog",
    "title": "My Blog",
    "description": "My personal blog",
    "author": "Your Name",
    "theme": "heo"
  }'
```

### 获取租户

```bash
curl http://localhost:8787/api/tenants/by-subdomain/myblog
```

### 测试 Notion API 端点

```bash
curl -X POST http://localhost:8787/getPage \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: myblog" \
  -d '{"pageId": "root-page-id"}'
```

## 从 Notion 导入数据

```bash
curl -X POST http://localhost:8787/api/import/notion \
  -H "Content-Type: application/json" \
  -d '{
    "tenant_id": "租户ID",
    "notion_page_id": "Notion页面ID",
    "notion_token": "token_v2值（可选）"
  }'
```

## 部署到生产环境

```bash
# 部署
npm run deploy

# 部署到开发环境
npm run deploy:dev
```

## 查看日志

```bash
wrangler tail
```

## 管理数据库

### 查询数据

```bash
wrangler d1 execute notionnext-db --command="SELECT * FROM tenants"
```

### 备份数据

```bash
wrangler d1 export notionnext-db --output=backup.sql
```

## API 端点文档

### Notion API 兼容端点

- `POST /getPage` - 获取页面数据
- `POST /getBlocks` - 批量获取 blocks
- `POST /syncRecordValues` - 同步记录值
- `POST /queryCollection` - 查询数据库
- `POST /getUsers` - 获取用户信息

### 租户管理 API

- `GET /api/tenants` - 列出租户
- `POST /api/tenants` - 创建租户
- `GET /api/tenants/:id` - 获取租户详情
- `PUT /api/tenants/:id` - 更新租户
- `DELETE /api/tenants/:id` - 删除租户
- `GET /api/tenants/by-subdomain/:subdomain` - 根据子域名获取
- `GET /api/tenants/by-domain/:domain` - 根据域名获取

### 内容管理 API

- `POST /api/blocks` - 创建 block
- `GET /api/blocks/:id` - 获取 block
- `PUT /api/blocks/:id` - 更新 block
- `DELETE /api/blocks/:id` - 删除 block
- `GET /api/blocks/tenant/:tenantId` - 列出租户的 blocks

### 文件管理

- `POST /api/upload` - 上传文件
- `GET /api/files/:id` - 获取文件

## 环境变量

在 Cloudflare Dashboard 中设置：

- `ENVIRONMENT` - 环境标识 (production/development)
- `API_VERSION` - API 版本号

## 域名配置

### 子域名配置

在 Cloudflare DNS 中添加：

```
*.yourdomain.com  CNAME  worker.yourdomain.com
```

### 自定义域名

租户可以配置自定义域名，在 DNS 中添加 CNAME 记录指向你的 Worker。

## 性能优化

1. **缓存策略**：使用 KV 缓存频繁访问的数据
2. **批量查询**：尽量使用批量查询减少数据库往返
3. **索引优化**：确保常用查询字段已建立索引
4. **连接限制**：D1 默认限制 1000 个连接

## 安全建议

1. 启用 API Key 认证
2. 实施速率限制
3. 验证所有输入
4. 使用 HTTPS
5. 定期备份数据

## 故障排查

### Worker 无法启动

检查 wrangler.toml 配置是否正确，特别是 database_id 和 binding 名称。

### 数据库连接失败

确保已经创建并初始化了 D1 数据库。

### CORS 错误

检查 response.js 中的 CORS 头部配置。

## 监控

在 Cloudflare Dashboard 中查看：

- Worker 请求量
- 错误率
- 响应时间
- D1 数据库使用量
