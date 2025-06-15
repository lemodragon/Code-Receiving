# 使用Vercel部署CORS代理

## 1. 创建CORS代理项目

```bash
mkdir cors-proxy
cd cors-proxy
npm init -y
npm install cors
```

## 2. 创建API文件

创建 `api/proxy.js`：

```javascript
import Cors from 'cors';

// 初始化CORS中间件
const cors = Cors({
  methods: ['GET', 'HEAD', 'POST', 'PUT', 'DELETE'],
  origin: true, // 允许所有来源
});

// 辅助函数运行中间件
function runMiddleware(req, res, fn) {
  return new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        return reject(result);
      }
      return resolve(result);
    });
  });
}

export default async function handler(req, res) {
  // 运行CORS中间件
  await runMiddleware(req, res, cors);

  const { url } = req.query;

  if (!url) {
    return res.status(400).json({ error: 'Missing URL parameter' });
  }

  try {
    const targetUrl = Array.isArray(url) ? url[0] : url;
    
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json, text/plain, */*',
        ...(req.body && { 'Content-Type': 'application/json' })
      },
      ...(req.body && { body: JSON.stringify(req.body) })
    });

    const data = await response.text();
    
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'text/plain');
    res.send(data);
    
  } catch (error) {
    console.error('Proxy error:', error);
    res.status(500).json({ error: 'Proxy request failed', details: error.message });
  }
}
```

## 3. 创建vercel.json配置

```json
{
  "functions": {
    "api/proxy.js": {
      "maxDuration": 30
    }
  },
  "rewrites": [
    {
      "source": "/proxy",
      "destination": "/api/proxy"
    }
  ]
}
```

## 4. 部署到Vercel

```bash
npm install -g vercel
vercel --prod
```

## 5. 使用自定义代理

在您的应用中修改代理URL：

```javascript
const corsProxyUrl = 'https://your-proxy.vercel.app/proxy?url=';
return corsProxyUrl + encodeURIComponent(originalUrl);
``` 