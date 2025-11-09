/**
 * Notion API 处理器
 * 将数据库数据转换为 Notion API 格式
 */

import { errorResponse, successResponse } from '../utils/response';
import { getTenantFromRequest } from '../utils/tenant';
import { buildRecordMap } from '../utils/notion-format';

/**
 * 获取页面数据（核心端点）
 * POST /getPage 或 /loadPageChunk
 * Body: { pageId: string } 或 { page: { id: string } }
 */
async function getPage(request, env) {
  try {
    const body = await request.json();
    
    // 支持多种请求格式
    let pageId = body.pageId || body.page?.id || body.id;
    
    if (!pageId) {
      return errorResponse('pageId is required', 400);
    }

    console.log('[Worker] getPage called with pageId:', pageId);

    // 获取租户信息
    let tenantId = await getTenantFromRequest(request, env);
    console.log('[Worker] Initial tenantId:', tenantId);
    
    // 如果 pageId 是 Notion 格式的 ID，尝试从租户表查找映射
    if (pageId.length === 32 && !/^page-/.test(pageId)) {
      console.log('[Worker] Detecting Notion Page ID format, looking for tenant mapping...');
      
      const tenant = await env.DB.prepare(`
        SELECT id, root_page_id FROM tenants 
        WHERE root_page_id = ? OR id = ?
        ORDER BY 
          CASE WHEN root_page_id = ? THEN 0 ELSE 1 END
        LIMIT 1
      `).bind(pageId, pageId, pageId).first();
      
      if (tenant) {
        tenantId = tenant.id;
        pageId = tenant.root_page_id;
        console.log('[Worker] Found tenant mapping:', { tenantId, pageId });
      } else {
        // 如果找不到映射，使用默认租户
        console.log('[Worker] No tenant mapping found, using default tenant');
        const defaultTenant = await env.DB.prepare(`
          SELECT id, root_page_id FROM tenants 
          WHERE status = 'active' 
          ORDER BY created_at ASC
          LIMIT 1
        `).first();
        
        if (defaultTenant) {
          tenantId = defaultTenant.id;
          pageId = defaultTenant.root_page_id;
          console.log('[Worker] Using default tenant:', { tenantId, pageId });
        }
      }
    }

    // 从数据库获取页面及其所有子块
    const blocks = await fetchPageBlocks(env.DB, pageId, tenantId);
    
    console.log('[Worker] Fetched blocks count:', blocks.length);
    
    if (blocks.length === 0) {
      console.error('[Worker] No blocks found for pageId:', pageId, 'tenantId:', tenantId);
      return errorResponse('Page not found', 404);
    }

    // 获取相关的 collections
    const collections = await fetchPageCollections(env.DB, pageId, tenantId);
    console.log('[Worker] Fetched collections count:', collections.length);
    
    // 获取 collection views
    const collectionViews = await fetchCollectionViews(env.DB, collections.map(c => c.id), tenantId);
    console.log('[Worker] Fetched collection views count:', collectionViews.length);
    
    // 如果是 collection_view_page，需要获取 collection 的所有文章
    const mainBlock = blocks[0];
    if (mainBlock && mainBlock.type === 'collection_view_page') {
      const collectionIds = JSON.parse(mainBlock.content || '[]');
      console.log('[Worker] Collection page detected, collection IDs:', collectionIds);
      
      // 获取所有文章
      for (const collectionId of collectionIds) {
        const articles = await fetchCollectionArticles(env.DB, collectionId, tenantId);
        console.log(`[Worker] Fetched ${articles.length} articles for collection:`, collectionId);
        blocks.push(...articles);
        
        // 递归获取文章内容
        for (const article of articles) {
          const articleBlocks = await fetchPageBlocks(env.DB, article.id, tenantId, 5, 1);
          blocks.push(...articleBlocks);
        }
      }
    }
    
    // 构建 Notion RecordMap 格式
    const recordMap = buildRecordMap({
      blocks,
      collections,
      collectionViews,
    });

    console.log('[Worker] Built recordMap with', Object.keys(recordMap.block).length, 'blocks');

    return new Response(JSON.stringify(recordMap), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Worker] getPage error:', error);
    return errorResponse(error.message, 500);
  }
}

/**
 * 批量获取 blocks
 * POST /getBlocks
 * Body: { blockIds: string[] }
 */
async function getBlocks(request, env) {
  try {
    const body = await request.json();
    const blockIds = body.blockIds || body.blocks || [];

    if (!Array.isArray(blockIds) || blockIds.length === 0) {
      return errorResponse('blockIds array is required', 400);
    }

    const tenantId = await getTenantFromRequest(request, env);

    // 批量查询 blocks
    const placeholders = blockIds.map(() => '?').join(',');
    const query = `
      SELECT * FROM blocks 
      WHERE id IN (${placeholders}) 
        AND tenant_id = ? 
        AND alive = 1
    `;

    const blocks = await env.DB.prepare(query)
      .bind(...blockIds, tenantId)
      .all();

    const recordMap = buildRecordMap({
      blocks: blocks.results || [],
      collections: [],
      collectionViews: [],
    });

    return new Response(JSON.stringify(recordMap), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('getBlocks error:', error);
    return errorResponse(error.message, 500);
  }
}

/**
 * 同步记录值（查询 collection 数据）
 * POST /syncRecordValues
 */
async function syncRecordValues(request, env) {
  try {
    const body = await request.json();
    const { requests = [] } = body;

    const tenantId = await getTenantFromRequest(request, env);

    const results = [];

    for (const req of requests) {
      const { id, table } = req;
      
      if (table === 'block') {
        const block = await env.DB.prepare(`
          SELECT * FROM blocks WHERE id = ? AND tenant_id = ? AND alive = 1
        `).bind(id, tenantId).first();
        
        if (block) {
          results.push({
            role: 'reader',
            value: formatBlock(block),
          });
        }
      } else if (table === 'collection') {
        const collection = await env.DB.prepare(`
          SELECT * FROM collections WHERE id = ? AND tenant_id = ?
        `).bind(id, tenantId).first();
        
        if (collection) {
          results.push({
            role: 'reader',
            value: formatCollection(collection),
          });
        }
      }
    }

    return new Response(JSON.stringify({ recordMap: { block: {}, collection: {} }, results }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('syncRecordValues error:', error);
    return errorResponse(error.message, 500);
  }
}

/**
 * 查询 collection（数据库查询）
 * POST /queryCollection
 */
async function queryCollection(request, env) {
  try {
    const body = await request.json();
    const { collectionId, collectionViewId, query = {} } = body;

    const tenantId = await getTenantFromRequest(request, env);

    // 获取 collection
    const collection = await env.DB.prepare(`
      SELECT * FROM collections WHERE id = ? AND tenant_id = ?
    `).bind(collectionId, tenantId).first();

    if (!collection) {
      return errorResponse('Collection not found', 404);
    }

    // 获取该 collection 下的所有 blocks（文章）
    const blocks = await env.DB.prepare(`
      SELECT * FROM blocks 
      WHERE parent_id = ? 
        AND tenant_id = ? 
        AND alive = 1
      ORDER BY last_edited_time DESC
    `).bind(collectionId, tenantId).all();

    // 构建查询结果
    const blockIds = (blocks.results || []).map(b => b.id);

    // 缓存查询结果
    await env.DB.prepare(`
      INSERT OR REPLACE INTO collection_queries 
      (collection_id, view_id, tenant_id, result_ids, total, cached_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).bind(
      collectionId,
      collectionViewId || 'default',
      tenantId,
      JSON.stringify(blockIds),
      blockIds.length,
      Date.now()
    ).run();

    const recordMap = buildRecordMap({
      blocks: blocks.results || [],
      collections: [collection],
      collectionViews: [],
    });

    return new Response(JSON.stringify({
      recordMap,
      result: {
        type: 'table',
        blockIds,
        aggregationResults: [],
        total: blockIds.length,
      },
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('queryCollection error:', error);
    return errorResponse(error.message, 500);
  }
}

/**
 * 获取用户信息
 * POST /getUsers
 */
async function getUsers(request, env) {
  try {
    const { userIds = [] } = await request.json();

    const users = {};
    
    // 返回模拟用户数据
    for (const userId of userIds) {
      users[userId] = {
        role: 'reader',
        value: {
          id: userId,
          version: 1,
          email: 'user@notionnext.com',
          given_name: 'User',
          family_name: 'Name',
          profile_photo: '',
        },
      };
    }

    return new Response(JSON.stringify({ recordMap: { notion_user: users } }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 获取 collection 中的所有文章
 */
async function fetchCollectionArticles(db, collectionId, tenantId) {
  const result = await db.prepare(`
    SELECT * FROM blocks 
    WHERE parent_id = ? 
      AND parent_table = 'collection'
      AND tenant_id = ? 
      AND alive = 1
      AND type = 'page'
    ORDER BY created_time DESC
  `).bind(collectionId, tenantId).all();

  return result.results || [];
}

/**
 * 递归获取页面的所有子块
 */
async function fetchPageBlocks(db, pageId, tenantId, maxDepth = 10, depth = 0) {
  if (depth >= maxDepth) return [];

  // 获取当前块
  const currentBlock = await db.prepare(`
    SELECT * FROM blocks WHERE id = ? AND tenant_id = ? AND alive = 1
  `).bind(pageId, tenantId).first();

  if (!currentBlock) return [];

  const blocks = [currentBlock];

  // 获取子块
  const content = currentBlock.content ? JSON.parse(currentBlock.content) : [];
  
  for (const childId of content) {
    const childBlocks = await fetchPageBlocks(db, childId, tenantId, maxDepth, depth + 1);
    blocks.push(...childBlocks);
  }

  return blocks;
}

/**
 * 获取页面相关的 collections
 */
async function fetchPageCollections(db, pageId, tenantId) {
  const result = await db.prepare(`
    SELECT DISTINCT c.* FROM collections c
    JOIN blocks b ON b.parent_id = c.id
    WHERE b.id = ? AND b.tenant_id = ?
  `).bind(pageId, tenantId).all();

  return result.results || [];
}

/**
 * 获取 collection views
 */
async function fetchCollectionViews(db, collectionIds, tenantId) {
  if (collectionIds.length === 0) return [];

  const placeholders = collectionIds.map(() => '?').join(',');
  const result = await db.prepare(`
    SELECT * FROM collection_views 
    WHERE collection_id IN (${placeholders}) AND tenant_id = ?
  `).bind(...collectionIds, tenantId).all();

  return result.results || [];
}

/**
 * 格式化 block 为 Notion 格式
 */
function formatBlock(block) {
  return {
    id: block.id,
    version: block.version,
    type: block.type,
    properties: block.properties ? JSON.parse(block.properties) : {},
    format: block.format ? JSON.parse(block.format) : {},
    content: block.content ? JSON.parse(block.content) : [],
    parent_id: block.parent_id,
    parent_table: block.parent_table,
    created_time: block.created_time,
    last_edited_time: block.last_edited_time,
    created_by_id: block.created_by,
    last_edited_by_id: block.last_edited_by,
    alive: block.alive === 1,
  };
}

/**
 * 格式化 collection 为 Notion 格式
 */
function formatCollection(collection) {
  return {
    id: collection.id,
    version: collection.version,
    name: collection.name ? JSON.parse(collection.name) : [['Untitled']],
    schema: collection.schema ? JSON.parse(collection.schema) : {},
    icon: collection.icon,
    cover: collection.cover,
    description: collection.description ? JSON.parse(collection.description) : [],
    parent_id: collection.parent_id,
    parent_table: 'block',
  };
}

export const handleNotionAPI = {
  getPage,
  getBlocks,
  syncRecordValues,
  queryCollection,
  getUsers,
};
