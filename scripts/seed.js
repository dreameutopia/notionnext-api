#!/usr/bin/env node
/**
 * 种子数据脚本 - 创建测试租户和示例数据
 * 使用方法: node scripts/seed.js
 */

const TENANT_DATA = [
  {
    subdomain: 'demo',
    title: 'Demo Blog',
    description: 'A demo blog for testing',
    author: 'Demo Author',
    theme: 'heo',
  },
  {
    subdomain: 'test',
    title: 'Test Blog',
    description: 'Test environment',
    author: 'Test User',
    theme: 'gitbook',
  },
];

async function seed() {
  console.log('Seeding database...');
  
  const API_URL = process.env.WORKER_URL || 'http://localhost:8787';
  
  for (const tenant of TENANT_DATA) {
    try {
      const response = await fetch(`${API_URL}/api/tenants`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(tenant),
      });
      
      const result = await response.json();
      console.log(`✓ Created tenant: ${tenant.subdomain}`, result);
    } catch (error) {
      console.error(`✗ Failed to create tenant: ${tenant.subdomain}`, error.message);
    }
  }
  
  console.log('Seeding completed!');
}

seed().catch(console.error);
