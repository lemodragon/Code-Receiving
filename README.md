# 现代化接码面板应用

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)
![React](https://img.shields.io/badge/react-18.3.1-blue.svg)
![TypeScript](https://img.shields.io/badge/typescript-5.6.3-blue.svg)
![Vite](https://img.shields.io/badge/vite-5.4.8-purple.svg)

一个基于 React + TypeScript + Vite 构建的现代化短信接码管理面板

[功能特性](#-功能特性) • [快速开始](#-快速开始) • [使用指南](#-使用指南) • [自定义配置](#-自定义配置) • [部署指南](#-部署指南)

</div>

## 📱 项目简介

现代化接码面板应用是一个功能强大的短信接码管理工具，支持多种短信API平台的集成，提供直观的用户界面和灵活的配置选项。无论您是个人用户还是企业用户，都能通过这个应用高效地管理短信接码业务。

### 🎯 设计理念

- **现代化界面**: 采用最新的设计语言，提供流畅的用户体验
- **灵活配置**: 支持多种短信平台的自定义配置
- **高效管理**: 批量操作和自动化功能提升工作效率
- **稳定可靠**: 完善的错误处理和重试机制

## ✨ 功能特性

### 🔧 核心功能
- **多平台支持**: 内置支持 API-SMS.PRO、CSFAKA.CN 等主流平台
- **自定义API**: 灵活的API配置系统，支持添加任意短信平台
- **实时监控**: 自动刷新短信状态，实时倒计时显示
- **智能解析**: 自动识别验证码，支持一键复制
- **批量操作**: 支持批量导入/导出，提升操作效率

### 🎨 界面特性
- **响应式设计**: 完美适配桌面和移动设备
- **现代化UI**: 基于 Tailwind CSS 的精美界面
- **直观操作**: 简洁明了的操作流程
- **状态可视化**: 丰富的状态指示和进度显示

### 🛡️ 技术特性
- **TypeScript**: 完整的类型安全保障
- **模块化架构**: 清晰的代码结构，易于维护
- **错误处理**: 完善的异常处理和用户提示
- **性能优化**: 代码分割和懒加载优化

## 🚀 快速开始

### 环境要求

- **Node.js**: 18.0.0 或更高版本
- **npm**: 8.0.0 或更高版本
- **浏览器**: Chrome 90+, Firefox 88+, Safari 14+

### 安装步骤

1. **克隆项目**
   ```bash
   git clone https://github.com/lemodragon/Code-Receiving.git
   cd Code-Receiving
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **启动开发服务器**
   ```bash
   npm run dev
   ```

4. **访问应用**
   
   打开浏览器访问 `http://localhost:3000` (如果5173端口被占用，会自动使用3000端口)

### 构建生产版本

```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 📖 使用指南

### 基础使用

1. **添加手机号和API**
   - 在文本框中输入手机号和对应的API链接
   - 支持多种格式：`手机号 API链接` 或 `+1手机号----API链接`
   - 点击"解析数据"按钮添加到列表

2. **接收短信**
   - 点击"刷新"按钮获取最新短信
   - 系统会自动识别验证码并高亮显示
   - 支持一键复制验证码

3. **发送短信** (如果API支持)
   - 点击"发送"按钮向指定号码发送短信
   - 系统会显示发送状态和冷却时间

4. **批量管理**
   - 使用"导入CSV"功能批量添加数据
   - 使用"导出CSV"功能备份数据

### 高级功能

#### 自定义API配置
1. 点击"设置"按钮打开配置面板
2. 填写API配置信息：
   - API名称
   - 响应类型 (文本/JSON)
   - URL匹配模式
   - 解析规则
3. 保存配置后即可使用

#### 状态管理
- **绿色**: 已接收到短信
- **蓝色**: 等待接收短信
- **红色**: 接收失败或超时
- **灰色**: 已完成或已标记

## 🔧 自定义配置

### API配置

应用支持灵活的API配置，可以添加任意短信平台：

```javascript
// 配置示例
{
  name: "自定义平台",
  responseType: "json",
  urlPattern: /https:\/\/api\.example\.com\/sms\?key=.*/,
  parseRule: {
    success: (data) => data.status === 200,
    extractSms: (data) => data.message,
    noSmsMessage: "暂无短信"
  }
}
```

### 详细配置指南

- 📚 [完整自定义配置指南](./CUSTOMIZATION_GUIDE.md)
- ⚡ [API配置快速参考](./API_CONFIG_REFERENCE.md)
- 🚀 [部署和生产环境指南](./DEPLOYMENT_GUIDE.md)

## 🌐 部署指南

### 静态网站托管 (推荐)

#### Vercel 部署
```bash
# 推送到GitHub后，在Vercel中导入项目
# 配置构建设置：
# Framework Preset: Vite
# Build Command: npm run build
# Output Directory: dist
```

#### Netlify 部署
```bash
# 创建 netlify.toml
[build]
  publish = "dist"
  command = "npm run build"
```

### Docker 部署

```bash
# 构建镜像
docker build -t sms-panel .

# 运行容器
docker run -d -p 80:80 sms-panel
```

### 详细部署指南

查看 [部署和生产环境配置指南](./DEPLOYMENT_GUIDE.md) 了解更多部署选项。

## 📁 项目结构

```
project/
├── src/
│   ├── App.tsx              # 主应用组件
│   ├── main.tsx             # 应用入口
│   ├── index.css            # 全局样式
│   └── vite-env.d.ts        # TypeScript声明
├── public/                  # 静态资源
├── dist/                    # 构建输出
├── docs/                    # 文档文件
│   ├── CUSTOMIZATION_GUIDE.md
│   ├── API_CONFIG_REFERENCE.md
│   └── DEPLOYMENT_GUIDE.md
├── package.json             # 项目配置
├── vite.config.ts           # Vite配置
├── tailwind.config.js       # Tailwind配置
└── tsconfig.json            # TypeScript配置
```

## 🛠️ 技术栈

### 前端框架
- **React 18**: 现代化的用户界面库
- **TypeScript**: 类型安全的JavaScript超集
- **Vite**: 快速的构建工具和开发服务器

### UI和样式
- **Tailwind CSS**: 实用优先的CSS框架
- **Lucide React**: 精美的图标库
- **响应式设计**: 适配各种设备尺寸

### 开发工具
- **ESLint**: 代码质量检查
- **PostCSS**: CSS后处理器
- **Autoprefixer**: 自动添加CSS前缀

## 🤝 贡献指南

我们欢迎所有形式的贡献！

### 如何贡献

1. **Fork 项目**
2. **创建功能分支** (`git checkout -b feature/AmazingFeature`)
3. **提交更改** (`git commit -m 'Add some AmazingFeature'`)
4. **推送到分支** (`git push origin feature/AmazingFeature`)
5. **创建 Pull Request**

### 开发规范

- 遵循 TypeScript 类型安全原则
- 使用 ESLint 保持代码质量
- 编写清晰的提交信息
- 添加必要的测试用例

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

感谢以下开源项目的支持：

- [React](https://reactjs.org/) - 用户界面库
- [Vite](https://vitejs.dev/) - 构建工具
- [Tailwind CSS](https://tailwindcss.com/) - CSS框架
- [Lucide](https://lucide.dev/) - 图标库

## 📞 支持与反馈

如果您在使用过程中遇到问题或有改进建议：

- 🐛 [报告Bug](https://github.com/lemodragon/Code-Receiving/issues)
- 💡 [功能建议](https://github.com/lemodragon/Code-Receiving/issues)
- 📧 [联系我们](mailto:your-email@example.com)

## 📊 项目状态

- ✅ 核心功能完成
- ✅ 多平台API支持
- ✅ 响应式界面
- ✅ 完整文档
- 🔄 持续优化中

---

<div align="center">

**如果这个项目对您有帮助，请给我们一个 ⭐ Star！**

Made with ❤️ by [LemoDragon](https://github.com/lemodragon)

</div> 