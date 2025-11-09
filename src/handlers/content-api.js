/**
 * 内容管理 API 处理器
 * 用于后台管理系统的 CRUD 操作
 */

import { errorResponse, successResponse } from '../utils/response';
import { nanoid } from 'nanoid';

/**
 * 创建 Block
 * POST /api/blocks
 */
async function createBlock(request, env) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      parent_id,
      parent_table = 'block',
      type,
      properties = {},
      format = {},
      content = [],
    } = body;

    if (!tenant_id || !type) {
      return errorResponse('tenant_id and type are required', 400);
    }

    const blockId = nanoid();
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO blocks (
        id, tenant_id, parent_id, parent_table, type,
        properties, format, content,
        created_time, last_edited_time, alive
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      blockId,
      tenant_id,
      parent_id,
      parent_table,
      type,
      JSON.stringify(properties),
      JSON.stringify(format),
      JSON.stringify(content),
      now,
      now,
      1
    ).run();

    return successResponse({ id: blockId, created_at: now }, 201);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 获取 Block
 * GET /api/blocks/:blockId
 */
async function getBlock(request, env) {
  try {
    const { blockId } = request.params;

    const block = await env.DB.prepare(`
      SELECT * FROM blocks WHERE id = ? AND alive = 1
    `).bind(blockId).first();

    if (!block) {
      return errorResponse('Block not found', 404);
    }

    return successResponse({
      ...block,
      properties: block.properties ? JSON.parse(block.properties) : {},
      format: block.format ? JSON.parse(block.format) : {},
      content: block.content ? JSON.parse(block.content) : [],
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 更新 Block
 * PUT /api/blocks/:blockId
 */
async function updateBlock(request, env) {
  try {
    const { blockId } = request.params;
    const body = await request.json();

    const existing = await env.DB.prepare(`
      SELECT id FROM blocks WHERE id = ? AND alive = 1
    `).bind(blockId).first();

    if (!existing) {
      return errorResponse('Block not found', 404);
    }

    const updates = [];
    const values = [];

    if (body.properties) {
      updates.push('properties = ?');
      values.push(JSON.stringify(body.properties));
    }
    if (body.format) {
      updates.push('format = ?');
      values.push(JSON.stringify(body.format));
    }
    if (body.content) {
      updates.push('content = ?');
      values.push(JSON.stringify(body.content));
    }
    if (body.type) {
      updates.push('type = ?');
      values.push(body.type);
    }

    updates.push('last_edited_time = ?');
    values.push(Date.now());
    values.push(blockId);

    await env.DB.prepare(`
      UPDATE blocks SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return successResponse({ message: 'Block updated successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 删除 Block（软删除）
 * DELETE /api/blocks/:blockId
 */
async function deleteBlock(request, env) {
  try {
    const { blockId } = request.params;

    const result = await env.DB.prepare(`
      UPDATE blocks SET alive = 0, last_edited_time = ? WHERE id = ?
    `).bind(Date.now(), blockId).run();

    if (result.meta.changes === 0) {
      return errorResponse('Block not found', 404);
    }

    return successResponse({ message: 'Block deleted successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 列出租户的所有 Blocks
 * GET /api/blocks/tenant/:tenantId
 */
async function listBlocks(request, env) {
  try {
    const { tenantId } = request.params;
    const url = new URL(request.url);
    const type = url.searchParams.get('type');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = `
      SELECT * FROM blocks 
      WHERE tenant_id = ? AND alive = 1
    `;
    const bindings = [tenantId];

    if (type) {
      query += ' AND type = ?';
      bindings.push(type);
    }

    query += ' ORDER BY last_edited_time DESC LIMIT ? OFFSET ?';
    bindings.push(limit, offset);

    const result = await env.DB.prepare(query).bind(...bindings).all();

    return successResponse({
      blocks: (result.results || []).map(block => ({
        ...block,
        properties: block.properties ? JSON.parse(block.properties) : {},
        format: block.format ? JSON.parse(block.format) : {},
        content: block.content ? JSON.parse(block.content) : [],
      })),
      limit,
      offset,
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 创建 Collection
 * POST /api/collections
 */
async function createCollection(request, env) {
  try {
    const body = await request.json();
    const {
      tenant_id,
      parent_id,
      name,
      schema,
      icon,
      cover,
    } = body;

    if (!tenant_id || !name || !schema) {
      return errorResponse('tenant_id, name, and schema are required', 400);
    }

    const collectionId = nanoid();
    const now = Date.now();

    await env.DB.prepare(`
      INSERT INTO collections (
        id, tenant_id, parent_id, name, schema, icon, cover,
        created_time, last_edited_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      collectionId,
      tenant_id,
      parent_id,
      JSON.stringify(name),
      JSON.stringify(schema),
      icon,
      cover,
      now,
      now
    ).run();

    return successResponse({ id: collectionId, created_at: now }, 201);
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 获取 Collection
 * GET /api/collections/:collectionId
 */
async function getCollection(request, env) {
  try {
    const { collectionId } = request.params;

    const collection = await env.DB.prepare(`
      SELECT * FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!collection) {
      return errorResponse('Collection not found', 404);
    }

    // 获取该 collection 下的所有 pages
    const pages = await env.DB.prepare(`
      SELECT * FROM blocks 
      WHERE parent_id = ? AND type = 'page' AND alive = 1
      ORDER BY last_edited_time DESC
    `).bind(collectionId).all();

    return successResponse({
      ...collection,
      name: collection.name ? JSON.parse(collection.name) : [],
      schema: collection.schema ? JSON.parse(collection.schema) : {},
      pages: (pages.results || []).map(page => ({
        ...page,
        properties: page.properties ? JSON.parse(page.properties) : {},
      })),
    });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 更新 Collection
 * PUT /api/collections/:collectionId
 */
async function updateCollection(request, env) {
  try {
    const { collectionId } = request.params;
    const body = await request.json();

    const existing = await env.DB.prepare(`
      SELECT id FROM collections WHERE id = ?
    `).bind(collectionId).first();

    if (!existing) {
      return errorResponse('Collection not found', 404);
    }

    const updates = [];
    const values = [];

    if (body.name) {
      updates.push('name = ?');
      values.push(JSON.stringify(body.name));
    }
    if (body.schema) {
      updates.push('schema = ?');
      values.push(JSON.stringify(body.schema));
    }
    if (body.icon !== undefined) {
      updates.push('icon = ?');
      values.push(body.icon);
    }
    if (body.cover !== undefined) {
      updates.push('cover = ?');
      values.push(body.cover);
    }

    if (updates.length === 0) {
      return errorResponse('No fields to update', 400);
    }

    updates.push('last_edited_time = ?');
    values.push(Date.now());
    values.push(collectionId);

    await env.DB.prepare(`
      UPDATE collections SET ${updates.join(', ')} WHERE id = ?
    `).bind(...values).run();

    return successResponse({ message: 'Collection updated successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 删除 Collection
 * DELETE /api/collections/:collectionId
 */
async function deleteCollection(request, env) {
  try {
    const { collectionId } = request.params;

    // 删除 collection（会级联删除相关数据）
    const result = await env.DB.prepare(`
      DELETE FROM collections WHERE id = ?
    `).bind(collectionId).run();

    if (result.meta.changes === 0) {
      return errorResponse('Collection not found', 404);
    }

    return successResponse({ message: 'Collection deleted successfully' });
  } catch (error) {
    return errorResponse(error.message, 500);
  }
}

/**
 * 从 Notion 导入数据
 * POST /api/import/notion
 * Body: { tenant_id, notion_page_id, notion_token }
 */
async function importFromNotion(request, env) {
  try {
    const body = await request.json();
    const { tenant_id, notion_page_id, notion_token } = body;

    if (!tenant_id || !notion_page_id) {
      return errorResponse('tenant_id and notion_page_id are required', 400);
    }

    // 调用 Notion API 获取数据
    const notionAPI = 'https://www.notion.so/api/v3/getPage';
    const headers = {
      'Content-Type': 'application/json',
    };
    
    if (notion_token) {
      headers['Cookie'] = `token_v2=${notion_token}`;
    }

    const response = await fetch(notionAPI, {
      method: 'POST',
      headers,
      body: JSON.stringify({ pageId: notion_page_id }),
    });

    if (!response.ok) {
      return errorResponse('Failed to fetch from Notion', response.status);
    }

    const notionData = await response.json();

    // 解析并导入数据
    let importedBlocks = 0;
    let importedCollections = 0;

    // 导入 blocks
    if (notionData.recordMap?.block) {
      for (const [blockId, blockData] of Object.entries(notionData.recordMap.block)) {
        const block = blockData.value;
        
        await env.DB.prepare(`
          INSERT OR REPLACE INTO blocks (
            id, tenant_id, parent_id, parent_table, type,
            properties, format, content,
            created_time, last_edited_time, alive
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          blockId,
          tenant_id,
          block.parent_id,
          block.parent_table || 'block',
          block.type,
          JSON.stringify(block.properties || {}),
          JSON.stringify(block.format || {}),
          JSON.stringify(block.content || []),
          block.created_time || Date.now(),
          block.last_edited_time || Date.now(),
          1
        ).run();

        importedBlocks++;
      }
    }

    // 导入 collections
    if (notionData.recordMap?.collection) {
      for (const [collId, collData] of Object.entries(notionData.recordMap.collection)) {
        const coll = collData.value;
        
        await env.DB.prepare(`
          INSERT OR REPLACE INTO collections (
            id, tenant_id, parent_id, name, schema,
            icon, cover, created_time, last_edited_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).bind(
          collId,
          tenant_id,
          coll.parent_id,
          JSON.stringify(coll.name || []),
          JSON.stringify(coll.schema || {}),
          coll.icon,
          coll.cover,
          coll.created_time || Date.now(),
          coll.last_edited_time || Date.now()
        ).run();

        importedCollections++;
      }
    }

    return successResponse({
      message: 'Import completed',
      imported_blocks: importedBlocks,
      imported_collections: importedCollections,
    });
  } catch (error) {
    console.error('Import error:', error);
    return errorResponse(error.message, 500);
  }
}

export const handleContentAPI = {
  createBlock,
  getBlock,
  updateBlock,
  deleteBlock,
  listBlocks,
  createCollection,
  getCollection,
  updateCollection,
  deleteCollection,
  importFromNotion,
};
