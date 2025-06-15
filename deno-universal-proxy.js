import { serve } from "https://deno.land/std/http/server.ts";

// CORS响应头
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept, Origin, User-Agent, X-Target-URL',
    'Access-Control-Max-Age': '86400', // 24小时
    'Access-Control-Allow-Credentials': 'false'
};

// 安全配置
const SECURITY_CONFIG = {
    // 允许的域名白名单（可选，留空表示允许所有）
    allowedDomains: [
        // 'csfaka.cn',
        // 'api-sms.pro',
        // 'your-trusted-domain.com'
    ],

    // 禁止的域名黑名单
    blockedDomains: [
        'localhost',
        '127.0.0.1',
        '0.0.0.0',
        '10.',
        '192.168.',
        '172.16.',
        'metadata.google.internal'
    ],

    // 最大请求大小 (字节)
    maxRequestSize: 10 * 1024 * 1024, // 10MB

    // 请求超时时间 (毫秒)
    requestTimeout: 30000, // 30秒
};

// 速率限制配置
const rateLimitMap = new Map();
const RATE_LIMIT = {
    windowMs: 60000, // 1分钟窗口
    maxRequests: 100, // 每分钟最多100个请求
};

// 检查速率限制
function checkRateLimit(clientIP) {
    const now = Date.now();

    if (!rateLimitMap.has(clientIP)) {
        rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT.windowMs });
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
    }

    const limit = rateLimitMap.get(clientIP);

    // 重置窗口
    if (now > limit.resetTime) {
        limit.count = 1;
        limit.resetTime = now + RATE_LIMIT.windowMs;
        return { allowed: true, remaining: RATE_LIMIT.maxRequests - 1 };
    }

    // 检查是否超过限制
    if (limit.count >= RATE_LIMIT.maxRequests) {
        return {
            allowed: false,
            remaining: 0,
            resetTime: limit.resetTime
        };
    }

    limit.count++;
    return { allowed: true, remaining: RATE_LIMIT.maxRequests - limit.count };
}

// 验证目标URL的安全性
function validateTargetUrl(urlString) {
    try {
        const url = new URL(urlString);

        // 检查协议
        if (!['http:', 'https:'].includes(url.protocol)) {
            return { valid: false, reason: '只支持HTTP和HTTPS协议' };
        }

        // 检查黑名单
        const hostname = url.hostname.toLowerCase();
        for (const blocked of SECURITY_CONFIG.blockedDomains) {
            if (hostname.includes(blocked)) {
                return { valid: false, reason: '目标域名被禁止访问' };
            }
        }

        // 检查白名单（如果配置了）
        if (SECURITY_CONFIG.allowedDomains.length > 0) {
            const allowed = SECURITY_CONFIG.allowedDomains.some(domain =>
                hostname.includes(domain.toLowerCase())
            );
            if (!allowed) {
                return { valid: false, reason: '目标域名不在允许列表中' };
            }
        }

        return { valid: true, url };
    } catch (error) {
        return { valid: false, reason: 'URL格式无效' };
    }
}

// 获取客户端IP
function getClientIP(request) {
    return request.headers.get('x-forwarded-for')?.split(',')[0] ||
        request.headers.get('x-real-ip') ||
        request.headers.get('cf-connecting-ip') ||
        'unknown';
}

serve(async (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const clientIP = getClientIP(request);

    // 处理根路径 - 显示服务状态和使用说明
    if (pathname === '/' || pathname === '/index.html') {
        return new Response(`
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>通用CORS代理服务</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
        .container { max-width: 800px; margin: 0 auto; background: rgba(255,255,255,0.1); padding: 30px; border-radius: 15px; backdrop-filter: blur(10px); }
        h1 { text-align: center; margin-bottom: 30px; }
        .endpoint { background: rgba(255,255,255,0.2); padding: 15px; margin: 10px 0; border-radius: 8px; }
        .code { background: rgba(0,0,0,0.3); padding: 10px; border-radius: 5px; font-family: monospace; margin: 10px 0; }
        .status { display: flex; justify-content: space-between; margin: 20px 0; }
        .status-item { text-align: center; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 通用CORS代理服务</h1>
        
        <div class="status">
            <div class="status-item">
                <h3>服务状态</h3>
                <p>✅ 运行中</p>
            </div>
            <div class="status-item">
                <h3>支持协议</h3>
                <p>HTTP/HTTPS</p>
            </div>
            <div class="status-item">
                <h3>速率限制</h3>
                <p>${RATE_LIMIT.maxRequests}/分钟</p>
            </div>
        </div>

        <div class="endpoint">
            <h3>📡 通用代理端点</h3>
            <div class="code">GET/POST /proxy?url=目标URL</div>
            <p>支持代理任意HTTP/HTTPS请求，自动处理CORS跨域问题。</p>
        </div>

        <div class="endpoint">
            <h3>🔧 使用示例</h3>
            <div class="code">
// JavaScript示例<br>
const proxyUrl = 'https://cors.elfs.pp.ua/proxy?url=';<br>
const targetUrl = 'https://api.example.com/data';<br>
<br>
fetch(proxyUrl + encodeURIComponent(targetUrl))<br>
&nbsp;&nbsp;.then(response => response.json())<br>
&nbsp;&nbsp;.then(data => console.log(data));<br>
<br>
// 接码面板API示例<br>
const smsApiUrl = 'https://csfaka.cn/api/sms';<br>
fetch('https://cors.elfs.pp.ua/proxy?url=' + encodeURIComponent(smsApiUrl))<br>
&nbsp;&nbsp;.then(response => response.json())<br>
&nbsp;&nbsp;.then(data => console.log('短信数据:', data));
            </div>
        </div>

        <div class="endpoint">
            <h3>🌟 更多使用示例</h3>
            <div class="code">
// POST请求示例<br>
fetch('https://cors.elfs.pp.ua/proxy?url=' + encodeURIComponent('https://api.example.com/submit'), {<br>
&nbsp;&nbsp;method: 'POST',<br>
&nbsp;&nbsp;headers: { 'Content-Type': 'application/json' },<br>
&nbsp;&nbsp;body: JSON.stringify({ key: 'value' })<br>
})<br>
<br>
// 带认证头的请求<br>
fetch('https://cors.elfs.pp.ua/proxy?url=' + encodeURIComponent('https://api.service.com/data'), {<br>
&nbsp;&nbsp;headers: { 'Authorization': 'Bearer your-token' }<br>
})<br>
<br>
// 接码API轮询示例<br>
async function pollSmsCode(phoneNumber) {<br>
&nbsp;&nbsp;const apiUrl = \`https://csfaka.cn/api/sms?phone=\${phoneNumber}\`;<br>
&nbsp;&nbsp;const response = await fetch('https://cors.elfs.pp.ua/proxy?url=' + encodeURIComponent(apiUrl));<br>
&nbsp;&nbsp;return await response.json();<br>
}
            </div>
        </div>

        <div class="endpoint">
            <h3>📋 请求头支持</h3>
            <p>支持转发以下请求头：</p>
            <ul>
                <li>Content-Type</li>
                <li>Authorization</li>
                <li>User-Agent</li>
                <li>Accept</li>
                <li>X-Requested-With</li>
            </ul>
        </div>

        <div class="endpoint">
            <h3>⚡ 性能特性</h3>
            <ul>
                <li>🔒 安全域名验证</li>
                <li>⏱️ 智能速率限制</li>
                <li>🚀 30秒请求超时</li>
                <li>📊 详细错误报告</li>
                <li>🌐 全球CDN加速</li>
            </ul>
        </div>
    </div >
</body >
</html >
            `, {
            status: 200,
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                ...corsHeaders
            }
        });
    }

    // 处理健康检查
    if (pathname === '/health') {
        return new Response(JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            uptime: process.uptime?.() || 'unknown',
            rateLimit: RATE_LIMIT
        }), {
            status: 200,
            headers: {
                'Content-Type': 'application/json',
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

    // 处理通用代理请求
    if (pathname === '/proxy') {
        // 检查速率限制
        const rateLimit = checkRateLimit(clientIP);
        if (!rateLimit.allowed) {
            return new Response(JSON.stringify({
                error: '请求频率过高',
                message: '已达到速率限制，请稍后重试',
                resetTime: new Date(rateLimit.resetTime).toISOString()
            }), {
                status: 429,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Remaining': '0',
                    'X-RateLimit-Reset': rateLimit.resetTime.toString(),
                    ...corsHeaders
                }
            });
        }

        // 获取目标URL
        const targetUrl = url.searchParams.get('url');
        if (!targetUrl) {
            return new Response(JSON.stringify({
                error: '缺少目标URL',
                message: '请在查询参数中提供url参数',
                example: 'https://cors.elfs.pp.ua/proxy?url=https://api.example.com/data'
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        // 验证目标URL
        const validation = validateTargetUrl(targetUrl);
        if (!validation.valid) {
            return new Response(JSON.stringify({
                error: 'URL验证失败',
                message: validation.reason,
                providedUrl: targetUrl
            }), {
                status: 400,
                headers: {
                    'Content-Type': 'application/json',
                    ...corsHeaders
                }
            });
        }

        console.log(`[${new Date().toISOString()}]代理请求: ${request.method} ${targetUrl} (来自: ${clientIP})`);

        try {
            // 准备请求头
            const proxyHeaders = new Headers();

            // 允许转发的请求头
            const allowedHeaders = [
                'accept', 'content-type', 'authorization', 'user-agent',
                'x-requested-with', 'cache-control', 'pragma', 'accept-language',
                'accept-encoding', 'referer'
            ];

            // 复制允许的请求头
            for (const [key, value] of request.headers.entries()) {
                if (allowedHeaders.includes(key.toLowerCase())) {
                    proxyHeaders.set(key, value);
                }
            }

            // 设置默认User-Agent（如果没有提供）
            if (!proxyHeaders.has('user-agent')) {
                proxyHeaders.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
            }

            // 设置Accept头（如果没有提供）
            if (!proxyHeaders.has('accept')) {
                proxyHeaders.set('Accept', 'application/json, text/plain, text/html, */*');
            }

            // 发送代理请求
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), SECURITY_CONFIG.requestTimeout);

            const proxyResponse = await fetch(validation.url, {
                method: request.method,
                headers: proxyHeaders,
                body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            // 准备响应头
            const responseHeaders = new Headers(corsHeaders);

            // 复制重要的响应头
            const importantResponseHeaders = [
                'content-type', 'content-length', 'content-encoding',
                'cache-control', 'expires', 'last-modified', 'etag'
            ];

            for (const header of importantResponseHeaders) {
                const value = proxyResponse.headers.get(header);
                if (value) {
                    responseHeaders.set(header, value);
                }
            }

            // 添加代理信息头
            responseHeaders.set('X-Proxy-By', 'Deno-Universal-CORS-Proxy');
            responseHeaders.set('X-Target-URL', targetUrl);
            responseHeaders.set('X-Proxy-Status', proxyResponse.status.toString());
            responseHeaders.set('X-RateLimit-Remaining', rateLimit.remaining.toString());

            console.log(`[${new Date().toISOString()}]代理响应: ${proxyResponse.status} ${proxyResponse.statusText} `);

            return new Response(proxyResponse.body, {
                status: proxyResponse.status,
                statusText: proxyResponse.statusText,
                headers: responseHeaders
            });

        } catch (error) {
            console.error(`[${new Date().toISOString()}]代理错误: `, error);

            let errorMessage = '代理请求失败';
            let statusCode = 500;

            if (error.name === 'AbortError') {
                errorMessage = '请求超时';
                statusCode = 504;
            } else if (error.message.includes('fetch')) {
                errorMessage = '无法连接到目标服务器';
                statusCode = 502;
            } else if (error.message.includes('SSL') || error.message.includes('certificate')) {
                errorMessage = 'SSL证书验证失败';
                statusCode = 502;
            }

            return new Response(JSON.stringify({
                error: errorMessage,
                details: error.message,
                targetUrl: targetUrl,
                timestamp: new Date().toISOString(),
                suggestion: statusCode === 504 ? '目标服务器响应缓慢，请稍后重试' : '请检查目标URL是否正确且可访问'
            }), {
                status: statusCode,
                headers: {
                    'Content-Type': 'application/json',
                    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
                    ...corsHeaders
                }
            });
        }
    }

    // 处理未知路径
    return new Response(JSON.stringify({
        error: '端点未找到',
        message: '请使用 https://cors.elfs.pp.ua/proxy?url=目标URL 进行代理请求',
        availableEndpoints: [
            'https://cors.elfs.pp.ua/ - 服务状态页面',
            'https://cors.elfs.pp.ua/health - 健康检查',
            'https://cors.elfs.pp.ua/proxy?url=目标URL - 通用代理'
        ]
    }), {
        status: 404,
        headers: {
            'Content-Type': 'application/json',
            ...corsHeaders
        }
    });
}, { port: 8000 });

console.log('🚀 通用CORS代理服务已启动');
console.log('📡 端口: 8000');
console.log('🔗 代理端点: /proxy?url=目标URL');
console.log('⚡ 速率限制:', `${RATE_LIMIT.maxRequests} 请求 / 分钟`);
console.log('⏱️ 请求超时:', `${SECURITY_CONFIG.requestTimeout / 1000} 秒`);

// 定期清理过期的速率限制记录
setInterval(() => {
    const now = Date.now();
    for (const [ip, data] of rateLimitMap.entries()) {
        if (now > data.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 60000); // 每分钟清理一次 