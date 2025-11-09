/**
 * 租户管理 API 处理器
 */

import { errorResponse, successResponse } from '../utils/response';
import { nanoid } from 'nanoid';

/**
 * 列出所有租户
 * GET /api/tenants
 */
async function list(request, env) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'active';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    const result = await env.DB.prepare(`
      SELECT * FROM tenants 
      WHERE status = ?
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `).bind(status, limit, offset).all();

    const total = await env.DB.prepare(`
      SELECT COUNT(*) as count FROM tenants WHERE status = ?
    `).bind(status).first();

    return successResponse({
      tenants: result.results || [],
      total: total?.count || 0,
      limit,
      offset,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 获取单个租户
 * GET /api/tenants/:tenantId
 */
async function get(request, env) {
  try {
    const { tenantId } = request.params;

    const tenant = await env.DB.prepare(`
      SELECT * FROM tenants WHERE id = ?
    `).bind(tenantId).first();

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    // 获取统计信息
    const stats = await env.DB.prepare(`
      SELECT 
        COUNT(*) as total_blocks,
        COUNT(CASE WHEN type = 'page' THEN 1 END) as total_pages
      FROM blocks 
      WHERE tenant_id = ? AND alive = 1
    `).bind(tenantId).first();

    return successResponse({
      ...tenant,
      config: tenant.config ? JSON.parse(tenant.config) : {},
      stats,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 根据子域名获取租户
 * GET /api/tenants/by-subdomain/:subdomain
 */
async function getBySubdomain(request, env) {
  try {
    const { subdomain } = request.params;

    const tenant = await env.DB.prepare(`
      SELECT * FROM tenants WHERE subdomain = ? AND status = 'active'
    `).bind(subdomain).first();

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    return successResponse({
      ...tenant,
      config: tenant.config ? JSON.parse(tenant.config) : {},
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 根据自定义域名获取租户
 * GET /api/tenants/by-domain/:domain
 */
async function getByDomain(request, env) {
  try {
    const { domain } = request.params;

    const tenant = await env.DB.prepare(`
      SELECT * FROM tenants WHERE custom_domain = ? AND status = 'active'
    `).bind(domain).first();

    if (!tenant) {
      return errorResponse('Tenant not found', 404);
    }

    return successResponse({
      ...tenant,
      config: tenant.config ? JSON.parse(tenant.config) : {},
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 创建租户
 * POST /api/tenants
 * Body: { subdomain, title, theme, config, ... }
 */
async function create(request, env) {
  try {
    const body = await request.json();
    const {
      subdomain,
      custom_domain,
      title,
      description,
      author,
      theme = 'heo',
      config = {},
    } = body;

    // 验证必填字段
    if (!subdomain || !title) {
      return errorResponse('subdomain and title are required', 400);
    }

    // 验证子域名格式
    if (!/^[a-z0-9-]+$/.test(subdomain)) {
      return errorResponse('Invalid subdomain format', 400);
    }

    // 检查子域名是否已存在
    const existing = await env.DB.prepare(`
      SELECT id FROM tenants WHERE subdomain = ?
    `).bind(subdomain).first();

    if (existing) {
      return errorResponse('Subdomain already exists', 409);
    }

    // 生成 ID
    const tenantId = nanoid();
    const rootPageId = nanoid();
    const collectionId = nanoid();
    const now = Date.now();

    // 创建租户
    await env.DB.prepare(`
      INSERT INTO tenants (
        id, subdomain, custom_domain, root_page_id, theme, title, 
        description, author, config, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenantId,
      subdomain,
      custom_domain || null,
      rootPageId,
      theme,
      title,
      description || '',
      author || 'Author',
      JSON.stringify(config),
      'active',
      now,
      now
    ).run();

    // 创建根页面（collection_view_page）
    await env.DB.prepare(`
      INSERT INTO blocks (
        id, tenant_id, parent_id, parent_table, type, 
        properties, content, created_time, last_edited_time, alive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      rootPageId,
      tenantId,
      null,
      'space',
      'collection_view_page',
      JSON.stringify({ title: [[title]] }),
      JSON.stringify([collectionId]),
      now,
      now,
      1
    ).run();

    // 创建默认 collection（博客数据库）
    await env.DB.prepare(`
      INSERT INTO collections (
        id, tenant_id, parent_id, name, schema, 
        created_time, last_edited_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      collectionId,
      tenantId,
      rootPageId,
      JSON.stringify([[title]]),
      JSON.stringify(getDefaultSchema()),
      now,
      now
    ).run();

    // 创建示例文章
    const examplePostId = nanoid();
    await env.DB.prepare(`
      INSERT INTO blocks (
        id, tenant_id, parent_id, parent_table, type, 
        properties, content, created_time, last_edited_time, alive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      examplePostId,
      tenantId,
      collectionId,
      'collection',
      'page',
      JSON.stringify({
        title: [['欢迎使用 NotionNext']],
        status: [['Published']],
        type: [['Post']],
        slug: [['welcome']],
        date: [[new Date().toISOString()]],
      }),
      JSON.stringify([]),
      now,
      now,
      1
    ).run();

    return successResponse({
      id: tenantId,
      subdomain,
      root_page_id: rootPageId,
      title,
      message: 'Tenant created successfully',
    }, 201);
  } catch (error) {
    console.error('Create tenant error:', error);
    return errorResponse(error.message, 500);
  }
}

/**
 * 更新租户
 * PUT /api/tenants/:tenantId
 */
async function update(request, env) {
  try {
    const { tenantId } = request.params;
    const body = await request.json();

    // 检查租户是否存在
    const existing = await env.DB.prepare(`
      SELECT id FROM tenants WHERE id = ?
    `).bind(tenantId).first();

    if (!existing) {
      return errorResponse('Tenant not found', 404);
    }

    // 构建更新语句
    const updates = [];
    const values = [];

    const allowedFields = [
      'title', 'description', 'author', 'theme', 
      'custom_domain', 'avatar_url', 'status'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        updates.push(`${field} = ?`);
        values.push(body[field]);
      }
    }

    if (body.config) {
      updates.push('config = ?');
      values.push(JSON.stringify(body.config));
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('updated_at = ?');
    values.push(Date.now());
    values.push(tenantId);

    await env.DB.prepare(`
      UPDATE tenants 
      SET ${updates.join(', ')}
      WHERE id = ?
    `).bind(...values).run();

    return successResponse({ message: 'Tenant updated successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 删除租户（软删除）
 * DELETE /api/tenants/:tenantId
 */
async function deleteTenant(request, env) {
  try {
    const { tenantId } = request.params;

    const result = await env.DB.prepare(`
      UPDATE tenants SET status = 'deleted', updated_at = ? WHERE id = ?
    `).bind(Date.now(), tenantId).run();

    if (result.meta.changes === 0) {
      return errorResponse('Tenant not found', 404);
    }

    return successResponse({ message: 'Tenant deleted successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 默认的数据库 schema
 */
function getDefaultSchema() {
  return {
    title: { name: 'Name', type: 'title' },
    status: { 
      name: 'Status', 
      type: 'select',
      options: [
        { id: 'pub', value: 'Published', color: 'green' },
        { id: 'draft', value: 'Draft', color: 'yellow' },
        { id: 'inv', value: 'Invisible', color: 'red' },
      ]
    },
    type: { 
      name: 'Type', 
      type: 'select',
      options: [
        { id: 'post', value: 'Post', color: 'blue' },
        { id: 'page', value: 'Page', color: 'purple' },
        { id: 'notice', value: 'Notice', color: 'orange' },
      ]
    },
    slug: { name: 'Slug', type: 'text' },
    date: { name: 'Date', type: 'date' },
    tags: { name: 'Tags', type: 'multi_select' },
    category: { name: 'Category', type: 'select' },
    summary: { name: 'Summary', type: 'text' },
    password: { name: 'Password', type: 'text' },
  };
}

export const handleTenantAPI = {
  list,
  get,
  getBySubdomain,
  getByDomain,
  create,
  update,
  delete: deleteTenant,
};
