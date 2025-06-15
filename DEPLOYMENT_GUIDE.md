# 部署和生产环境配置指南

## 📋 目录

- [部署概述](#部署概述)
- [环境准备](#环境准备)
- [构建配置](#构建配置)
- [部署方式](#部署方式)
- [生产环境优化](#生产环境优化)
- [监控和维护](#监控和维护)
- [故障排除](#故障排除)
- [多平台部署指南](#多平台部署指南)

## 🚀 部署概述

现代化接码面板应用支持多种部署方式，包括静态网站托管、Docker容器化部署、以及传统服务器部署。

### 部署架构
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   用户浏览器     │────│   前端应用       │────│   外部API服务    │
│                │    │   (React SPA)   │    │   (短信平台)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                       ┌─────────────────┐
                       │   代理服务       │
                       │   (可选)        │
                       └─────────────────┘
```

## 🔧 环境准备

### 系统要求
- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **内存**: 最少 2GB RAM
- **存储**: 最少 1GB 可用空间
- **网络**: 稳定的互联网连接

### 依赖检查
```bash
# 检查Node.js版本
node --version

# 检查npm版本
npm --version

# 检查系统资源
free -h  # Linux
Get-ComputerInfo | Select-Object TotalPhysicalMemory  # Windows PowerShell
```

## 🏗️ 构建配置

### 1. 生产构建
```bash
# 安装依赖
npm install

# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

### 2. 环境变量配置
创建 `.env.production` 文件：
```env
# 生产环境配置
VITE_APP_TITLE=现代化接码面板
VITE_API_BASE_URL=https://your-domain.com
VITE_ENABLE_ANALYTICS=true
VITE_LOG_LEVEL=error
```

### 3. 构建优化配置
在 `vite.config.ts` 中添加生产优化：
```typescript
export default defineConfig({
  // ... 现有配置
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: false, // 生产环境关闭源码映射
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true, // 移除console.log
        drop_debugger: true
      }
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
});
```

## 🌐 部署方式

### 方式1: 静态网站托管 (推荐)

#### Vercel 部署
1. **连接GitHub仓库**
   ```bash
   # 推送代码到GitHub
   git push origin main
   ```

2. **Vercel配置**
   - 登录 [Vercel](https://vercel.com)
   - 导入GitHub仓库
   - 配置构建设置：
     ```
     Framework Preset: Vite
     Build Command: npm run build
     Output Directory: dist
     ```

3. **环境变量设置**
   在Vercel控制台设置环境变量

#### Netlify 部署
1. **构建配置**
   创建 `netlify.toml`：
   ```toml
   [build]
     publish = "dist"
     command = "npm run build"

   [[redirects]]
     from = "/*"
     to = "/index.html"
     status = 200

   [build.environment]
     NODE_VERSION = "18"
   ```

2. **部署步骤**
   - 连接GitHub仓库
   - 配置构建设置
   - 部署应用

#### GitHub Pages 部署
1. **配置GitHub Actions**
   创建 `.github/workflows/deploy.yml`：
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     build-and-deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         
         - name: Setup Node.js
           uses: actions/setup-node@v3
           with:
             node-version: '18'
             cache: 'npm'
             
         - name: Install dependencies
           run: npm ci
           
         - name: Build
           run: npm run build
           
         - name: Deploy
           uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

### 方式2: Docker 容器化部署

#### Dockerfile
```dockerfile
# 构建阶段
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

# 生产阶段
FROM nginx:alpine

# 复制构建文件
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制nginx配置
COPY nginx.conf /etc/nginx/nginx.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

#### nginx.conf
```nginx
events {
    worker_connections 1024;
}

http {
    include       /etc/nginx/mime.types;
    default_type  application/octet-stream;

    server {
        listen 80;
        server_name localhost;
        root /usr/share/nginx/html;
        index index.html;

        # 处理SPA路由
        location / {
            try_files $uri $uri/ /index.html;
        }

        # 静态资源缓存
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }

        # API代理 (如果需要)
        location /api-proxy/ {
            proxy_pass https://external-api.com/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

#### Docker部署命令
```bash
# 构建镜像
docker build -t sms-panel .

# 运行容器
docker run -d -p 80:80 --name sms-panel-app sms-panel

# 使用docker-compose
docker-compose up -d
```

#### docker-compose.yml
```yaml
version: '3.8'

services:
  sms-panel:
    build: .
    ports:
      - "80:80"
    environment:
      - NODE_ENV=production
    restart: unless-stopped
    
  # 可选：添加反向代理
  nginx-proxy:
    image: nginx:alpine
    ports:
      - "443:443"
    volumes:
      - ./ssl:/etc/nginx/ssl
      - ./proxy.conf:/etc/nginx/nginx.conf
    depends_on:
      - sms-panel
```

### 方式3: 传统服务器部署

#### 使用PM2管理进程
```bash
# 安装PM2
npm install -g pm2

# 创建PM2配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'sms-panel',
    script: 'serve',
    args: '-s dist -l 3000',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# 启动应用
pm2 start ecosystem.config.js

# 保存PM2配置
pm2 save
pm2 startup
```

#### Apache配置
```apache
<VirtualHost *:80>
    ServerName your-domain.com
    DocumentRoot /var/www/sms-panel/dist
    
    <Directory /var/www/sms-panel/dist>
        Options -Indexes
        AllowOverride All
        Require all granted
        
        # SPA路由支持
        RewriteEngine On
        RewriteBase /
        RewriteRule ^index\.html$ - [L]
        RewriteCond %{REQUEST_FILENAME} !-f
        RewriteCond %{REQUEST_FILENAME} !-d
        RewriteRule . /index.html [L]
    </Directory>
    
    # 静态资源缓存
    <LocationMatch "\.(css|js|png|jpg|jpeg|gif|ico|svg)$">
        ExpiresActive On
        ExpiresDefault "access plus 1 year"
    </LocationMatch>
</VirtualHost>
```

## ⚡ 生产环境优化

### 1. 性能优化
```typescript
// vite.config.ts 生产优化
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules')) {
            if (id.includes('react')) {
              return 'react-vendor';
            }
            return 'vendor';
          }
        }
      }
    }
  },
  server: {
    // 生产环境代理配置
    proxy: process.env.NODE_ENV === 'production' ? {} : {
      // 开发环境代理配置
    }
  }
});
```

### 2. 安全配置
```nginx
# nginx安全头配置
add_header X-Frame-Options "SAMEORIGIN" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "no-referrer-when-downgrade" always;
add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
```

### 3. HTTPS配置
```bash
# 使用Let's Encrypt获取SSL证书
sudo certbot --nginx -d your-domain.com

# 或者使用Cloudflare代理
# 在Cloudflare控制台启用SSL/TLS加密
```

### 4. CDN配置
```html
<!-- 在index.html中添加CDN资源 -->
<link rel="dns-prefetch" href="//cdn.jsdelivr.net">
<link rel="preconnect" href="https://fonts.googleapis.com">
```

## 📊 监控和维护

### 1. 应用监控
```javascript
// 添加错误监控
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
  // 发送错误到监控服务
});

// 性能监控
if ('performance' in window) {
  window.addEventListener('load', () => {
    const perfData = performance.getEntriesByType('navigation')[0];
    console.log('Page load time:', perfData.loadEventEnd - perfData.loadEventStart);
  });
}
```

### 2. 日志管理
```bash
# PM2日志管理
pm2 logs sms-panel
pm2 logs sms-panel --lines 100
pm2 flush  # 清空日志

# Docker日志
docker logs sms-panel-app
docker logs -f sms-panel-app  # 实时查看
```

### 3. 健康检查
```bash
#!/bin/bash
# health-check.sh
URL="https://your-domain.com"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" $URL)

if [ $STATUS -eq 200 ]; then
    echo "✅ Application is healthy"
    exit 0
else
    echo "❌ Application is down (HTTP $STATUS)"
    exit 1
fi
```

### 4. 自动备份
```bash
#!/bin/bash
# backup.sh
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backup/sms-panel"

# 备份应用文件
tar -czf "$BACKUP_DIR/app_$DATE.tar.gz" /var/www/sms-panel

# 备份配置
cp /etc/nginx/sites-available/sms-panel "$BACKUP_DIR/nginx_$DATE.conf"

# 清理旧备份 (保留7天)
find $BACKUP_DIR -name "*.tar.gz" -mtime +7 -delete
```

## 🔍 故障排除

### 常见问题

#### 1. 构建失败
```bash
# 清理缓存重新构建
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. 路由404错误
- 确保服务器配置了SPA路由重写
- 检查nginx/apache配置文件
- 验证base路径设置

#### 3. API代理失败
- 检查代理配置是否正确
- 验证目标API服务是否可访问
- 查看网络防火墙设置

#### 4. 静态资源加载失败
- 检查资源路径配置
- 验证CDN设置
- 确认缓存策略

### 调试工具
```bash
# 网络连接测试
curl -I https://your-domain.com

# DNS解析测试
nslookup your-domain.com

# 端口测试
telnet your-domain.com 80

# SSL证书检查
openssl s_client -connect your-domain.com:443
```

## 📈 性能基准

### 目标指标
- **首次内容绘制 (FCP)**: < 1.5s
- **最大内容绘制 (LCP)**: < 2.5s
- **首次输入延迟 (FID)**: < 100ms
- **累积布局偏移 (CLS)**: < 0.1

### 优化建议
1. **代码分割**: 使用动态导入减少初始包大小
2. **资源压缩**: 启用gzip/brotli压缩
3. **缓存策略**: 合理设置静态资源缓存
4. **CDN加速**: 使用CDN分发静态资源
5. **预加载**: 关键资源预加载

---

## 📞 技术支持

部署过程中遇到问题，可以：

1. 检查构建日志和错误信息
2. 验证服务器配置和网络连接
3. 查看应用运行日志
4. 参考本文档的故障排除部分

---

**最后更新**: 2024年6月15日
**版本**: v1.0.0 

# 🚀 多平台部署指南

## 概述

本项目支持多个平台部署，每个平台需要不同的构建配置：

- **GitHub Pages**: 需要仓库名前缀路径
- **Netlify**: 使用根路径
- **其他静态托管**: 通常使用根路径

## 🔧 构建命令

### GitHub Pages 部署
```bash
npm run build:github
```
- 生成带有 `/Code-Receiving/` 前缀的资源路径
- 适用于 GitHub Pages 部署

### Netlify 部署
```bash
npm run build:netlify
```
- 生成根路径的资源路径
- 适用于 Netlify 和大多数静态托管平台

### 通用构建（默认）
```bash
npm run build
```
- 使用默认配置（根路径）
- 适用于大多数静态托管平台

## 📋 部署步骤

### GitHub Pages 部署

#### 方法1: 自动部署（推荐）
项目已配置GitHub Actions自动部署：

1. **推送代码到main分支**
   ```bash
   git add .
   git commit -m "Update project"
   git push origin main
   ```

2. **GitHub Actions会自动：**
   - 使用 `npm run build:github` 构建项目
   - 部署到GitHub Pages

3. **配置GitHub Pages（一次性设置）**
   - 进入仓库设置 → Pages
   - Source: GitHub Actions

#### 方法2: 手动构建部署
如果需要手动部署：

1. **构建项目**
   ```bash
   npm run build:github
   ```

2. **提交构建产物**
   ```bash
   git add dist/
   git commit -m "Build for GitHub Pages"
   git push origin main
   ```

3. **配置 GitHub Pages**
   - 进入仓库设置 → Pages
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /dist

### Netlify 部署

#### 方法1: 自动部署（推荐）
1. **连接 GitHub 仓库到 Netlify**
2. **Netlify 会自动使用 `netlify.toml` 配置**
   - 构建命令: `npm run build:netlify`
   - 发布目录: `dist`

#### 方法2: 手动部署
1. **构建项目**
   ```bash
   npm run build:netlify
   ```

2. **上传 dist 目录到 Netlify**

### 其他静态托管平台

大多数平台使用根路径，可以使用：
```bash
npm run build:netlify
```

## ⚠️ 重要注意事项

### 构建产物冲突
- **不要同时提交两种构建产物**
- 每次部署前确保使用正确的构建命令
- `dist/` 目录内容会根据构建命令不同而变化

### 资源路径差异
- **GitHub Pages**: `/Code-Receiving/assets/index-xxx.js`
- **Netlify**: `/assets/index-xxx.js`

### 白屏问题排查
如果部署后出现白屏：

1. **检查浏览器控制台**
   - 查看是否有 404 错误
   - 确认资源路径是否正确

2. **验证构建版本**
   ```bash
   # 检查 dist/index.html 中的资源路径
   cat dist/index.html | grep -E "(src=|href=)"
   ```

3. **使用正确的构建命令**
   - GitHub Pages: `npm run build:github`
   - Netlify: `npm run build:netlify`

## 🔄 CI/CD 配置

### GitHub Actions (GitHub Pages)
项目已包含完整的GitHub Actions配置 (`.github/workflows/deploy.yml`)：

```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [ main ]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '18'
          cache: 'npm'
      - name: Install dependencies
        run: npm ci
      - name: Build
        run: npm run build:github
      - name: Setup Pages
        uses: actions/configure-pages@v4
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

  deploy:
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    runs-on: ubuntu-latest
    needs: build
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

**特点：**
- ✅ 使用最新的GitHub Pages Actions
- ✅ 自动使用 `npm run build:github` 构建
- ✅ 支持手动触发 (`workflow_dispatch`)
- ✅ 正确的权限配置

### Netlify (自动配置)
Netlify 会自动读取 `netlify.toml` 配置：
```toml
[build]
  publish = "dist"
  command = "npm run build:netlify"
```

## 🛠️ 故障排除

### 问题1: GitHub Pages 显示白屏
**原因**: GitHub Actions使用了错误的构建命令
**解决**: 
1. **检查 `.github/workflows/deploy.yml` 中的构建命令**
   ```yaml
   - name: Build
     run: npm run build:github  # 确保使用这个命令
   ```

2. **如果使用手动部署**
   ```bash
   npm run build:github
   git add dist/ && git commit -m "Fix GitHub Pages build" && git push
   ```

3. **触发重新部署**
   - 推送任何更改到main分支
   - 或在GitHub仓库的Actions页面手动触发工作流

### 问题2: Netlify 显示白屏
**原因**: 使用了错误的构建版本（GitHub版本）
**解决**: 在 Netlify 控制台触发重新部署，或推送新的提交

### 问题3: 资源文件 404 错误
**原因**: 资源路径不匹配部署平台要求
**解决**: 检查并使用正确的构建命令

## 📊 平台对比

| 平台 | 构建命令 | 资源路径 | 自动部署 |
|------|----------|----------|----------|
| GitHub Pages | `npm run build:github` | `/Code-Receiving/assets/` | ✅ |
| Netlify | `npm run build:netlify` | `/assets/` | ✅ |
| Vercel | `npm run build:netlify` | `/assets/` | ✅ |
| 其他平台 | `npm run build:netlify` | `/assets/` | 取决于平台 |

## 🎯 最佳实践

1. **开发时使用 `npm run dev`**
2. **部署前确认目标平台**
3. **使用对应的构建命令**
4. **测试部署结果**
5. **不要混合不同平台的构建产物**

---

**需要帮助？** 检查浏览器控制台错误信息，确认使用了正确的构建命令。 