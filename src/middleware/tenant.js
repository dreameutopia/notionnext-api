/**
 * 租户验证中间件
 */

import { getTenantFromRequest, validateTenant } from '../utils/tenant';
import { errorResponse } from '../utils/response';

export async function tenantMiddleware(request, env) {
  try {
    const tenantId = await getTenantFromRequest(request, env);
    await validateTenant(tenantId, env);
    
    // 将租户 ID 附加到请求对象
    request.tenantId = tenantId;
    
    return null; // 继续处理
  } catch (error) {
    return errorResponse(error.message, 403);
  }
}
