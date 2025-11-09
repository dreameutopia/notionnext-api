/**
 * 最小化 Worker 测试版本
 * 用于验证基础部署是否成功
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    
    // 健康检查
    if (url.pathname === '/health') {
      return new Response(JSON.stringify({
        status: 'ok',
        timestamp: Date.now(),
        version: '1.0.0-test'
      }), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 测试环境绑定
    if (url.pathname === '/test-bindings') {
      const bindings = {
        hasDB: !!env.DB,
        hasCache: !!env.CACHE,
        hasStorage: !!env.STORAGE
      };
      
      return new Response(JSON.stringify(bindings), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    // 默认响应
    return new Response('Worker is running!', {
      headers: { 'Access-Control-Allow-Origin': '*' }
    });
  }
};
