# 使用Netlify Functions部署CORS代理

## 1. 在现有项目中添加Functions

创建 `netlify/functions/proxy.js`：

```javascript
exports.handler = async (event, context) => {
  // 设置CORS头
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  };

  // 处理预检请求
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  const { url } = event.queryStringParameters || {};

  if (!url) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: 'Missing URL parameter' }),
    };
  }

  try {
    const response = await fetch(url, {
      method: event.httpMethod,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...(event.body && { 'Content-Type': 'application/json' })
      },
      ...(event.body && { body: event.body })
    });

    const data = await response.text();
    
    return {
      statusCode: response.status,
      headers: {
        ...headers,
        'Content-Type': response.headers.get('content-type') || 'text/plain',
      },
      body: data,
    };
    
  } catch (error) {
    console.error('Proxy error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Proxy request failed', details: error.message }),
    };
  }
};
```

## 2. 更新netlify.toml

```toml
[build]
  publish = "dist"
  command = "npm run build"
  functions = "netlify/functions"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Functions配置
[functions]
  directory = "netlify/functions"
```

## 3. 在应用中使用

修改 `src/App.tsx` 中的代理URL：

```javascript
const getProxyUrl = (originalUrl: string) => {
  const isProduction = isProductionEnvironment();
  
  if (isProduction && window.location.hostname.includes('netlify.app')) {
    // 使用Netlify Functions代理
    return `/.netlify/functions/proxy?url=${encodeURIComponent(originalUrl)}`;
  } else if (isProduction) {
    // 其他平台使用外部CORS代理
    const corsProxyUrl = 'https://cors-anywhere.herokuapp.com/';
    return corsProxyUrl + encodeURIComponent(originalUrl);
  } else {
    // 开发环境使用Vite代理
    if (originalUrl.includes('csfaka.cn')) {
      return originalUrl.replace('https://csfaka.cn', '/api-proxy/csfaka');
    } else if (originalUrl.includes('api-sms.pro')) {
      return originalUrl.replace('https://www.api-sms.pro', '/api-proxy/api-sms');
    }
  }
  
  return originalUrl;
};
``` 