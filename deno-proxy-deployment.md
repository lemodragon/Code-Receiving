# Deno CORS代理部署指南

## 📋 概述

这个修改后的Deno代理服务专门为接码面板应用提供CORS代理功能，解决静态托管平台的跨域问题。

## 🚀 部署方式

### 方式1: Deno Deploy (推荐)

1. **创建项目**
   - 访问 [Deno Deploy](https://deno.com/deploy)
   - 创建新项目
   - 选择从GitHub仓库部署

2. **上传代码**
   ```bash
   # 创建新的GitHub仓库
   git init
   git add deno-cors-proxy.js
   git commit -m "Add CORS proxy for SMS panel"
   git push origin main
   ```

3. **配置部署**
   - 入口文件：`deno-cors-proxy.js`
   - 自动部署：启用
   - 获得部署URL：`https://your-project.deno.dev`

### 方式2: 本地运行

```bash
# 直接运行
deno run --allow-net --allow-env deno-cors-proxy.js

# 或者使用任务配置
deno task start
```

创建 `deno.json` 配置文件：
```json
{
  "tasks": {
    "start": "deno run --allow-net --allow-env deno-cors-proxy.js",
    "dev": "deno run --allow-net --allow-env --watch deno-cors-proxy.js"
  },
  "imports": {
    "std/": "https://deno.land/std@0.208.0/"
  }
}
```

### 方式3: Docker部署

创建 `Dockerfile`：
```dockerfile
FROM denoland/deno:1.38.0

WORKDIR /app

# 复制代码
COPY deno-cors-proxy.js .
COPY deno.json .

# 缓存依赖
RUN deno cache deno-cors-proxy.js

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "--allow-env", "deno-cors-proxy.js"]
```

构建和运行：
```bash
docker build -t deno-cors-proxy .
docker run -p 8000:8000 deno-cors-proxy
```

## 🔧 配置接码面板

部署完成后，需要修改接码面板的代理配置：

### 修改 `src/App.tsx`

```typescript
// 在getProxyUrl函数中添加您的Deno代理
const getProxyUrl = (originalUrl: string) => {
  const isProduction = isProductionEnvironment();
  
  if (isProduction) {
    // 使用您的Deno代理服务
    const denoProxyUrl = 'https://your-project.deno.dev';
    
    if (originalUrl.includes('csfaka.cn')) {
      return originalUrl.replace('https://csfaka.cn', `${denoProxyUrl}/csfaka`);
    } else if (originalUrl.includes('api-sms.pro')) {
      return originalUrl.replace('https://www.api-sms.pro', `${denoProxyUrl}/api-sms`);
    }
    
    // 备用：通用代理
    return `${denoProxyUrl}/proxy?url=${encodeURIComponent(originalUrl)}`;
  } else {
    // 开发环境保持不变
    if (originalUrl.includes('csfaka.cn')) {
      return originalUrl.replace('https://csfaka.cn', '/api-proxy/csfaka');
    } else if (originalUrl.includes('api-sms.pro')) {
      return originalUrl.replace('https://www.api-sms.pro', '/api-proxy/api-sms');
    }
  }
  
  return originalUrl;
};
```

### 或者添加通用代理支持

如果您想要更灵活的配置，可以在Deno代理中添加通用代理端点：

```javascript
// 在deno-cors-proxy.js中添加
if (pathname === '/proxy') {
    const targetUrl = url.searchParams.get('url');
    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    // 验证URL格式
    try {
        new URL(targetUrl);
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid URL format' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }
    
    // 代理请求逻辑...
}
```

## 🧪 测试代理服务

### 1. 基本连通性测试
```bash
# 测试代理服务是否运行
curl https://your-project.deno.dev/

# 测试CORS头
curl -H "Origin: https://example.com" \
     -H "Access-Control-Request-Method: GET" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://your-project.deno.dev/csfaka/
```

### 2. API端点测试
```bash
# 测试csfaka代理
curl "https://your-project.deno.dev/csfaka/api/getPhone?token=YOUR_TOKEN&sid=1"

# 测试api-sms代理  
curl "https://your-project.deno.dev/api-sms/stubs/application/users/YOUR_TOKEN/services/1/numbers"
```

### 3. 浏览器测试
在浏览器控制台中测试：
```javascript
// 测试CORS请求
fetch('https://your-project.deno.dev/csfaka/api/getPhone?token=test&sid=1')
  .then(response => response.text())
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));
```

## 📊 监控和维护

### 1. 日志监控
Deno Deploy提供内置的日志查看功能：
- 访问项目控制台
- 查看实时日志
- 监控错误和性能

### 2. 性能优化
```javascript
// 在代理中添加缓存头
if (pathname.includes('/api/')) {
    responseHeaders.set('Cache-Control', 'no-cache, no-store, must-revalidate');
} else {
    responseHeaders.set('Cache-Control', 'public, max-age=300'); // 5分钟缓存
}
```

### 3. 错误处理增强
```javascript
// 添加更详细的错误日志
console.error(`代理错误 [${new Date().toISOString()}]:`, {
    method: request.method,
    pathname,
    targetUrl,
    error: error.message,
    userAgent: request.headers.get('user-agent')
});
```

## 🔒 安全考虑

### 1. 访问控制
```javascript
// 添加来源验证（可选）
const allowedOrigins = [
    'https://your-username.github.io',
    'https://your-app.netlify.app',
    'https://your-app.vercel.app'
];

const origin = request.headers.get('origin');
if (origin && !allowedOrigins.includes(origin)) {
    return new Response('Forbidden', { status: 403 });
}
```

### 2. 速率限制
```javascript
// 简单的内存速率限制
const rateLimitMap = new Map();

function checkRateLimit(ip) {
    const now = Date.now();
    const windowMs = 60000; // 1分钟
    const maxRequests = 100;
    
    if (!rateLimitMap.has(ip)) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + windowMs });
        return true;
    }
    
    const limit = rateLimitMap.get(ip);
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + windowMs;
        return true;
    }
    
    if (limit.count >= maxRequests) {
        return false;
    }
    
    limit.count++;
    return true;
}
```

## 💡 使用建议

1. **域名配置**：建议为Deno Deploy项目配置自定义域名
2. **SSL证书**：Deno Deploy自动提供HTTPS
3. **监控告警**：设置服务可用性监控
4. **备用方案**：保留其他CORS代理作为备用

## 🆚 与其他方案对比

| 方案 | 优点 | 缺点 |
|------|------|------|
| Deno Deploy | 免费、快速、全球CDN | 有使用限制 |
| Vercel Functions | 集成度高 | 冷启动延迟 |
| Netlify Functions | 易于配置 | 执行时间限制 |
| 自建服务器 | 完全控制 | 维护成本高 |

---

**部署完成后，记得更新接码面板的代理配置并重新部署！** 