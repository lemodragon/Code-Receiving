# 静态托管平台部署问题修复指南

## 问题描述

在静态托管平台（GitHub Pages、Netlify、Vercel等）部署的应用中，点击"发码"按钮可能出现HTTP 404错误或CORS跨域问题。

## 问题原因

1. **代理配置失效**：Vite开发服务器的代理配置（`/api-proxy/csfaka` 和 `/api-proxy/api-sms`）只在开发环境中有效
2. **静态部署限制**：GitHub Pages是静态网站托管服务，无法处理服务器端代理请求
3. **CORS跨域问题**：前端直接调用外部API会遇到跨域限制

## 解决方案

### 已实施的修复

1. **环境感知的API调用**
   - 自动检测运行环境（开发/生产）
   - 生产环境使用CORS代理服务
   - 开发环境保持原有代理配置

2. **多重CORS代理支持**
   - 主代理：`https://cors-anywhere.herokuapp.com/`
   - 备用代理：`https://api.allorigins.win/raw?url=` 和 `https://corsproxy.io/?`
   - 自动故障转移机制

3. **增强的错误处理**
   - 详细的错误分类和用户友好提示
   - 针对不同错误类型的解决建议
   - 重试机制和超时处理

4. **API状态监控**
   - 实时API服务状态检测
   - 可视化状态指示器
   - 批量状态检查功能

## 使用说明

### 1. 生产环境配置

创建 `.env.production` 文件（如果不存在）：

```env
# 生产环境配置文件
# 用于GitHub Pages等静态托管平台

# CORS代理服务配置
VITE_CORS_PROXY_URL=https://cors-anywhere.herokuapp.com/
VITE_ENABLE_CORS_PROXY=true

# 应用配置
VITE_APP_TITLE=现代化接码面板
VITE_API_BASE_URL=https://your-username.github.io/Code-Receiving
VITE_ENABLE_ANALYTICS=false
VITE_LOG_LEVEL=warn

# 备用CORS代理服务（用于故障转移）
VITE_BACKUP_PROXIES=https://api.allorigins.win/raw?url=,https://corsproxy.io/?

# API超时设置（毫秒）
VITE_API_TIMEOUT=30000
VITE_MAX_RETRIES=3
```

### 2. 部署步骤

1. **推送代码到GitHub**
   ```bash
   git add .
   git commit -m "修复GitHub Pages API代理问题"
   git push origin main
   ```

2. **等待GitHub Actions自动部署**
   - 查看Actions页面确认部署状态
   - 部署完成后访问GitHub Pages URL

3. **测试功能**
   - 添加测试数据
   - 点击"检测API状态"按钮
   - 尝试"发码"功能

### 3. 新增功能

#### API状态检测
- 点击"检测API状态"按钮可以批量检查所有API的连接状态
- API Key列旁边会显示状态指示器：
  - 🟡 黄色：检测中
  - 🟢 绿色：API在线
  - 🔴 红色：API离线

#### 增强的错误提示
- 网络连接失败时会显示详细的故障排除建议
- 区分开发环境和生产环境的错误处理
- 提供针对性的解决方案

## 故障排除

### 常见问题

1. **CORS代理服务不可用**
   - 应用会自动尝试备用代理服务
   - 如果所有代理都失败，会显示相应错误信息

2. **API调用频率限制**
   - 遇到429错误时会自动延长等待时间
   - 建议适当增加发码间隔时间

3. **网络连接问题**
   - 检查网络连接
   - 尝试刷新页面
   - 使用"检测API状态"功能诊断问题

### 高级配置

如果需要使用自定义CORS代理服务，可以修改以下配置：

1. 在 `src/App.tsx` 中的 `getProxyUrl` 函数
2. 在 `fetchWithRetry` 函数中的 `backupProxies` 数组
3. 在 `.env.production` 文件中的相关环境变量

## 技术细节

### 环境检测逻辑
```javascript
const isProductionEnvironment = () => {
  return import.meta.env.PROD || 
         window.location.hostname.includes('github.io') ||
         window.location.hostname.includes('netlify.app') ||
         window.location.hostname.includes('vercel.app') ||
         (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'));
};
```

### 代理URL生成
```javascript
// 生产环境
const corsProxyUrl = 'https://cors-anywhere.herokuapp.com/';
return corsProxyUrl + encodeURIComponent(originalUrl);

// 开发环境
return originalUrl.replace('https://csfaka.cn', '/api-proxy/csfaka');
```

### 故障转移机制
- 主代理失败时自动尝试备用代理
- 支持多次重试和渐进式延迟
- 详细的错误日志和用户提示

## 注意事项

1. **CORS代理服务限制**
   - 免费CORS代理服务可能有请求频率限制
   - 建议在生产环境中使用自己的代理服务

2. **安全考虑**
   - CORS代理会暴露API请求内容
   - 不要在代理请求中包含敏感信息

3. **性能影响**
   - 通过代理的请求可能比直接请求慢
   - 建议优化API调用频率

## 更新日志

- **v1.1.0** (2024-06-15)
  - 修复GitHub Pages部署中的API代理问题
  - 添加环境感知的API调用机制
  - 实现多重CORS代理支持
  - 增强错误处理和用户提示
  - 添加API状态监控功能

---

如果遇到其他问题，请检查浏览器控制台的错误信息，或联系技术支持。 