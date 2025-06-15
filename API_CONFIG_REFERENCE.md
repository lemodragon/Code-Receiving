# API配置快速参考表

## 🚀 快速配置模板

### 基础配置参数

| 参数名称 | 类型 | 必填 | 说明 | 示例 |
|---------|------|------|------|------|
| API名称 | string | ✅ | 自定义的API配置名称 | `"我的短信平台"` |
| 响应类型 | select | ✅ | API响应格式 | `文本响应` / `JSON响应` |
| 接收API URL模式 | string | ✅ | 匹配接收API的正则表达式 | `https://api\.example\.com/sms\?key=.*` |
| 发送API URL模式 | string | ❌ | 匹配发送API的正则表达式 | `https://api\.example\.com/send\?key=.*` |
| 输入文本匹配模式 | textarea | ✅ | 每行一个正则表达式 | 见下方示例 |
| 无短信时的响应内容 | string | ✅ | 当没有短信时API返回的内容 | `"暂无短信"` |
| 发送冷却时间 | number | ❌ | 发送短信后的等待时间(秒) | `120` |

## 📝 常用输入格式模板

### 格式1: 手机号 + 空格 + URL
```regex
^(\d{10,})\s+.*(https://your-api\.com/[^\s]+)
```

### 格式2: +1 手机号----URL
```regex
^\+1\s?(\d{10,})----(https://your-api\.com/[^\s]+)
```

### 格式3: 手机号|URL
```regex
^(\d{10,})\|(https://your-api\.com/[^\s]+)
```

### 格式4: JSON格式
```regex
{"phone":"(\d{10,})","api":"(https://your-api\.com/[^"]+)"}
```

## 🔧 URL模式示例

### 基础URL匹配
```regex
https://api\.example\.com/sms\?key=([a-zA-Z0-9]+)
```

### 带多个参数的URL
```regex
https://api\.example\.com/v1/sms\?key=([a-zA-Z0-9]+)&phone=(\d+)
```

### 路径参数URL
```regex
https://api\.example\.com/sms/([a-zA-Z0-9]+)/receive
```

## 📊 响应解析配置

### 文本响应配置
- **成功判断**: 响应不包含错误关键词
- **短信提取**: 直接返回响应文本
- **无短信消息**: 设置为API返回的无短信标识

### JSON响应配置
- **成功判断**: 检查status字段或特定的成功标识
- **短信提取**: 从JSON中提取短信内容字段
- **无短信消息**: 设置为API返回的无短信消息

## 🌟 平台配置示例

### 示例1: 简单文本API
```
API名称: SimpleAPI
响应类型: 文本响应
接收URL模式: https://simple\.api\.com/get\?token=.*
输入匹配: ^(\d{11})\s+(https://simple\.api\.com/get\?token=[a-zA-Z0-9]+)
无短信内容: NO_SMS
```

### 示例2: JSON格式API
```
API名称: JsonAPI
响应类型: JSON响应
接收URL模式: https://json\.api\.com/receive\?key=.*
发送URL模式: https://json\.api\.com/send\?key=.*
输入匹配: ^(\d{11})\s+(https://json\.api\.com/receive\?key=[a-zA-Z0-9]+)
无短信内容: 暂无短信
发送冷却: 60
```

### 示例3: 复杂嵌套JSON API
```
API名称: ComplexAPI
响应类型: JSON响应
接收URL模式: https://complex\.api\.com/api/v2/sms/receive\?token=.*
输入匹配: 
^(\d{11})\s+(https://complex\.api\.com/api/v2/sms/receive\?token=[a-zA-Z0-9]+)
^\+1(\d{10})----(https://complex\.api\.com/api/v2/sms/receive\?token=[a-zA-Z0-9]+)
无短信内容: 等待短信中
```

## ⚡ 快速配置步骤

1. **点击设置按钮** - 打开API配置面板
2. **填写基本信息** - API名称和响应类型
3. **配置URL模式** - 设置接收和发送API的URL匹配规则
4. **设置输入格式** - 配置如何从输入文本中提取信息
5. **配置解析规则** - 设置无短信时的响应内容
6. **测试配置** - 添加测试数据验证配置是否正确
7. **保存配置** - 点击"添加配置"按钮保存

## 🔍 调试检查清单

- [ ] URL模式是否正确匹配目标API
- [ ] 输入格式是否能正确提取手机号和API URL
- [ ] 响应类型选择是否与实际API一致
- [ ] 无短信消息设置是否与API返回一致
- [ ] 发送API配置是否正确（如果需要）
- [ ] 在浏览器控制台检查是否有错误信息

## 🚨 常见错误及解决

| 错误现象 | 可能原因 | 解决方案 |
|---------|---------|---------|
| 无法识别输入格式 | 输入匹配模式错误 | 检查正则表达式语法 |
| 短信解析失败 | 响应类型选择错误 | 确认API返回格式 |
| API请求失败 | URL模式不匹配 | 验证URL正则表达式 |
| 配置保存失败 | 必填字段未填写 | 检查所有必填项 |

## 📚 正则表达式速查

### 常用字符类
- `\d` - 匹配数字 (0-9)
- `\w` - 匹配字母数字下划线
- `\s` - 匹配空白字符
- `.` - 匹配任意字符
- `*` - 匹配0次或多次
- `+` - 匹配1次或多次
- `?` - 匹配0次或1次

### 转义字符
- `\.` - 匹配点号
- `\?` - 匹配问号
- `\|` - 匹配竖线
- `\\` - 匹配反斜杠

### 分组和捕获
- `()` - 捕获分组
- `(?:)` - 非捕获分组
- `^` - 行开始
- `$` - 行结束

---

**提示**: 使用 [Regex101](https://regex101.com/) 在线工具测试正则表达式 