/**
 * NotionNext API Worker - 主入口文件
 * 提供完整的 Notion API 兼容端点 + 多租户管理 API
 */

import { Router } from 'itty-router';
import { handleNotionAPI } from './handlers/notion-api';
import { handleTenantAPI } from './handlers/tenant-api';
import { handleContentAPI } from './handlers/content-api';
import { corsHeaders, errorResponse, successResponse } from './utils/response';
import { tenantMiddleware } from './middleware/tenant';
import { logActivity } from './utils/logger';

const router = Router();

/**
 * CORS 预检请求处理
 */
router.options('*', () => {
  return new Response(null, { headers: corsHeaders });
});

/**
 * 健康检查端点
 */
router.get('/health', () => {
  return successResponse({ status: 'ok', timestamp: Date.now() });
});

/**
 * ============================================
 * Notion API 兼容端点（完全兼容现有调用）
 * ============================================
 */

// 获取页面数据（包含所有 blocks）
router.post('/api/v3/getPage', handleNotionAPI.getPage);
router.post('/getPage', handleNotionAPI.getPage);

// 批量获取 blocks
router.post('/api/v3/getBlocks', handleNotionAPI.getBlocks);
router.post('/getBlocks', handleNotionAPI.getBlocks);

// 同步记录值（查询数据库）
router.post('/api/v3/syncRecordValues', handleNotionAPI.syncRecordValues);
router.post('/syncRecordValues', handleNotionAPI.syncRecordValues);

// 查询集合（数据库查询）
router.post('/api/v3/queryCollection', handleNotionAPI.queryCollection);
router.post('/queryCollection', handleNotionAPI.queryCollection);

// 获取用户信息
router.post('/api/v3/getUsers', handleNotionAPI.getUsers);
router.post('/getUsers', handleNotionAPI.getUsers);

/**
 * ============================================
 * 多租户管理 API
 * ============================================
 */

// 租户 CRUD
router.get('/api/tenants', handleTenantAPI.list);
router.get('/api/tenants/:tenantId', handleTenantAPI.get);
router.post('/api/tenants', handleTenantAPI.create);
router.put('/api/tenants/:tenantId', handleTenantAPI.update);
router.delete('/api/tenants/:tenantId', handleTenantAPI.delete);

// 根据子域名获取租户
router.get('/api/tenants/by-subdomain/:subdomain', handleTenantAPI.getBySubdomain);

// 根据自定义域名获取租户
router.get('/api/tenants/by-domain/:domain', handleTenantAPI.getByDomain);

/**
 * ============================================
 * 内容管理 API（用于后台管理）
 * ============================================
 */

// Blocks 管理
router.post('/api/blocks', handleContentAPI.createBlock);
router.get('/api/blocks/:blockId', handleContentAPI.getBlock);
router.put('/api/blocks/:blockId', handleContentAPI.updateBlock);
router.delete('/api/blocks/:blockId', handleContentAPI.deleteBlock);
router.get('/api/blocks/tenant/:tenantId', handleContentAPI.listBlocks);

// Collections 管理
router.post('/api/collections', handleContentAPI.createCollection);
router.get('/api/collections/:collectionId', handleContentAPI.getCollection);
router.put('/api/collections/:collectionId', handleContentAPI.updateCollection);
router.delete('/api/collections/:collectionId', handleContentAPI.deleteCollection);

// 批量导入
router.post('/api/import/notion', handleContentAPI.importFromNotion);

/**
 * ============================================
 * 文件上传 API
 * ============================================
 */
router.post('/api/upload', async (request, env) => {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const tenantId = formData.get('tenantId');

    if (!file || !tenantId) {
      return errorResponse('Missing file or tenantId', 400);
    }

    // 上传到 R2
    const fileId = crypto.randomUUID();
    const key = `${tenantId}/${fileId}/${file.name}`;
    
    await env.STORAGE.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type,
      },
    });

    // 记录到数据库
    await env.DB.prepare(`
      INSERT INTO files (id, tenant_id, filename, mime_type, size, r2_key, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      fileId,
      tenantId,
      file.name,
      file.type,
      file.size,
      key,
      Date.now()
    ).run();

    return successResponse({
      id: fileId,
      url: `/api/files/${fileId}`,
      size: file.size,
      mimeType: file.type,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});

// 文件访问
router.get('/api/files/:fileId', async (request, env) => {
  try {
    const { fileId } = request.params;

    const file = await env.DB.prepare(`
      SELECT * FROM files WHERE id = ?
    `).bind(fileId).first();

    if (!file) {
      return errorResponse('File not found', 404);
    }

    const object = await env.STORAGE.get(file.r2_key);
    
    if (!object) {
      return errorResponse('File not found in storage', 404);
    }

    return new Response(object.body, {
      headers: {
        'Content-Type': file.mime_type,
        'Cache-Control': 'public, max-age=31536000',
      },
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
});

/**
 * 404 处理
 */
router.all('*', () => {
  return errorResponse('Not Found', 404);
});

/**
 * Worker 主入口
 */
export default {
  async fetch(request, env, ctx) {
    try {
      // 记录请求日志
      const url = new URL(request.url);
      console.log(`[${request.method}] ${url.pathname}`);

      // 路由处理
      return await router.handle(request, env, ctx);
    } catch (error) {
      console.error('Worker error:', error);
      return errorResponse(error.message, 500);
    }
  },
};
