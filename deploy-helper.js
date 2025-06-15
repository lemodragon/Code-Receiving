#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 多平台部署助手\n');

// 检查当前构建状态
function checkCurrentBuild() {
    const distPath = path.join(__dirname, 'dist', 'index.html');

    if (!fs.existsSync(distPath)) {
        return '未构建';
    }

    const content = fs.readFileSync(distPath, 'utf8');

    if (content.includes('/Code-Receiving/assets/')) {
        return 'GitHub Pages';
    } else if (content.includes('/assets/')) {
        return 'Netlify/通用';
    } else {
        return '未知';
    }
}

// 显示当前状态
const currentBuild = checkCurrentBuild();
console.log(`📊 当前构建状态: ${currentBuild}`);

// 获取用户输入
function getUserChoice() {
    const readline = require('readline');
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        console.log('\n请选择部署平台:');
        console.log('1. GitHub Pages');
        console.log('2. Netlify');
        console.log('3. 其他静态托管平台');
        console.log('4. 查看当前构建信息');
        console.log('5. 退出');

        rl.question('\n请输入选项 (1-5): ', (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

// 执行构建
function buildForPlatform(platform) {
    console.log(`\n🔨 正在为 ${platform} 构建...`);

    try {
        let command;
        switch (platform) {
            case 'github':
                command = 'npm run build:github';
                break;
            case 'netlify':
                command = 'npm run build:netlify';
                break;
            default:
                command = 'npm run build';
        }

        execSync(command, { stdio: 'inherit' });
        console.log(`\n✅ ${platform} 构建完成!`);

        // 显示构建结果
        showBuildResult(platform);

    } catch (error) {
        console.error(`\n❌ 构建失败:`, error.message);
        process.exit(1);
    }
}

// 显示构建结果
function showBuildResult(platform) {
    const distPath = path.join(__dirname, 'dist', 'index.html');

    if (fs.existsSync(distPath)) {
        const content = fs.readFileSync(distPath, 'utf8');
        const jsMatch = content.match(/src="([^"]+\.js)"/);
        const cssMatch = content.match(/href="([^"]+\.css)"/);

        console.log('\n📋 构建结果:');
        if (jsMatch) console.log(`   JavaScript: ${jsMatch[1]}`);
        if (cssMatch) console.log(`   CSS: ${cssMatch[1]}`);

        // 提供部署指导
        console.log('\n📖 部署指导:');
        switch (platform) {
            case 'github':
                console.log('   1. git add dist/');
                console.log('   2. git commit -m "Build for GitHub Pages"');
                console.log('   3. git push origin main');
                console.log('   4. 在 GitHub 仓库设置中配置 Pages (Source: main branch, /dist folder)');
                break;
            case 'netlify':
                console.log('   1. 如果已连接 GitHub: 推送代码，Netlify 会自动部署');
                console.log('   2. 手动部署: 将 dist/ 目录上传到 Netlify');
                break;
            default:
                console.log('   将 dist/ 目录内容上传到您的静态托管平台');
        }
    }
}

// 显示详细信息
function showDetailedInfo() {
    console.log('\n📊 详细构建信息:');
    console.log('─'.repeat(50));

    const distPath = path.join(__dirname, 'dist');

    if (!fs.existsSync(distPath)) {
        console.log('❌ 未找到构建产物 (dist/ 目录不存在)');
        return;
    }

    const indexPath = path.join(distPath, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.log('❌ 未找到 index.html');
        return;
    }

    const content = fs.readFileSync(indexPath, 'utf8');
    const jsMatch = content.match(/src="([^"]+\.js)"/);
    const cssMatch = content.match(/href="([^"]+\.css)"/);

    console.log(`构建时间: ${fs.statSync(indexPath).mtime.toLocaleString()}`);
    console.log(`JavaScript: ${jsMatch ? jsMatch[1] : '未找到'}`);
    console.log(`CSS: ${cssMatch ? cssMatch[1] : '未找到'}`);

    // 分析构建类型
    if (jsMatch && jsMatch[1].includes('/Code-Receiving/')) {
        console.log('🎯 构建类型: GitHub Pages (带仓库前缀)');
        console.log('✅ 适用于: GitHub Pages 部署');
        console.log('❌ 不适用于: Netlify, Vercel 等其他平台');
    } else if (jsMatch && jsMatch[1].startsWith('/assets/')) {
        console.log('🎯 构建类型: Netlify/通用 (根路径)');
        console.log('✅ 适用于: Netlify, Vercel, 其他静态托管');
        console.log('❌ 不适用于: GitHub Pages');
    } else {
        console.log('⚠️  构建类型: 未知或异常');
    }

    // 检查文件大小
    const assetsPath = path.join(distPath, 'assets');
    if (fs.existsSync(assetsPath)) {
        const files = fs.readdirSync(assetsPath);
        console.log('\n📁 资源文件:');
        files.forEach(file => {
            const filePath = path.join(assetsPath, file);
            const stats = fs.statSync(filePath);
            const size = (stats.size / 1024).toFixed(2);
            console.log(`   ${file}: ${size} KB`);
        });
    }
}

// 主函数
async function main() {
    try {
        const choice = await getUserChoice();

        switch (choice) {
            case '1':
                buildForPlatform('github');
                break;
            case '2':
                buildForPlatform('netlify');
                break;
            case '3':
                buildForPlatform('netlify'); // 大多数平台使用根路径
                break;
            case '4':
                showDetailedInfo();
                break;
            case '5':
                console.log('\n👋 再见!');
                process.exit(0);
                break;
            default:
                console.log('\n❌ 无效选项，请重新运行脚本');
                process.exit(1);
        }
    } catch (error) {
        console.error('\n❌ 发生错误:', error.message);
        process.exit(1);
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = {
    checkCurrentBuild,
    buildForPlatform,
    showBuildResult,
    showDetailedInfo
}; 