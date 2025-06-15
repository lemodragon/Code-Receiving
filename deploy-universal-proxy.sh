#!/bin/bash

# 通用CORS代理自动部署脚本
# 适用于接码面板项目

set -e

echo "🚀 接码面板通用CORS代理部署脚本"
echo "=================================="

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 检查必要工具
check_requirements() {
    echo -e "${BLUE}检查系统要求...${NC}"
    
    if ! command -v git &> /dev/null; then
        echo -e "${RED}错误: 未找到 git 命令${NC}"
        exit 1
    fi
    
    if ! command -v curl &> /dev/null; then
        echo -e "${RED}错误: 未找到 curl 命令${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ 系统要求检查通过${NC}"
}

# 获取用户输入
get_user_input() {
    echo -e "${BLUE}配置部署参数...${NC}"
    
    # 项目名称
    read -p "请输入Deno Deploy项目名称 (默认: sms-cors-proxy): " PROJECT_NAME
    PROJECT_NAME=${PROJECT_NAME:-sms-cors-proxy}
    
    # GitHub仓库
    read -p "请输入GitHub用户名: " GITHUB_USERNAME
    if [ -z "$GITHUB_USERNAME" ]; then
        echo -e "${RED}错误: GitHub用户名不能为空${NC}"
        exit 1
    fi
    
    read -p "请输入GitHub仓库名称 (默认: ${PROJECT_NAME}): " REPO_NAME
    REPO_NAME=${REPO_NAME:-$PROJECT_NAME}
    
    # 确认信息
    echo -e "${YELLOW}部署配置确认:${NC}"
    echo "  项目名称: $PROJECT_NAME"
    echo "  GitHub用户: $GITHUB_USERNAME"
    echo "  仓库名称: $REPO_NAME"
    echo "  部署URL: https://${PROJECT_NAME}.deno.dev"
    echo ""
    
    read -p "确认部署? (y/N): " CONFIRM
    if [[ ! $CONFIRM =~ ^[Yy]$ ]]; then
        echo "部署已取消"
        exit 0
    fi
}

# 创建项目目录
create_project() {
    echo -e "${BLUE}创建项目目录...${NC}"
    
    if [ -d "$PROJECT_NAME" ]; then
        echo -e "${YELLOW}警告: 目录 $PROJECT_NAME 已存在${NC}"
        read -p "是否删除并重新创建? (y/N): " RECREATE
        if [[ $RECREATE =~ ^[Yy]$ ]]; then
            rm -rf "$PROJECT_NAME"
        else
            echo "使用现有目录"
        fi
    fi
    
    mkdir -p "$PROJECT_NAME"
    cd "$PROJECT_NAME"
    
    echo -e "${GREEN}✅ 项目目录创建完成${NC}"
}

# 创建代理文件
create_proxy_files() {
    echo -e "${BLUE}创建代理文件...${NC}"
    
    # 复制通用代理文件
    if [ -f "../deno-universal-proxy.js" ]; then
        cp "../deno-universal-proxy.js" "./main.js"
    else
        echo -e "${YELLOW}警告: 未找到 deno-universal-proxy.js，将从模板创建${NC}"
        
        # 创建基础代理文件
        cat > main.js << 'EOF'
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

    if (pathname === '/') {
        return new Response('🚀 SMS Panel CORS Proxy is running!', {
            status: 200,
            headers: { 'Content-Type': 'text/plain', ...corsHeaders }
        });
    }

    if (request.method === 'OPTIONS') {
        return new Response(null, { status: 200, headers: corsHeaders });
    }

    if (pathname === '/proxy') {
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
            return new Response('Missing url parameter', { status: 400, headers: corsHeaders });
        }

        try {
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; SMS-Panel-Proxy/1.0)',
                    'Accept': 'application/json, text/plain, */*'
                },
                body: request.method !== 'GET' ? request.body : undefined
            });

            const responseHeaders = new Headers(corsHeaders);
            responseHeaders.set('Content-Type', response.headers.get('content-type') || 'text/plain');

            return new Response(response.body, {
                status: response.status,
                headers: responseHeaders
            });
        } catch (error) {
            return new Response(JSON.stringify({ error: error.message }), {
                status: 500,
                headers: { 'Content-Type': 'application/json', ...corsHeaders }
            });
        }
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
}, { port: 8000 });
EOF
    fi
    
    # 创建deno.json配置
    cat > deno.json << EOF
{
  "tasks": {
    "start": "deno run --allow-net --allow-env main.js",
    "dev": "deno run --allow-net --allow-env --watch main.js"
  },
  "imports": {
    "std/": "https://deno.land/std@0.208.0/"
  }
}
EOF
    
    # 创建README
    cat > README.md << EOF
# SMS Panel CORS Proxy

通用CORS代理服务，为接码面板提供跨域支持。

## 部署信息

- 项目名称: $PROJECT_NAME
- 部署URL: https://${PROJECT_NAME}.deno.dev
- GitHub仓库: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}

## 使用方法

\`\`\`javascript
// 在接码面板中配置代理URL
const proxyUrl = 'https://${PROJECT_NAME}.deno.dev/proxy?url=';
const targetUrl = 'https://api.example.com/data';
const finalUrl = proxyUrl + encodeURIComponent(targetUrl);
\`\`\`

## 本地测试

\`\`\`bash
deno task start
\`\`\`

访问: http://localhost:8000
EOF
    
    echo -e "${GREEN}✅ 代理文件创建完成${NC}"
}

# 初始化Git仓库
init_git() {
    echo -e "${BLUE}初始化Git仓库...${NC}"
    
    git init
    git add .
    git commit -m "Initial commit: Universal CORS proxy for SMS panel"
    
    # 检查是否已有远程仓库
    if git remote get-url origin &> /dev/null; then
        echo -e "${YELLOW}远程仓库已存在，跳过添加${NC}"
    else
        git remote add origin "https://github.com/${GITHUB_USERNAME}/${REPO_NAME}.git"
    fi
    
    echo -e "${GREEN}✅ Git仓库初始化完成${NC}"
}

# 推送到GitHub
push_to_github() {
    echo -e "${BLUE}推送到GitHub...${NC}"
    
    echo -e "${YELLOW}请确保已在GitHub创建仓库: ${GITHUB_USERNAME}/${REPO_NAME}${NC}"
    read -p "按回车键继续推送..."
    
    git branch -M main
    git push -u origin main
    
    echo -e "${GREEN}✅ 代码已推送到GitHub${NC}"
}

# 生成部署说明
generate_instructions() {
    echo -e "${BLUE}生成部署说明...${NC}"
    
    cat > DEPLOYMENT_INSTRUCTIONS.md << EOF
# 部署说明

## 1. Deno Deploy 部署步骤

1. 访问 [Deno Deploy](https://deno.com/deploy)
2. 使用GitHub账号登录
3. 点击 "New Project"
4. 选择仓库: \`${GITHUB_USERNAME}/${REPO_NAME}\`
5. 配置项目:
   - Project Name: \`${PROJECT_NAME}\`
   - Entry Point: \`main.js\`
   - 启用自动部署
6. 点击 "Deploy"

## 2. 部署完成后

您的代理服务将在以下URL可用:
\`https://${PROJECT_NAME}.deno.dev\`

## 3. 配置接码面板

在 \`src/App.tsx\` 中更新代理配置:

\`\`\`typescript
const customDenoProxy = 'https://${PROJECT_NAME}.deno.dev/proxy?url=';
\`\`\`

## 4. 测试代理

\`\`\`bash
# 测试基本功能
curl "https://${PROJECT_NAME}.deno.dev/"

# 测试代理功能
curl "https://${PROJECT_NAME}.deno.dev/proxy?url=https://httpbin.org/json"
\`\`\`

## 5. 监控和维护

- 查看日志: Deno Deploy 控制台
- 健康检查: \`https://${PROJECT_NAME}.deno.dev/health\`
- 更新代码: 推送到GitHub会自动部署
EOF
    
    echo -e "${GREEN}✅ 部署说明已生成${NC}"
}

# 测试本地服务
test_local() {
    echo -e "${BLUE}测试本地服务...${NC}"
    
    echo "启动本地服务进行测试..."
    echo "按 Ctrl+C 停止测试"
    
    # 在后台启动服务
    deno run --allow-net --allow-env main.js &
    SERVER_PID=$!
    
    # 等待服务启动
    sleep 3
    
    # 测试服务
    echo -e "${YELLOW}测试服务响应...${NC}"
    if curl -s http://localhost:8000/ > /dev/null; then
        echo -e "${GREEN}✅ 本地服务测试通过${NC}"
    else
        echo -e "${RED}❌ 本地服务测试失败${NC}"
    fi
    
    # 停止服务
    kill $SERVER_PID 2>/dev/null || true
    
    read -p "按回车键继续..."
}

# 主函数
main() {
    echo -e "${GREEN}开始部署通用CORS代理...${NC}"
    
    check_requirements
    get_user_input
    create_project
    create_proxy_files
    init_git
    
    # 询问是否测试本地服务
    read -p "是否测试本地服务? (y/N): " TEST_LOCAL
    if [[ $TEST_LOCAL =~ ^[Yy]$ ]]; then
        test_local
    fi
    
    push_to_github
    generate_instructions
    
    echo ""
    echo -e "${GREEN}🎉 部署脚本执行完成!${NC}"
    echo ""
    echo -e "${YELLOW}下一步操作:${NC}"
    echo "1. 访问 https://deno.com/deploy 完成部署"
    echo "2. 查看 DEPLOYMENT_INSTRUCTIONS.md 获取详细说明"
    echo "3. 更新接码面板的代理配置"
    echo ""
    echo -e "${BLUE}项目信息:${NC}"
    echo "  本地目录: $(pwd)"
    echo "  GitHub仓库: https://github.com/${GITHUB_USERNAME}/${REPO_NAME}"
    echo "  预期部署URL: https://${PROJECT_NAME}.deno.dev"
    echo ""
    echo -e "${GREEN}感谢使用! 🚀${NC}"
}

# 运行主函数
main "$@" 