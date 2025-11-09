-- ============================================
-- NotionNext 测试数据
-- 包含 2 个租户、10 篇文章、多个分类和标签
-- ============================================

-- 清理现有数据（可选）
-- DELETE FROM blocks;
-- DELETE FROM collections;
-- DELETE FROM tenants;
-- DELETE FROM users;

-- ============================================
-- 1. 创建用户
-- ============================================

INSERT INTO users (id, email, name, avatar_url, role, created_at, updated_at) VALUES
('user-001', 'alice@example.com', 'Alice Wang', 'https://i.pravatar.cc/150?img=1', 'owner', 1699600000000, 1699600000000),
('user-002', 'bob@example.com', 'Bob Zhang', 'https://i.pravatar.cc/150?img=2', 'owner', 1699600000000, 1699600000000);

-- ============================================
-- 2. 创建租户（2个博客）
-- ============================================

-- 租户 1: 技术博客
INSERT INTO tenants (
  id, subdomain, custom_domain, root_page_id, theme, title, 
  description, author, avatar_url, config, status, 
  created_at, updated_at, created_by, storage_used, storage_limit
) VALUES (
  'tenant-tech',
  'tech',
  NULL,
  'page-root-tech',
  'heo',
  '技术博客',
  '分享技术干货和编程经验',
  'Alice Wang',
  'https://i.pravatar.cc/150?img=1',
  '{"LANG":"zh-CN","POSTS_PER_PAGE":12,"POST_LIST_STYLE":"page","ANALYTICS_GOOGLE_ID":"","ENABLE_RSS":true}',
  'active',
  1699600000000,
  1699600000000,
  'user-001',
  0,
  104857600
);

-- 租户 2: 生活博客
INSERT INTO tenants (
  id, subdomain, custom_domain, root_page_id, theme, title, 
  description, author, avatar_url, config, status, 
  created_at, updated_at, created_by, storage_used, storage_limit
) VALUES (
  'tenant-life',
  'life',
  NULL,
  'page-root-life',
  'gitbook',
  '生活随笔',
  '记录生活点滴，分享美好瞬间',
  'Bob Zhang',
  'https://i.pravatar.cc/150?img=2',
  '{"LANG":"zh-CN","POSTS_PER_PAGE":10,"POST_LIST_STYLE":"scroll","ENABLE_RSS":true}',
  'active',
  1699600000000,
  1699600000000,
  'user-002',
  0,
  104857600
);

-- 租户用户关系
INSERT INTO tenant_users (tenant_id, user_id, role, created_at) VALUES
('tenant-tech', 'user-001', 'owner', 1699600000000),
('tenant-life', 'user-002', 'owner', 1699600000000);

-- ============================================
-- 3. 创建 Spaces
-- ============================================

INSERT INTO spaces (id, tenant_id, name, domain, icon, created_time) VALUES
('space-tech', 'tenant-tech', '技术博客工作区', 'tech.example.com', '💻', 1699600000000),
('space-life', 'tenant-life', '生活博客工作区', 'life.example.com', '🌈', 1699600000000);

-- ============================================
-- 4. 创建 Collections（数据库）
-- ============================================

-- Collection 1: 技术博客数据库
INSERT INTO collections (
  id, tenant_id, parent_id, name, schema, icon, cover, 
  description, version, created_time, last_edited_time
) VALUES (
  'collection-tech',
  'tenant-tech',
  'page-root-tech',
  '[["技术文章"]]',
  '{
    "title": {"name": "标题", "type": "title"},
    "status": {
      "name": "状态",
      "type": "select",
      "options": [
        {"id": "pub", "value": "Published", "color": "green"},
        {"id": "draft", "value": "Draft", "color": "yellow"}
      ]
    },
    "type": {
      "name": "类型",
      "type": "select",
      "options": [
        {"id": "post", "value": "Post", "color": "blue"},
        {"id": "page", "value": "Page", "color": "purple"}
      ]
    },
    "category": {
      "name": "分类",
      "type": "select",
      "options": [
        {"id": "cat1", "value": "前端开发", "color": "blue"},
        {"id": "cat2", "value": "后端开发", "color": "green"},
        {"id": "cat3", "value": "DevOps", "color": "orange"}
      ]
    },
    "tags": {
      "name": "标签",
      "type": "multi_select",
      "options": [
        {"id": "tag1", "value": "JavaScript", "color": "yellow"},
        {"id": "tag2", "value": "React", "color": "blue"},
        {"id": "tag3", "value": "Node.js", "color": "green"},
        {"id": "tag4", "value": "TypeScript", "color": "blue"},
        {"id": "tag5", "value": "Docker", "color": "purple"}
      ]
    },
    "date": {"name": "发布日期", "type": "date"},
    "slug": {"name": "路径", "type": "text"},
    "summary": {"name": "摘要", "type": "text"}
  }',
  '📚',
  'https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800',
  '[["技术文章数据库"]]',
  1,
  1699600000000,
  1699600000000
);

-- Collection 2: 生活博客数据库
INSERT INTO collections (
  id, tenant_id, parent_id, name, schema, icon, cover, 
  description, version, created_time, last_edited_time
) VALUES (
  'collection-life',
  'tenant-life',
  'page-root-life',
  '[["生活文章"]]',
  '{
    "title": {"name": "标题", "type": "title"},
    "status": {
      "name": "状态",
      "type": "select",
      "options": [
        {"id": "pub", "value": "Published", "color": "green"},
        {"id": "draft", "value": "Draft", "color": "yellow"}
      ]
    },
    "type": {
      "name": "类型",
      "type": "select",
      "options": [
        {"id": "post", "value": "Post", "color": "pink"}
      ]
    },
    "category": {
      "name": "分类",
      "type": "select",
      "options": [
        {"id": "cat1", "value": "旅行", "color": "blue"},
        {"id": "cat2", "value": "美食", "color": "red"},
        {"id": "cat3", "value": "阅读", "color": "green"}
      ]
    },
    "tags": {
      "name": "标签",
      "type": "multi_select",
      "options": [
        {"id": "tag1", "value": "旅游攻略", "color": "blue"},
        {"id": "tag2", "value": "美食推荐", "color": "red"},
        {"id": "tag3", "value": "读书笔记", "color": "green"}
      ]
    },
    "date": {"name": "发布日期", "type": "date"},
    "slug": {"name": "路径", "type": "text"},
    "summary": {"name": "摘要", "type": "text"}
  }',
  '✨',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
  '[["生活文章数据库"]]',
  1,
  1699600000000,
  1699600000000
);

-- ============================================
-- 5. 创建根页面
-- ============================================

-- 技术博客根页面
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'page-root-tech',
  'tenant-tech',
  'space-tech',
  'space',
  'collection_view_page',
  '{"title": [["技术博客"]]}',
  '{"page_icon": "💻", "page_cover": "https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=1200"}',
  '["collection-tech"]',
  1,
  1699600000000,
  1699600000000,
  'user-001',
  'user-001',
  1
);

-- 生活博客根页面
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'page-root-life',
  'tenant-life',
  'space-life',
  'space',
  'collection_view_page',
  '{"title": [["生活随笔"]]}',
  '{"page_icon": "🌈", "page_cover": "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1200"}',
  '["collection-life"]',
  1,
  1699600000000,
  1699600000000,
  'user-002',
  'user-002',
  1
);

-- ============================================
-- 6. 创建文章（技术博客 - 6篇）
-- ============================================

-- 文章 1: React 入门指南
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-tech-001',
  'tenant-tech',
  'collection-tech',
  'collection',
  'page',
  '{
    "title": [["React 入门指南：从零开始学习"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["前端开发"]],
    "tags": [["React"], ["JavaScript"]],
    "date": [["2024-10-15"]],
    "slug": [["react-beginner-guide"]],
    "summary": [["本文将带你从零开始学习 React，了解组件、状态管理和生命周期等核心概念。"]]
  }',
  '{"page_icon": "⚛️", "page_cover": "https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800"}',
  '["block-tech-001-1", "block-tech-001-2"]',
  1,
  1697328000000,
  1697328000000,
  'user-001',
  'user-001',
  1
);

-- 文章 1 的内容块
INSERT INTO blocks (id, tenant_id, parent_id, parent_table, type, properties, content, created_time, last_edited_time, alive) VALUES
('block-tech-001-1', 'tenant-tech', 'post-tech-001', 'block', 'heading_1', '{"title": [["什么是 React?"]]}', '[]', 1697328000000, 1697328000000, 1),
('block-tech-001-2', 'tenant-tech', 'post-tech-001', 'block', 'text', '{"title": [["React 是一个用于构建用户界面的 JavaScript 库。它采用组件化的开发方式，让代码更加模块化和可复用。"]]}', '[]', 1697328000000, 1697328000000, 1);

-- 文章 2: Node.js 性能优化
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-tech-002',
  'tenant-tech',
  'collection-tech',
  'collection',
  'page',
  '{
    "title": [["Node.js 性能优化实战"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["后端开发"]],
    "tags": [["Node.js"], ["性能优化"]],
    "date": [["2024-10-20"]],
    "slug": [["nodejs-performance"]],
    "summary": [["探讨 Node.js 应用的性能优化技巧，包括异步处理、缓存策略和集群模式。"]]
  }',
  '{"page_icon": "🚀", "page_cover": "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800"}',
  '[]',
  1,
  1697760000000,
  1697760000000,
  'user-001',
  'user-001',
  1
);

-- 文章 3: TypeScript 最佳实践
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-tech-003',
  'tenant-tech',
  'collection-tech',
  'collection',
  'page',
  '{
    "title": [["TypeScript 最佳实践 2024"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["前端开发"]],
    "tags": [["TypeScript"], ["JavaScript"]],
    "date": [["2024-10-25"]],
    "slug": [["typescript-best-practices"]],
    "summary": [["总结 TypeScript 开发中的最佳实践，帮助你写出更安全、更优雅的代码。"]]
  }',
  '{"page_icon": "📘", "page_cover": "https://images.unsplash.com/photo-1516116216624-53e697fedbea?w=800"}',
  '[]',
  1,
  1698192000000,
  1698192000000,
  'user-001',
  'user-001',
  1
);

-- 文章 4: Docker 容器化部署
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-tech-004',
  'tenant-tech',
  'collection-tech',
  'collection',
  'page',
  '{
    "title": [["Docker 容器化部署完全指南"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["DevOps"]],
    "tags": [["Docker"], ["容器化"]],
    "date": [["2024-11-01"]],
    "slug": [["docker-deployment-guide"]],
    "summary": [["从基础到进阶，全面讲解 Docker 容器化部署的核心概念和实战技巧。"]]
  }',
  '{"page_icon": "🐳", "page_cover": "https://images.unsplash.com/photo-1605745341112-85968b19335b?w=800"}',
  '[]',
  1,
  1698624000000,
  1698624000000,
  'user-001',
  'user-001',
  1
);

-- 文章 5: 前端工程化实践
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-tech-005',
  'tenant-tech',
  'collection-tech',
  'collection',
  'page',
  '{
    "title": [["前端工程化实践与思考"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["前端开发"]],
    "tags": [["工程化"], ["Webpack"]],
    "date": [["2024-11-05"]],
    "slug": [["frontend-engineering"]],
    "summary": [["探讨前端工程化的核心价值，分享构建工具、代码规范和持续集成的实践经验。"]]
  }',
  '{"page_icon": "🛠️", "page_cover": "https://images.unsplash.com/photo-1461749280684-dccba630e2f6?w=800"}',
  '[]',
  1,
  1699056000000,
  1699056000000,
  'user-001',
  'user-001',
  1
);

-- 文章 6: 微服务架构设计
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-tech-006',
  'tenant-tech',
  'collection-tech',
  'collection',
  'page',
  '{
    "title": [["微服务架构设计原则与实践"]],
    "status": [["Draft"]],
    "type": [["Post"]],
    "category": [["后端开发"]],
    "tags": [["微服务"], ["架构设计"]],
    "date": [["2024-11-10"]],
    "slug": [["microservices-architecture"]],
    "summary": [["深入探讨微服务架构的设计原则，包括服务拆分、通信机制和数据一致性。"]]
  }',
  '{"page_icon": "🏗️", "page_cover": "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800"}',
  '[]',
  1,
  1699488000000,
  1699488000000,
  'user-001',
  'user-001',
  1
);

-- ============================================
-- 7. 创建文章（生活博客 - 4篇）
-- ============================================

-- 文章 1: 京都旅行攻略
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-life-001',
  'tenant-life',
  'collection-life',
  'collection',
  'page',
  '{
    "title": [["京都秋日三日游攻略"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["旅行"]],
    "tags": [["旅游攻略"], ["日本"]],
    "date": [["2024-10-18"]],
    "slug": [["kyoto-autumn-travel"]],
    "summary": [["记录在京都的三天旅程，从清水寺到岚山，感受秋日的古都之美。"]]
  }',
  '{"page_icon": "🍁", "page_cover": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?w=800"}',
  '[]',
  1,
  1697587200000,
  1697587200000,
  'user-002',
  'user-002',
  1
);

-- 文章 2: 咖啡馆探店
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-life-002',
  'tenant-life',
  'collection-life',
  'collection',
  'page',
  '{
    "title": [["上海小众咖啡馆探店指南"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["美食"]],
    "tags": [["美食推荐"], ["咖啡"]],
    "date": [["2024-10-22"]],
    "slug": [["shanghai-coffee-shops"]],
    "summary": [["分享几家上海小众但很有特色的咖啡馆，适合周末放松和阅读。"]]
  }',
  '{"page_icon": "☕", "page_cover": "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800"}',
  '[]',
  1,
  1697932800000,
  1697932800000,
  'user-002',
  'user-002',
  1
);

-- 文章 3: 读书笔记
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-life-003',
  'tenant-life',
  'collection-life',
  'collection',
  'page',
  '{
    "title": [["《百年孤独》读书笔记"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["阅读"]],
    "tags": [["读书笔记"], ["文学"]],
    "date": [["2024-10-28"]],
    "slug": [["one-hundred-years-of-solitude"]],
    "summary": [["读完《百年孤独》的一些感悟，关于孤独、家族和时间的思考。"]]
  }',
  '{"page_icon": "📖", "page_cover": "https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800"}',
  '[]',
  1,
  1698364800000,
  1698364800000,
  'user-002',
  'user-002',
  1
);

-- 文章 4: 家常菜谱
INSERT INTO blocks (
  id, tenant_id, parent_id, parent_table, type, properties, 
  format, content, version, created_time, last_edited_time, 
  created_by, last_edited_by, alive
) VALUES (
  'post-life-004',
  'tenant-life',
  'collection-life',
  'collection',
  'page',
  '{
    "title": [["周末在家做的几道家常菜"]],
    "status": [["Published"]],
    "type": [["Post"]],
    "category": [["美食"]],
    "tags": [["美食推荐"], ["家常菜"]],
    "date": [["2024-11-03"]],
    "slug": [["homemade-dishes"]],
    "summary": [["分享几道简单易做的家常菜，适合周末在家尝试。"]]
  }',
  '{"page_icon": "🍳", "page_cover": "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800"}',
  '[]',
  1,
  1698796800000,
  1698796800000,
  'user-002',
  'user-002',
  1
);

-- ============================================
-- 8. 创建 Collection Views
-- ============================================

INSERT INTO collection_views (
  id, collection_id, tenant_id, name, type, format, 
  query2, page_sort, version, created_at
) VALUES
('view-tech-table', 'collection-tech', 'tenant-tech', '表格视图', 'table', '{}', '{}', '[["date", "descending"]]', 1, 1699600000000),
('view-life-list', 'collection-life', 'tenant-life', '列表视图', 'list', '{}', '{}', '[["date", "descending"]]', 1, 1699600000000);

-- ============================================
-- 9. 创建 Collection Queries（查询缓存）
-- ============================================

INSERT INTO collection_queries (collection_id, view_id, tenant_id, result_ids, aggregations, total, cached_at) VALUES
(
  'collection-tech',
  'view-tech-table',
  'tenant-tech',
  '["post-tech-001","post-tech-002","post-tech-003","post-tech-004","post-tech-005","post-tech-006"]',
  '{}',
  6,
  1699600000000
),
(
  'collection-life',
  'view-life-list',
  'tenant-life',
  '["post-life-001","post-life-002","post-life-003","post-life-004"]',
  '{}',
  4,
  1699600000000
);

-- ============================================
-- 10. 创建活动日志（示例）
-- ============================================

INSERT INTO activity_logs (tenant_id, user_id, action, resource_type, resource_id, details, ip_address, user_agent, created_at) VALUES
('tenant-tech', 'user-001', 'create', 'block', 'post-tech-001', '{"title":"React 入门指南"}', '192.168.1.1', 'Mozilla/5.0', 1697328000000),
('tenant-tech', 'user-001', 'create', 'block', 'post-tech-002', '{"title":"Node.js 性能优化"}', '192.168.1.1', 'Mozilla/5.0', 1697760000000),
('tenant-life', 'user-002', 'create', 'block', 'post-life-001', '{"title":"京都秋日三日游"}', '192.168.1.2', 'Mozilla/5.0', 1697587200000),
('tenant-life', 'user-002', 'create', 'block', 'post-life-002', '{"title":"上海小众咖啡馆"}', '192.168.1.2', 'Mozilla/5.0', 1697932800000);

-- ============================================
-- 完成！
-- ============================================

-- 查询验证
SELECT '租户数量:' as info, COUNT(*) as count FROM tenants
UNION ALL
SELECT '用户数量:', COUNT(*) FROM users
UNION ALL
SELECT '文章数量:', COUNT(*) FROM blocks WHERE type = 'page' AND parent_table = 'collection'
UNION ALL
SELECT '技术博客文章:', COUNT(*) FROM blocks WHERE tenant_id = 'tenant-tech' AND type = 'page'
UNION ALL
SELECT '生活博客文章:', COUNT(*) FROM blocks WHERE tenant_id = 'tenant-life' AND type = 'page';
