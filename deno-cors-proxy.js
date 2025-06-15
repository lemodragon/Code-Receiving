import { serve } from "https://deno.land/std/http/server.ts";

// 接码面板专用API映射
const apiMapping = {
    '/csfaka': 'https://csfaka.cn',
    '/api-sms': 'https://www.api-sms.pro',
    // 保留您原有的AI API映射
    '/discord': 'https://discord.com/api',
    '/telegram': 'https://api.telegram.org',
    '/openai': 'https://api.openai.com',
    '/claude': 'https://api.anthropic.com',
    '/gemini': 'https://generativelanguage.googleapis.com',
    '/meta': 'https://www.meta.ai/api',
    '/groq': 'https://api.groq.com/openai',
    '/xai': 'https://api.x.ai',
    '/cohere': 'https://api.cohere.ai',
    '/huggingface': 'https://api-inference.huggingface.co',
    '/together': 'https://api.together.xyz',
    '/novita': 'https://api.novita.ai',
    '/portkey': 'https://api.portkey.ai',
    '/fireworks': 'https://api.fireworks.ai',
    '/openrouter': 'https://openrouter.ai/api',
    '/hongshi': 'https://error418-new-api.hf.space/hf',
    '/zhiyang': 'https://api.cymru',
    '/clash/([^/]+)/([^/]+)\\.yaml': 'https://gist.githubusercontent.com/$1/$2/raw/clash.yaml',
    '/clash/([^/]+)/([^/]+)\\.txt': 'https://gist.githubusercontent.com/$1/$2/raw/v2ray.txt'
};

// CORS响应头
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent',
    'Access-Control-Max-Age': '86400', // 24小时
    'Access-Control-Allow-Credentials': 'false'
};

serve(async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 处理根路径
    if (pathname === '/' || pathname === '/index.html') {
        return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>CORS代理服务</title>
    <meta charset="utf-8">
</head>
<body>
    <h1>🚀 CORS代理服务运行中</h1>
    <p>支持的API端点:</p>
    <ul>
        <li><code>/csfaka/*</code> → csfaka.cn</li>
        <li><code>/api-sms/*</code> → api-sms.pro</li>
        <li>以及其他AI API服务...</li>
    </ul>
    <p>使用方法: <code>https://your-proxy.deno.dev/csfaka/api/endpoint</code></p>
</body>
</html>
        `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                ...corsHeaders
            }
        });
    }

    // 处理robots.txt
    if (pathname === '/robots.txt') {
        return new Response('User-agent: *\nDisallow: /', {
            status: 200,
            headers: {
                'Content-Type': 'text/plain',
                ...corsHeaders
            }
        });
    }

    // 处理OPTIONS预检请求
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 200,
            headers: corsHeaders
        });
    }

    // 查找匹配的API映射
    const [prefix, rest, match] = extractPrefixAndRest(pathname, Object.keys(apiMapping));
    if (!prefix) {
        return new Response(JSON.stringify({
            error: 'API endpoint not found',
            available_endpoints: Object.keys(apiMapping),
            requested_path: pathname
        }), {
            status: 404,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }

    // 构建目标URL
    let targetUrl;
    if (match && match.length > 1) {
        targetUrl = apiMapping[prefix].replace(/\$(\d+)/g, (_, group) => match[parseInt(group)]);
    } else {
        targetUrl = `${apiMapping[prefix]}${rest}`;
    }

    console.log(`代理请求: ${request.method} ${pathname} → ${targetUrl}`);

    try {
        // 准备请求头
        const headers = new Headers();

        // 复制允许的请求头
        const allowedHeaders = [
            'accept', 'content-type', 'authorization', 'user-agent',
            'x-requested-with', 'cache-control', 'pragma'
        ];

        for (const [key, value] of request.headers.entries()) {
            if (allowedHeaders.includes(key.toLowerCase())) {
                headers.set(key, value);
            }
        }

        // 设置默认User-Agent（如果没有提供）
        if (!headers.has('user-agent')) {
            headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        }

        // 根据文件类型设置Content-Type
        if (pathname.endsWith('.yaml')) {
            headers.set('Accept', 'text/yaml, text/plain, */*');
        } else if (pathname.endsWith('.txt')) {
            headers.set('Accept', 'text/plain, */*');
        } else {
            headers.set('Accept', 'application/json, text/plain, */*');
        }

        // 发送代理请求
        const response = await fetch(targetUrl, {
            method: request.method,
            headers: headers,
            body: request.body,
            // 设置超时
            signal: AbortSignal.timeout(30000) // 30秒超时
        });

        // 准备响应头
        const responseHeaders = new Headers(corsHeaders);

        // 复制重要的响应头
        const importantHeaders = ['content-type', 'content-length', 'content-encoding'];
        for (const header of importantHeaders) {
            const value = response.headers.get(header);
            if (value) {
                responseHeaders.set(header, value);
            }
        }

        // 根据路径设置特定的Content-Type
        if (pathname.endsWith('.yaml')) {
            responseHeaders.set('Content-Type', 'text/yaml; charset=utf-8');
        } else if (pathname.endsWith('.txt')) {
            responseHeaders.set('Content-Type', 'text/plain; charset=utf-8');
        }

        // 添加代理信息头
        responseHeaders.set('X-Proxy-By', 'Deno-CORS-Proxy');
        responseHeaders.set('X-Target-URL', targetUrl);

        console.log(`代理响应: ${response.status} ${response.statusText}`);

        return new Response(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders
        });

    } catch (error) {
        console.error('代理请求失败:', error);

        let errorMessage = '代理请求失败';
        let statusCode = 500;

        if (error.name === 'TimeoutError') {
            errorMessage = '请求超时';
            statusCode = 504;
        } else if (error.message.includes('fetch')) {
            errorMessage = '无法连接到目标服务器';
            statusCode = 502;
        }

        return new Response(JSON.stringify({
            error: errorMessage,
            details: error.message,
            target_url: targetUrl,
            timestamp: new Date().toISOString()
        }), {
            status: statusCode,
            headers: {
                'Content-Type': 'application/json',
                ...corsHeaders
            }
        });
    }
}, { port: 8000 });

function extractPrefixAndRest(pathname, prefixes) {
    for (const prefix of prefixes) {
        const regex = new RegExp(`^${prefix}`);
        if (regex.test(pathname)) {
            const match = pathname.match(regex);
            if (match) {
                const rest = pathname.slice(match[0].length);
                return [prefix, rest, match];
            }
        }
    }
    return [null, null, null];
}

console.log('🚀 CORS代理服务已启动在端口 8000');
console.log('支持的API端点:', Object.keys(apiMapping)); 