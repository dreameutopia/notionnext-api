/**
 * 构建 Notion API 格式的 RecordMap
 * 将数据库数据转换为 Notion API 返回格式
 */

export function buildRecordMap({ blocks = [], collections = [], collectionViews = [] }) {
  const recordMap = {
    block: {},
    collection: {},
    collection_view: {},
    collection_query: {},
    notion_user: {},
    space: {},
  };

  // 转换 blocks
  for (const block of blocks) {
    recordMap.block[block.id] = {
      role: 'reader',
      value: {
        id: block.id,
        version: block.version || 1,
        type: block.type,
        properties: parseJSON(block.properties, {}),
        format: parseJSON(block.format, {}),
        content: parseJSON(block.content, []),
        parent_id: block.parent_id,
        parent_table: block.parent_table || 'block',
        alive: block.alive === 1,
        created_time: block.created_time,
        last_edited_time: block.last_edited_time,
        created_by_table: 'notion_user',
        created_by_id: block.created_by || 'system',
        last_edited_by_table: 'notion_user',
        last_edited_by_id: block.last_edited_by || 'system',
        space_id: block.tenant_id, // 使用 tenant_id 作为 space_id
      },
    };
  }

  // 转换 collections
  for (const collection of collections) {
    recordMap.collection[collection.id] = {
      role: 'reader',
      value: {
        id: collection.id,
        version: collection.version || 1,
        name: parseJSON(collection.name, [['Untitled']]),
        schema: parseJSON(collection.schema, {}),
        icon: collection.icon,
        cover: collection.cover,
        description: parseJSON(collection.description, []),
        parent_id: collection.parent_id,
        parent_table: 'block',
        alive: true,
        created_time: collection.created_time,
        last_edited_time: collection.last_edited_time,
      },
    };
  }

  // 转换 collection views
  for (const view of collectionViews) {
    recordMap.collection_view[view.id] = {
      role: 'reader',
      value: {
        id: view.id,
        version: view.version || 1,
        type: view.type || 'table',
        name: view.name || 'Default View',
        format: parseJSON(view.format, {}),
        query2: parseJSON(view.query2, {}),
        page_sort: parseJSON(view.page_sort, []),
        parent_id: view.collection_id,
        parent_table: 'collection',
        alive: true,
      },
    };
  }

  return recordMap;
}

/**
 * 安全解析 JSON
 */
function parseJSON(str, defaultValue = null) {
  if (!str) return defaultValue;
  
  try {
    return typeof str === 'string' ? JSON.parse(str) : str;
  } catch (error) {
    console.error('JSON parse error:', error);
    return defaultValue;
  }
}

/**
 * 将富文本转换为 Notion 格式
 * 输入: "Hello **bold** text"
 * 输出: [["Hello "], ["bold", [["b"]]], [" text"]]
 */
export function textToNotionFormat(text) {
  // 简化版本，实际需要更复杂的解析
  return [[text]];
}

/**
 * 将 Notion 富文本格式转换为纯文本
 */
export function notionFormatToText(richText) {
  if (!Array.isArray(richText)) return '';
  
  return richText.map(segment => {
    if (Array.isArray(segment) && segment.length > 0) {
      return segment[0];
    }
    return '';
  }).join('');
}
