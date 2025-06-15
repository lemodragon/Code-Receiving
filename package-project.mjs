import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 创建简单的ZIP打包函数（不依赖外部库）
function createZip() {
  console.log('📦 开始创建项目压缩包...');
  
  // 创建一个简单的文件列表脚本
  const filesToInclude = [
    'src/App.tsx',
    'src/main.tsx', 
    'src/index.css',
    'src/vite-env.d.ts',
    'package.json',
    'index.html',
    'vite.config.ts',
    'tailwind.config.js',
    'postcss.config.js',
    'tsconfig.json',
    'tsconfig.app.json',
    'tsconfig.node.json',
    'eslint.config.js',
    'README.md'
  ];

  // 创建文件清单
  let fileList = '# 项目文件清单\n\n';
  let totalFiles = 0;
  
  filesToInclude.forEach(file => {
    if (fs.existsSync(file)) {
      const stats = fs.statSync(file);
      fileList += `- ${file} (${stats.size} bytes)\n`;
      totalFiles++;
      console.log('✅ 找到文件:', file);
    } else {
      console.log('⚠️  文件不存在:', file);
    }
  });

  fileList += `\n总计: ${totalFiles} 个文件\n`;
  
  // 创建部署说明
  const deployInstructions = `# 接码面板项目部署说明

## 项目简介
这是一个现代化的短信接收管理面板，支持多种API接口的短信接收和发送功能。

## 本地开发
1. 安装依赖：\`npm install\`
2. 启动开发服务器：\`npm run dev\`
3. 打开浏览器访问：http://localhost:5173

## 生产部署
1. 构建项目：\`npm run build\`
2. 部署dist文件夹到你的服务器

## 功能特性
- 📱 支持多种短信API接口
- 🔄 自动刷新短信内容  
- 📊 数据导入导出（CSV格式）
- ⚙️ 自定义API配置
- 🎨 现代化UI设计
- 📱 响应式布局

## 技术栈
- React 18 + TypeScript
- Vite
- Tailwind CSS
- Lucide React Icons

## 联系作者
https://demo.lvdpub.com

${fileList}
`;

  // 创建GitHub推送脚本
  const githubScript = `#!/bin/bash
# GitHub推送脚本

echo "🚀 开始推送到GitHub..."

# 初始化git仓库（如果还没有的话）
if [ ! -d ".git" ]; then
    git init
    echo "✅ Git仓库已初始化"
fi

# 添加所有文件
git add .
echo "✅ 文件已添加到暂存区"

# 提交更改
git commit -m "feat: 接码面板项目 - 现代化短信接收管理系统

- 支持多种API接口（API-SMS.PRO, CSFAKA.CN等）
- 自动短信接收和刷新功能
- 数据导入导出（CSV格式）
- 自定义API配置管理
- 现代化响应式UI设计
- 生产级代码质量"

echo "✅ 代码已提交"

# 推送到GitHub（需要先设置远程仓库）
echo "⚠️  请先设置GitHub远程仓库："
echo "git remote add origin https://github.com/你的用户名/你的仓库名.git"
echo "然后运行："
echo "git push -u origin main"

echo "🎉 准备完成！"
`;

  const windowsScript = `@echo off
echo 🚀 开始推送到GitHub...

REM 初始化git仓库（如果还没有的话）
if not exist ".git" (
    git init
    echo ✅ Git仓库已初始化
)

REM 添加所有文件
git add .
echo ✅ 文件已添加到暂存区

REM 提交更改
git commit -m "feat: 接码面板项目 - 现代化短信接收管理系统"

echo ✅ 代码已提交

REM 推送到GitHub（需要先设置远程仓库）
echo ⚠️  请先设置GitHub远程仓库：
echo git remote add origin https://github.com/你的用户名/你的仓库名.git
echo 然后运行：
echo git push -u origin main

echo 🎉 准备完成！
pause
`;

  // 写入文件
  try {
    fs.writeFileSync('DEPLOY.md', deployInstructions);
    fs.writeFileSync('push-to-github.sh', githubScript);
    fs.writeFileSync('push-to-github.bat', windowsScript);
    
    // 给shell脚本添加执行权限
    try {
      fs.chmodSync('push-to-github.sh', '755');
    } catch (e) {
      // 在Windows上可能会失败，忽略
    }
    
    console.log('✅ 已创建以下文件：');
    console.log('📄 DEPLOY.md - 部署说明文档');
    console.log('🐧 push-to-github.sh - Linux/Mac推送脚本');
    console.log('🪟 push-to-github.bat - Windows推送脚本');
    console.log('');
    console.log('🎉 项目文件已准备完成！');
    console.log('💡 你现在可以：');
    console.log('   1. 手动选择并下载需要的文件');
    console.log('   2. 或者直接在当前目录运行推送脚本');
    console.log('   3. 查看 DEPLOY.md 了解详细部署说明');
    
  } catch (error) {
    console.error('❌ 创建文件时出错:', error.message);
  }
}

createZip();