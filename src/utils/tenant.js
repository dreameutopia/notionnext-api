/**
 * 租户识别工具
 * 从请求中提取租户信息
 */

/**
 * 从请求中获取租户 ID
 * 优先级：Header > Query Parameter > 子域名 > 自定义域名
 */
export async function getTenantFromRequest(request, env) {
  // 1. 从 Header 获取
  const headerTenant = request.headers.get('X-Tenant-ID');
  if (headerTenant) {
    return headerTenant;
  }

  // 2. 从 Query 参数获取
  const url = new URL(request.url);
  const queryTenant = url.searchParams.get('tenant_id') || url.searchParams.get('_tenant');
  if (queryTenant) {
    return queryTenant;
  }

  // 3. 从子域名获取
  const hostname = url.hostname;
  const parts = hostname.split('.');
  
  if (parts.length >= 3) {
    const subdomain = parts[0];
    
    // 排除保留子域名
    if (!['www', 'api', 'admin'].includes(subdomain)) {
      const tenant = await env.DB.prepare(`
        SELECT id FROM tenants WHERE subdomain = ? AND status = 'active'
      `).bind(subdomain).first();
      
      if (tenant) {
        return tenant.id;
      }
    }
  }

  // 4. 从自定义域名获取
  const tenant = await env.DB.prepare(`
    SELECT id FROM tenants WHERE custom_domain = ? AND status = 'active'
  `).bind(hostname).first();
  
  if (tenant) {
    return tenant.id;
  }

  // 5. 返回默认租户
  return 'default';
}

/**
 * 验证租户是否存在且活跃
 */
export async function validateTenant(tenantId, env) {
  const tenant = await env.DB.prepare(`
    SELECT id, status FROM tenants WHERE id = ?
  `).bind(tenantId).first();

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  if (tenant.status !== 'active') {
    throw new Error('Tenant is not active');
  }

  return tenant;
}
