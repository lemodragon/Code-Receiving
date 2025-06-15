# 通用CORS代理自动部署脚本 (Windows PowerShell版本)
# 适用于接码面板项目

param(
    [string]$ProjectName = "",
    [string]$GitHubUsername = "",
    [string]$RepoName = ""
)

# 设置错误处理
$ErrorActionPreference = "Stop"

Write-Host "🚀 接码面板通用CORS代理部署脚本 (Windows版)" -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Green

# 检查必要工具
function Test-Requirements {
    Write-Host "检查系统要求..." -ForegroundColor Blue
    
    # 检查Git
    try {
        git --version | Out-Null
        Write-Host "✅ Git 已安装" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ 错误: 未找到 Git 命令" -ForegroundColor Red
        Write-Host "请安装 Git: https://git-scm.com/download/win" -ForegroundColor Yellow
        exit 1
    }
    
    # 检查curl或Invoke-WebRequest
    try {
        curl --version | Out-Null
        Write-Host "✅ curl 已安装" -ForegroundColor Green
    }
    catch {
        Write-Host "⚠️  curl 未安装，将使用 PowerShell 内置功能" -ForegroundColor Yellow
    }
    
    Write-Host "✅ 系统要求检查通过" -ForegroundColor Green
}

# 获取用户输入
function Get-UserInput {
    Write-Host "配置部署参数..." -ForegroundColor Blue
    
    # 项目名称
    if (-not $ProjectName) {
        $script:ProjectName = Read-Host "请输入Deno Deploy项目名称 (默认: sms-cors-proxy)"
        if (-not $script:ProjectName) { $script:ProjectName = "sms-cors-proxy" }
    }
    
    # GitHub用户名
    if (-not $GitHubUsername) {
        $script:GitHubUsername = Read-Host "请输入GitHub用户名"
        if (-not $script:GitHubUsername) {
            Write-Host "❌ 错误: GitHub用户名不能为空" -ForegroundColor Red
            exit 1
        }
    }
    
    # 仓库名称
    if (-not $RepoName) {
        $script:RepoName = Read-Host "请输入GitHub仓库名称 (默认: $script:ProjectName)"
        if (-not $script:RepoName) { $script:RepoName = $script:ProjectName }
    }
    
    # 确认信息
    Write-Host "部署配置确认:" -ForegroundColor Yellow
    Write-Host "  项目名称: $script:ProjectName"
    Write-Host "  GitHub用户: $script:GitHubUsername"
    Write-Host "  仓库名称: $script:RepoName"
    Write-Host "  部署URL: https://$script:ProjectName.deno.dev"
    Write-Host ""
    
    $confirm = Read-Host "确认部署? (y/N)"
    if ($confirm -notmatch "^[Yy]$") {
        Write-Host "部署已取消"
        exit 0
    }
    
    return @{
        ProjectName = $script:ProjectName
        GitHubUsername = $script:GitHubUsername
        RepoName = $script:RepoName
    }
}

# 创建项目目录
function New-ProjectDirectory {
    param($ProjectName)
    
    Write-Host "创建项目目录..." -ForegroundColor Blue
    
    if (Test-Path $ProjectName) {
        Write-Host "⚠️  警告: 目录 $ProjectName 已存在" -ForegroundColor Yellow
        $recreate = Read-Host "是否删除并重新创建? (y/N)"
        if ($recreate -match "^[Yy]$") {
            Remove-Item -Path $ProjectName -Recurse -Force
        }
        else {
            Write-Host "使用现有目录"
        }
    }
    
    if (-not (Test-Path $ProjectName)) {
        New-Item -ItemType Directory -Path $ProjectName | Out-Null
    }
    
    Set-Location $ProjectName
    Write-Host "✅ 项目目录创建完成" -ForegroundColor Green
}

# 创建代理文件
function New-ProxyFiles {
    param($ProjectName, $GitHubUsername, $RepoName)
    
    Write-Host "创建代理文件..." -ForegroundColor Blue
    
    # 检查是否存在通用代理文件
    $universalProxyPath = "..\deno-universal-proxy.js"
    if (Test-Path $universalProxyPath) {
        Copy-Item $universalProxyPath "main.js"
        Write-Host "✅ 已复制完整的通用代理文件" -ForegroundColor Green
    }
    else {
        Write-Host "⚠️  警告: 未找到 deno-universal-proxy.js，将创建基础版本" -ForegroundColor Yellow
        
        # 创建基础代理文件
        $mainJsContent = @'
import { serve } from "https://deno.land/std/http/server.ts";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Allow-Credentials': 'false'
};

serve(async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 根路径 - 显示服务状态
    if (pathname === '/' || pathname === '/index.html') {
        return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>SMS Panel CORS Proxy</title>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; background: #f5f5f5; }
        .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; text-align: center; }
        .status { background: #e8f5e8; padding: 15px; border-radius: 5px; margin: 20px 0; }
        .endpoint { background: #f0f8ff; padding: 15px; border-radius: 5px; margin: 10px 0; }
        code { background: #f4f4f4; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 SMS Panel CORS Proxy</h1>
        <div class="status">
            <strong>✅ 服务状态:</strong> 运行中<br>
            <strong>📡 代理端点:</strong> <code>/proxy?url=目标URL</code>
        </div>
        <div class="endpoint">
            <h3>使用方法</h3>
            <p>在接码面板中配置代理URL:</p>
            <code>https://your-project.deno.dev/proxy?url=</code>
        </div>
        <div class="endpoint">
            <h3>测试示例</h3>
            <p>测试代理功能:</p>
            <code>/proxy?url=https://httpbin.org/json</code>
        </div>
    </div>
</body>
</html>
        `, {
            status: 200,
            headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders }
        });
    }

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    // 处理代理请求
    if (pathname === '/proxy') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
            return new Response(JSON.stringify({
                error: '缺少目标URL',
                message: '请在查询参数中提供url参数',
                example: '/proxy?url=https://api.example.com/data'
            }), {
                status: 400,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }

        try {
            // 验证URL格式
            new URL(targetUrl);
            
            console.log(`代理请求: ${request.method} ${targetUrl}`);
            
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SMS-Panel-Proxy/1.0)',
                    'Accept': 'application/json, text/plain, */*',
                    'Accept-Language': 'en-US,en;q=0.9'
                },
                body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
                signal: AbortSignal.timeout(30000) // 30秒超时
            });

            const responseHeaders = new Headers(corsHeaders);
            const contentType = response.headers.get('content-type');
            if (contentType) {
                responseHeaders.set('Content-Type', contentType);
            }
            
            // 添加代理信息头
            responseHeaders.set('X-Proxy-By', 'SMS-Panel-CORS-Proxy');
            responseHeaders.set('X-Target-URL', targetUrl);

            console.log(`代理响应: ${response.status} ${response.statusText}`);

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            });
        } catch (error) {
            console.error('代理错误:', error);
            
            let errorMessage = '代理请求失败';
            let statusCode = 500;
            
            if (error.name === 'AbortError') {
                errorMessage = '请求超时';
                statusCode = 504;
            } else if (error.message.includes('fetch')) {
                errorMessage = '无法连接到目标服务器';
                statusCode = 502;
            }

            return new Response(JSON.stringify({
                error: errorMessage,
                details: error.message,
                targetUrl: targetUrl,
                timestamp: new Date().toISOString()
            }), {
                status: statusCode,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    // 健康检查端点
    if (pathname === '/health') {
        return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'SMS Panel CORS Proxy'
        }), {
            status: 200,
            headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
    }

    // 未知路径
    return new Response(JSON.stringify({
        error: '端点未找到',
        message: '请使用 /proxy?url=目标URL 进行代理请求',
        availableEndpoints: ['/', '/proxy', '/health']
    }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
}, { port: 8000 });

console.log('🚀 SMS Panel CORS Proxy 已启动');
console.log('📡 端口: 8000');
console.log('🔗 代理端点: /proxy?url=目标URL');
'@
        
        Set-Content -Path "main.js" -Value $mainJsContent -Encoding UTF8
    }
    
    # 创建deno.json配置
    $denoJsonContent = @"
{
  "tasks": {
    "start": "deno run --allow-net --allow-env main.js",
    "dev": "deno run --allow-net --allow-env --watch main.js"
  },
  "imports": {
    "std/": "https://deno.land/std@0.208.0/"
  }
}
"@
    Set-Content -Path "deno.json" -Value $denoJsonContent -Encoding UTF8
    
    # 创建README
    $readmeContent = @"
# SMS Panel CORS Proxy

通用CORS代理服务，为接码面板提供跨域支持。

## 部署信息

- 项目名称: $ProjectName
- 部署URL: https://$ProjectName.deno.dev
- GitHub仓库: https://github.com/$GitHubUsername/$RepoName

## 使用方法

``````javascript
// 在接码面板中配置代理URL
const proxyUrl = 'https://$ProjectName.deno.dev/proxy?url=';
const targetUrl = 'https://api.example.com/data';
const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
``````

## 本地测试

``````bash
deno task start
``````

访问: http://localhost:8000

## 功能特性

- ✅ 完整的CORS支持
- ✅ 通用URL代理
- ✅ 自动错误处理
- ✅ 请求超时保护
- ✅ 详细的日志记录

## 支持的端点

- `/` - 服务状态页面
- `/proxy?url=目标URL` - 通用代理端点
- `/health` - 健康检查
"@
    Set-Content -Path "README.md" -Value $readmeContent -Encoding UTF8
    
    Write-Host "✅ 代理文件创建完成" -ForegroundColor Green
}

# 初始化Git仓库
function Initialize-Git {
    param($GitHubUsername, $RepoName)
    
    Write-Host "初始化Git仓库..." -ForegroundColor Blue
    
    # 检查是否已经是Git仓库
    if (-not (Test-Path ".git")) {
        git init
    }
    
    git add .
    git commit -m "Initial commit: Universal CORS proxy for SMS panel"
    
    # 检查远程仓库
    try {
        git remote get-url origin 2>$null | Out-Null
        Write-Host "⚠️  远程仓库已存在，跳过添加" -ForegroundColor Yellow
    }
    catch {
        git remote add origin "https://github.com/$GitHubUsername/$RepoName.git"
    }
    
    Write-Host "✅ Git仓库初始化完成" -ForegroundColor Green
}

# 推送到GitHub
function Push-ToGitHub {
    param($GitHubUsername, $RepoName)
    
    Write-Host "推送到GitHub..." -ForegroundColor Blue
    
    Write-Host "⚠️  请确保已在GitHub创建仓库: $GitHubUsername/$RepoName" -ForegroundColor Yellow
    Write-Host "如果尚未创建，请访问: https://github.com/new" -ForegroundColor Yellow
    Read-Host "按回车键继续推送..."
    
    try {
        git branch -M main
        git push -u origin main
        Write-Host "✅ 代码已推送到GitHub" -ForegroundColor Green
    }
    catch {
        Write-Host "❌ 推送失败，请检查:" -ForegroundColor Red
        Write-Host "1. GitHub仓库是否已创建" -ForegroundColor Yellow
        Write-Host "2. Git凭据是否正确" -ForegroundColor Yellow
        Write-Host "3. 网络连接是否正常" -ForegroundColor Yellow
        throw
    }
}

# 生成部署说明
function New-DeploymentInstructions {
    param($ProjectName, $GitHubUsername, $RepoName)
    
    Write-Host "生成部署说明..." -ForegroundColor Blue
    
    $instructionsContent = @"
# 部署说明

## 1. Deno Deploy 部署步骤

1. 访问 [Deno Deploy](https://deno.com/deploy)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 选择仓库: ``$GitHubUsername/$RepoName``
5. 配置项目:
   - Project Name: ``$ProjectName``
   - Entry Point: ``main.js``
   - 启用自动部署 (Automatic deployments)
6. 点击 "Deploy"

## 2. 部署完成后

您的代理服务将在以下URL可用:
``https://$ProjectName.deno.dev``

## 3. 配置接码面板

在 ``src/App.tsx`` 中更新代理配置:

``````typescript
// 找到 getProxyUrl 函数中的这一行:
const customDenoProxy = 'https://your-project.deno.dev/proxy?url=';

// 替换为:
const customDenoProxy = 'https://$ProjectName.deno.dev/proxy?url=';
``````

## 4. 测试代理

### 浏览器测试
访问: ``https://$ProjectName.deno.dev``

### 命令行测试
``````bash
# 测试基本功能
curl "https://$ProjectName.deno.dev/"

# 测试代理功能
curl "https://$ProjectName.deno.dev/proxy?url=https://httpbin.org/json"

# 测试健康检查
curl "https://$ProjectName.deno.dev/health"
``````

### JavaScript测试
``````javascript
// 在浏览器控制台中测试
fetch('https://$ProjectName.deno.dev/proxy?url=' + encodeURIComponent('https://httpbin.org/json'))
  .then(response => response.json())
  .then(data => console.log('代理测试成功:', data))
  .catch(error => console.error('代理测试失败:', error));
``````

## 5. 监控和维护

- **查看日志**: Deno Deploy 控制台 → 项目 → Logs
- **健康检查**: ``https://$ProjectName.deno.dev/health``
- **更新代码**: 推送到GitHub会自动重新部署
- **域名配置**: 在Deno Deploy控制台可配置自定义域名

## 6. 故障排除

### 常见问题

1. **部署失败**
   - 检查 main.js 语法是否正确
   - 确认入口文件路径为 main.js

2. **代理请求失败**
   - 检查目标URL是否可访问
   - 查看Deno Deploy日志获取详细错误信息

3. **CORS错误**
   - 确认代理服务正常运行
   - 检查接码面板中的代理URL配置

### 获取帮助

- Deno Deploy文档: https://deno.com/deploy/docs
- GitHub仓库: https://github.com/$GitHubUsername/$RepoName
- 项目Issues: https://github.com/$GitHubUsername/$RepoName/issues

---

**重要提醒**: 部署完成后，记得更新接码面板中的代理URL配置！
"@
    
    Set-Content -Path "DEPLOYMENT_INSTRUCTIONS.md" -Value $instructionsContent -Encoding UTF8
    Write-Host "✅ 部署说明已生成" -ForegroundColor Green
}

# 测试本地服务
function Test-LocalService {
    Write-Host "测试本地服务..." -ForegroundColor Blue
    
    $testLocal = Read-Host "是否启动本地服务进行测试? (y/N)"
    if ($testLocal -match "^[Yy]$") {
        Write-Host "启动本地服务..." -ForegroundColor Yellow
        Write-Host "按 Ctrl+C 停止测试" -ForegroundColor Yellow
        
        try {
            # 启动Deno服务
            Start-Process -FilePath "deno" -ArgumentList "run", "--allow-net", "--allow-env", "main.js" -NoNewWindow
            
            # 等待服务启动
            Start-Sleep -Seconds 3
            
            # 测试服务
            try {
                $response = Invoke-WebRequest -Uri "http://localhost:8000/" -UseBasicParsing -TimeoutSec 5
                if ($response.StatusCode -eq 200) {
                    Write-Host "✅ 本地服务测试通过" -ForegroundColor Green
                }
            }
            catch {
                Write-Host "❌ 本地服务测试失败: $($_.Exception.Message)" -ForegroundColor Red
            }
            
            Read-Host "按回车键继续..."
        }
        catch {
            Write-Host "❌ 无法启动本地服务，请确保已安装Deno" -ForegroundColor Red
            Write-Host "Deno安装地址: https://deno.land/manual/getting_started/installation" -ForegroundColor Yellow
        }
    }
}

# 主函数
function Main {
    try {
        Write-Host "开始部署通用CORS代理..." -ForegroundColor Green
        
        Test-Requirements
        $config = Get-UserInput
        New-ProjectDirectory -ProjectName $config.ProjectName
        New-ProxyFiles -ProjectName $config.ProjectName -GitHubUsername $config.GitHubUsername -RepoName $config.RepoName
        Initialize-Git -GitHubUsername $config.GitHubUsername -RepoName $config.RepoName
        Test-LocalService
        Push-ToGitHub -GitHubUsername $config.GitHubUsername -RepoName $config.RepoName
        New-DeploymentInstructions -ProjectName $config.ProjectName -GitHubUsername $config.GitHubUsername -RepoName $config.RepoName
        
        Write-Host ""
        Write-Host "🎉 部署脚本执行完成!" -ForegroundColor Green
        Write-Host ""
        Write-Host "下一步操作:" -ForegroundColor Yellow
        Write-Host "1. 访问 https://deno.com/deploy 完成部署"
        Write-Host "2. 查看 DEPLOYMENT_INSTRUCTIONS.md 获取详细说明"
        Write-Host "3. 更新接码面板的代理配置"
        Write-Host ""
        Write-Host "项目信息:" -ForegroundColor Blue
        Write-Host "  本地目录: $(Get-Location)"
        Write-Host "  GitHub仓库: https://github.com/$($config.GitHubUsername)/$($config.RepoName)"
        Write-Host "  预期部署URL: https://$($config.ProjectName).deno.dev"
        Write-Host ""
        Write-Host "感谢使用! 🚀" -ForegroundColor Green
        
        # 询问是否打开相关链接
        $openLinks = Read-Host "是否打开Deno Deploy部署页面? (y/N)"
        if ($openLinks -match "^[Yy]$") {
            Start-Process "https://deno.com/deploy"
        }
    }
    catch {
        Write-Host "❌ 部署过程中发生错误: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "请检查错误信息并重试" -ForegroundColor Yellow
        exit 1
    }
}

# 运行主函数
Main 