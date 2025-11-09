/**
 * 活动日志工具
 */

export async function logActivity(env, {
  tenant_id,
  user_id = null,
  action,
  resource_type,
  resource_id,
  details = null,
  ip_address = null,
  user_agent = null,
}) {
  try {
    await env.DB.prepare(`
      INSERT INTO activity_logs (
        tenant_id, user_id, action, resource_type, resource_id,
        details, ip_address, user_agent, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      tenant_id,
      user_id,
      action,
      resource_type,
      resource_id,
      details ? JSON.stringify(details) : null,
      ip_address,
      user_agent,
      Date.now()
    ).run();
  } catch (error) {
    console.error('Failed to log activity:', error);
    // 不抛出错误，避免影响主流程
  }
}
