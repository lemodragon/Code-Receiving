# 现代化接码面板应用 - 自定义配置指南

## 📋 目录

- [项目概述](#项目概述)
- [架构说明](#架构说明)
- [基础配置](#基础配置)
- [API配置详解](#api配置详解)
- [高级自定义](#高级自定义)
- [配置示例](#配置示例)
- [故障排除](#故障排除)
- [常见问题](#常见问题)

## 🚀 项目概述

这是一个基于 React + TypeScript + Vite 构建的现代化接码面板应用，支持多种短信API平台的集成和自定义配置。

### 主要功能
- 📱 多平台短信接收管理
- 🔧 灵活的API配置系统
- 📊 实时状态监控和倒计时
- 📤 批量导入/导出功能
- 🎨 现代化响应式UI界面
- 🔄 自动重试和错误处理

### 技术栈
- **前端框架**: React 18 + TypeScript
- **构建工具**: Vite
- **样式框架**: Tailwind CSS
- **图标库**: Lucide React
- **状态管理**: React Hooks

## 🏗️ 架构说明

### 核心组件结构
```
src/
├── App.tsx          # 主应用组件
├── main.tsx         # 应用入口
├── index.css        # 全局样式
└── vite-env.d.ts    # TypeScript声明
```

### 数据结构

#### TableRow 接口
```typescript
interface TableRow {
  index: number;           // 行索引
  phone: string;          // 手机号码
  api: string;            // 接收API URL
  sendApi?: string;       // 发送API URL (可选)
  apiConfig: APIConfig;   // API配置对象
  status: string;         // 当前状态
  countdown: number;      // 倒计时秒数
  timer: NodeJS.Timeout | null;  // 定时器
  sms: string;           // 短信内容
  sendCooldown: number;  // 发送冷却时间
  sendTimer: NodeJS.Timeout | null;  // 发送定时器
  lastSendTime: number;  // 最后发送时间
  hasSent?: boolean;     // 是否已发送
  importedAsUsed?: boolean;  // 导入时是否标记为已使用
  lastSendResult?: string;   // 最后发送结果
  isExpanded?: boolean;  // 是否展开详情
}
```

#### APIConfig 接口
```typescript
interface APIConfig {
  id: string;                    // 配置唯一标识
  name: string;                  // 配置名称
  isDefault?: boolean;           // 是否为默认配置
  urlPattern: RegExp;            // URL匹配正则
  responseType: 'text' | 'json'; // 响应类型
  parseRule: {                   // 解析规则
    success: (data: any) => boolean;      // 成功判断函数
    extractSms: (data: any) => string;    // 短信提取函数
    noSmsMessage: string;                 // 无短信时的消息
  };
  inputPatterns: RegExp[];       // 输入格式匹配
  sendUrlPattern?: RegExp;       // 发送URL匹配 (可选)
  sendResponseType?: 'text' | 'json';  // 发送响应类型
  sendParseRule?: {              // 发送解析规则 (可选)
    success: (data: any) => boolean;
    extractMessage: (data: any) => string;
    cooldownTime: number;
    getEndTime?: (data: any) => string | null;
  };
}
```

## ⚙️ 基础配置

### 环境要求
- Node.js 18+ 
- npm 或 yarn
- 现代浏览器支持

### 安装和启动
```bash
# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

### 基本设置
1. **端口配置**: 默认运行在 `http://localhost:5173`
2. **代理设置**: 在 `vite.config.ts` 中配置API代理
3. **样式定制**: 通过 `tailwind.config.js` 自定义主题

## 🔌 API配置详解

### 默认支持的平台

#### 1. API-SMS.PRO
```javascript
{
  id: 'api-sms-pro',
  name: 'API-SMS.PRO',
  urlPattern: /https:\/\/www\.api-sms\.pro\/api\/get_sms\?key=([a-zA-Z0-9]+)/,
  responseType: 'text',
  parseRule: {
    success: (text) => text !== 'no|暂无验证码' && !text.includes('暂无验证码'),
    extractSms: (text) => text,
    noSmsMessage: 'no|暂无验证码'
  }
}
```

#### 2. CSFAKA.CN
```javascript
{
  id: 'csfaka-cn',
  name: 'CSFAKA.CN',
  urlPattern: /https:\/\/csfaka\.cn\/api\/Sms\/receive\?key=([a-zA-Z0-9]+)/,
  responseType: 'json',
  parseRule: {
    success: (data) => data.status === 200 && data.data && !data.data.includes('暂时没有收到短信'),
    extractSms: (data) => data.data || '未获取到短信',
    noSmsMessage: '暂时没有收到短信，请耐心等待'
  }
}
```

### 添加自定义API配置

#### 通过界面添加
1. 点击"设置"按钮打开配置面板
2. 填写以下信息：
   - **API名称**: 自定义名称
   - **响应类型**: 选择 `文本响应` 或 `JSON响应`
   - **接收API URL模式**: API URL的正则表达式
   - **发送API URL模式**: 发送短信的API URL (可选)
   - **输入文本匹配模式**: 每行一个正则表达式
   - **无短信时的响应内容**: 当没有短信时API返回的内容
   - **发送冷却时间**: 发送短信后的等待时间(秒)

#### 配置字段详解

##### URL模式 (urlPattern)
用于匹配和识别API URL的正则表达式。

**示例**:
```javascript
// 匹配包含key参数的URL
/https:\/\/example\.com\/api\/sms\?key=([a-zA-Z0-9]+)/

// 匹配更复杂的URL结构
/https:\/\/api\.example\.com\/v1\/sms\/receive\/([0-9]+)\?token=([a-zA-Z0-9]+)/
```

##### 输入匹配模式 (inputPatterns)
用于从输入文本中提取手机号和API URL的正则表达式数组。

**常用模式**:
```javascript
// 格式: 手机号 + 空格 + URL
/^(\d{10,})\s+.*?(https:\/\/example\.com\/api\/[^\\s]+)/

// 格式: +1 手机号----URL
/^\+1\s?(\d{10,})----(https:\/\/example\.com\/api\/[^\\s]+)/

// 格式: 手机号|URL
/^(\d{10,})\|(https:\/\/example\.com\/api\/[^\\s]+)/
```

##### 解析规则 (parseRule)
定义如何解析API响应的规则。

**文本响应示例**:
```javascript
parseRule: {
  success: (text) => text && !text.includes('暂无短信'),
  extractSms: (text) => text,
  noSmsMessage: '暂无短信'
}
```

**JSON响应示例**:
```javascript
parseRule: {
  success: (data) => data.status === 200 && data.message,
  extractSms: (data) => data.message || data.sms_content,
  noSmsMessage: '暂无短信'
}
```

## 🔧 高级自定义

### 代理配置

在 `vite.config.ts` 中添加新的API代理：

```typescript
server: {
  proxy: {
    '/api-proxy/your-api': {
      target: 'https://your-api-domain.com',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/api-proxy\/your-api/, ''),
      secure: false,
      timeout: 60000,
      headers: {
        'User-Agent': 'Your-Custom-User-Agent',
        'Accept': 'application/json'
      }
    }
  }
}
```

### 自定义样式

#### 修改主题色彩
在 `tailwind.config.js` 中自定义颜色：

```javascript
module.exports = {
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0f9ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      }
    }
  }
}
```

#### 自定义组件样式
在 `src/index.css` 中添加全局样式：

```css
/* 自定义按钮样式 */
.custom-button {
  @apply px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors;
}

/* 自定义卡片样式 */
.custom-card {
  @apply bg-white rounded-xl shadow-lg border border-gray-200 p-6;
}
```

### 功能扩展

#### 添加新的状态类型
在 `TableRow` 接口中扩展状态字段：

```typescript
interface TableRow {
  // ... 现有字段
  customStatus?: 'pending' | 'processing' | 'completed' | 'failed';
  metadata?: Record<string, any>;
}
```

#### 自定义解析函数
创建更复杂的短信解析逻辑：

```javascript
const customParseRule = {
  success: (data) => {
    // 自定义成功判断逻辑
    if (typeof data === 'object') {
      return data.code === 0 && data.data && data.data.sms;
    }
    return data && !data.includes('error');
  },
  extractSms: (data) => {
    // 自定义短信提取逻辑
    if (typeof data === 'object') {
      // 处理嵌套的JSON结构
      return data.data?.sms || data.message || JSON.stringify(data);
    }
    // 处理文本响应
    const match = data.match(/验证码[：:]\s*(\d{4,8})/);
    return match ? match[1] : data;
  },
  noSmsMessage: '暂无短信'
};
```

## 📝 配置示例

### 示例1: 添加新的短信平台

假设要添加一个名为 "NewSMS" 的平台：

```javascript
// 1. API响应格式
// 成功: {"status": "success", "sms": "您的验证码是123456"}
// 失败: {"status": "error", "message": "暂无短信"}

// 2. 配置参数
{
  name: "NewSMS平台",
  type: "json",
  url: "https://newsms.com/api/receive\\?token=.*",
  sendUrl: "https://newsms.com/api/send\\?token=.*", // 可选
  patterns: "^(\\d{11})\\s+.*(https://newsms\\.com/api/receive\\?token=[a-zA-Z0-9]+)",
  noSms: "暂无短信",
  cooldown: 60
}
```

### 示例2: 复杂的输入格式匹配

```javascript
// 支持多种输入格式
const inputPatterns = [
  // 格式1: 手机号 空格 URL
  /^(\d{10,})\s+.*(https:\/\/example\.com\/api\/[^\s]+)/,
  
  // 格式2: +国家码 手机号----URL  
  /^\+(\d{1,3})\s?(\d{10,})----(https:\/\/example\.com\/api\/[^\s]+)/,
  
  // 格式3: 手机号|URL|备注
  /^(\d{10,})\|(https:\/\/example\.com\/api\/[^\s]+)\|.*/,
  
  // 格式4: JSON格式
  /{"phone":"(\d{10,})","api":"(https:\/\/example\.com\/api\/[^"]+)"}/
];
```

### 示例3: 高级响应解析

```javascript
const advancedParseRule = {
  success: (data) => {
    // 支持多种成功状态
    if (typeof data === 'object') {
      return (data.status === 'success' || data.code === 0) && 
             data.data && 
             !data.data.includes('暂无');
    }
    return data && data !== 'NO_SMS' && !data.includes('等待中');
  },
  
  extractSms: (data) => {
    if (typeof data === 'object') {
      // 处理嵌套结构
      if (data.data && data.data.content) {
        return data.data.content;
      }
      if (data.sms_list && data.sms_list.length > 0) {
        return data.sms_list[0].content;
      }
      return data.message || JSON.stringify(data);
    }
    
    // 文本格式的验证码提取
    const codeMatch = data.match(/(?:验证码|code)[：:\s]*(\d{4,8})/i);
    if (codeMatch) {
      return `验证码: ${codeMatch[1]} (完整内容: ${data})`;
    }
    
    return data;
  },
  
  noSmsMessage: '暂无短信'
};
```

## 🔍 故障排除

### 常见问题及解决方案

#### 1. API请求失败
**症状**: 显示"请求失败"或"网络连接失败"

**解决方案**:
- 检查API URL是否正确
- 确认API服务是否可用
- 检查代理配置是否正确
- 验证网络连接

#### 2. 短信解析错误
**症状**: 无法正确提取短信内容

**解决方案**:
- 检查响应类型设置 (text/json)
- 验证解析规则的逻辑
- 查看浏览器控制台的错误信息
- 测试API响应格式

#### 3. 输入格式不匹配
**症状**: 无法识别输入的手机号和API

**解决方案**:
- 检查输入匹配模式的正则表达式
- 确认输入格式与配置的模式一致
- 使用在线正则测试工具验证

#### 4. 代理配置问题
**症状**: 跨域错误或代理失败

**解决方案**:
- 检查 `vite.config.ts` 中的代理配置
- 确认目标服务器支持代理请求
- 检查SSL证书配置

### 调试技巧

#### 1. 启用详细日志
在浏览器控制台中查看详细的请求和响应信息：

```javascript
// 在App.tsx中添加调试代码
console.log('API Request:', apiUrl);
console.log('API Response:', response);
console.log('Parsed Data:', parsedData);
```

#### 2. 测试API配置
使用浏览器开发者工具的网络面板：
- 查看请求URL和参数
- 检查响应状态码和内容
- 验证请求头和响应头

#### 3. 正则表达式测试
使用在线工具测试正则表达式：
- [RegExr](https://regexr.com/)
- [Regex101](https://regex101.com/)

## ❓ 常见问题

### Q: 如何添加新的短信平台？
A: 通过界面的"设置"按钮打开配置面板，填写相应的API信息和解析规则。

### Q: 支持哪些响应格式？
A: 支持纯文本和JSON两种响应格式，可以通过配置选择。

### Q: 如何处理复杂的API响应结构？
A: 可以自定义解析函数，处理嵌套的JSON结构或特殊的文本格式。

### Q: 配置保存在哪里？
A: 自定义配置保存在浏览器的localStorage中，不会丢失。

### Q: 如何备份和恢复配置？
A: 可以通过浏览器的开发者工具导出localStorage数据，或者手动记录配置参数。

### Q: 是否支持批量操作？
A: 支持批量导入CSV文件和批量导出数据。

### Q: 如何优化性能？
A: 可以调整请求间隔、启用缓存、优化正则表达式等。

---

## 📞 技术支持

如果您在使用过程中遇到问题，可以：

1. 查看浏览器控制台的错误信息
2. 检查网络请求的详细信息
3. 验证API配置的正确性
4. 参考本文档的故障排除部分

---

**最后更新**: 2024年6月15日
**版本**: v1.0.0 