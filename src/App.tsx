import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, Settings, Send, RefreshCw, Check, Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronUp, Copy, MessageSquare, Clock, CheckCircle, AlertTriangle, Activity } from 'lucide-react';

interface TableRow {
  index: number;
  phone: string;
  api: string;
  sendApi?: string;
  apiConfig: APIConfig;
  status: string;
  countdown: number;
  timer: any;
  sms: string;
  sendCooldown: number;
  sendTimer: any;
  lastSendTime: number;
  hasSent?: boolean;
  importedAsUsed?: boolean;
  lastSendResult?: string;
  isExpanded?: boolean;
}

interface APIConfig {
  id: string;
  name: string;
  isDefault?: boolean;
  urlPattern: RegExp;
  responseType: 'text' | 'json';
  parseRule: {
    success: (data: any) => boolean;
    extractSms: (data: any) => string;
    noSmsMessage: string;
  };
  inputPatterns: RegExp[];
  sendUrlPattern?: RegExp;
  sendResponseType?: 'text' | 'json';
  sendParseRule?: {
    success: (data: any) => boolean | 'rate_limit';
    extractMessage: (data: any) => string;
    cooldownTime: number;
    getEndTime?: (data: any) => string | null;
  };
}

function App() {
  const [tableData, setTableData] = useState<TableRow[]>([]);
  const [inputText, setInputText] = useState('');
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [showApiConfig, setShowApiConfig] = useState(false);
  const [apiConfigs, setApiConfigs] = useState<APIConfig[]>([]);
  const [newApiConfig, setNewApiConfig] = useState({
    name: '',
    type: 'text' as 'text' | 'json',
    url: '',
    sendUrl: '',
    patterns: '',
    noSms: '',
    cooldown: 120
  });

  // 添加自定义代理配置
  const [customProxy, setCustomProxy] = useState('');
  const [showProxyConfig, setShowProxyConfig] = useState(false);

  const [apiStatus, setApiStatus] = useState<{ [key: string]: 'checking' | 'online' | 'offline' | 'unknown' }>({});

  const fileInputRef = useRef<HTMLInputElement>(null);

  // 统一的环境检测函数
  const isProductionEnvironment = () => {
    return import.meta.env.PROD ||
      window.location.hostname.includes('github.io') ||
      window.location.hostname.includes('netlify.app') ||
      window.location.hostname.includes('vercel.app') ||
      (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1'));
  };

  // Helper function to convert external URL to proxy URL
  const getProxyUrl = (originalUrl: string, isSendSmsRequest = false) => {
    // 检查是否已经是代理URL，避免双重包装
    if (originalUrl.includes('allorigins.win') ||
      originalUrl.includes('cors.elfs.pp.ua') ||
      originalUrl.includes('test.cors.workers.dev')) {
      console.log('🔍 检测到已是代理URL，直接返回:', originalUrl.substring(0, 80) + '...');
      return originalUrl;
    }

    // 检测是否为生产环境（GitHub Pages、Netlify或其他静态托管）
    const isProduction = isProductionEnvironment();

    // 获取当前环境信息
    const envInfo = {
      isProduction,
      host: window.location.hostname,
      isGithubPages: window.location.hostname.includes('github.io'),
      isNetlify: window.location.hostname.includes('netlify.app'),
      isVercel: window.location.hostname.includes('vercel.app'),
      isSendSmsRequest
    };

    console.log('环境检测:', envInfo);

    if (isProduction) {
      // 优先使用用户的自定义代理，特别是对于发码请求
      if ((isSendSmsRequest || originalUrl.includes('/sendSms')) && customProxy) {
        // 发码请求强制使用自定义代理（如果已配置）
        let proxyUrl;
        if (customProxy.includes('proxy?url=')) {
          // Deno代理格式：https://cors.elfs.pp.ua/proxy?url=
          proxyUrl = customProxy + encodeURIComponent(originalUrl);
        } else if (customProxy.endsWith('/')) {
          // 其他代理格式
          proxyUrl = customProxy + originalUrl;
        } else {
          // 其他格式代理
          proxyUrl = customProxy + originalUrl;
        }
        console.log('🎯 强制使用自定义代理处理发码请求:', {
          原始URL: originalUrl,
          代理URL: proxyUrl.substring(0, 80) + '...',
          代理服务: customProxy,
          代理类型: customProxy.includes('cors.elfs.pp.ua') ? 'Deno代理' : '其他自定义代理'
        });
        return proxyUrl;
      } else if (isSendSmsRequest || originalUrl.includes('/sendSms')) {
        // 发码请求但没有自定义代理，警告用户
        console.warn('⚠️ 发码请求但未配置自定义代理，可能会失败。建议配置: https://cors.elfs.pp.ua/proxy?url=');
        // 回退到allorigins代理，但成功率较低
        const fallbackProxy = 'https://api.allorigins.win/raw?url=' + encodeURIComponent(originalUrl);
        console.log('使用备用代理处理发码请求:', {
          原始URL: originalUrl,
          代理URL: fallbackProxy.substring(0, 80) + '...'
        });
        return fallbackProxy;
      } else {
        // 普通GET请求（包括接收短信）- 如果有自定义代理也可以使用
        if (customProxy && originalUrl.includes('csfaka.cn')) {
          // 接收短信请求如果配置了自定义代理，也优先使用
          const proxyUrl = customProxy + encodeURIComponent(originalUrl);
          console.log('✅ 接收短信请求使用自定义代理:', {
            原始URL: originalUrl,
            代理URL: proxyUrl.substring(0, 80) + '...',
            代理服务: customProxy.includes('cors.elfs.pp.ua') ? 'Deno代理' : '其他自定义代理'
          });
          return proxyUrl;
        } else {
          // 使用allorigins作为默认代理，但不强制只用它
          const primaryProxy = 'https://api.allorigins.win/raw?url=';
          const proxyUrl = primaryProxy + encodeURIComponent(originalUrl);
          console.log('✅ 使用allorigins代理处理普通请求:', {
            原始URL: originalUrl,
            代理URL: proxyUrl.substring(0, 80) + '...'
          });
          return proxyUrl;
        }
      }
    } else {
      // 开发环境：使用Vite代理配置
      if (originalUrl.includes('csfaka.cn')) {
        const proxyUrl = originalUrl.replace('https://csfaka.cn', '/api-proxy/csfaka');
        console.log('开发环境使用Vite代理:', {
          原始URL: originalUrl,
          代理URL: proxyUrl
        });
        return proxyUrl;
      } else if (originalUrl.includes('api-sms.pro')) {
        const proxyUrl = originalUrl.replace('https://www.api-sms.pro', '/api-proxy/api-sms');
        console.log('开发环境使用Vite代理:', {
          原始URL: originalUrl,
          代理URL: proxyUrl
        });
        return proxyUrl;
      }
    }

    console.log('不使用代理:', originalUrl);
    return originalUrl;
  };

  // Enhanced fetch function with retry logic and better error handling
  const fetchWithRetry = async (url: string, options: RequestInit = {}, maxRetries = 2, isSendSmsRequest = false): Promise<Response> => {
    let lastError: Error;
    const isProduction = isProductionEnvironment();

    // 如果没有明确指定，则通过URL检查是否是发码请求
    if (!isSendSmsRequest) {
      isSendSmsRequest = url.includes('/sendSms');
    }

    // 过滤掉已知失效的代理服务，只保留可用的代理
    const corsProxies = [
      'https://api.allorigins.win/raw?url=',
      'https://test.cors.workers.dev/?'
    ];

    console.log('fetchWithRetry 开始处理:', {
      url: url.substring(0, 50) + '...',
      isSendSmsRequest,
      isProduction,
      customProxy: customProxy || '无',
      corsProxiesCount: corsProxies.length
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      let currentUrl = url;

      // 在生产环境中，第一次尝试就应该使用代理
      if (isProduction) {
        if (attempt === 0) {
          // 第一次尝试：使用getProxyUrl获取代理URL
          currentUrl = getProxyUrl(url, isSendSmsRequest);
          console.log(`第一次尝试使用代理: ${currentUrl.substring(0, 50)}...`);
        } else {
          // 重试时：使用备用代理
          // 提取原始URL - 识别各种代理格式
          let originalUrl = url;

          // 检查是否已经是代理URL，如果是则提取原始URL
          if (url.includes('api.allorigins.win/raw?url=')) {
            originalUrl = decodeURIComponent(url.split('url=')[1]);
          } else if (url.includes('test.cors.workers.dev/?')) {
            originalUrl = decodeURIComponent(url.split('test.cors.workers.dev/?')[1]);
          } else if (url.includes('cors.elfs.pp.ua/proxy?url=')) {
            // 处理Deno代理格式
            originalUrl = decodeURIComponent(url.split('proxy?url=')[1]);
          }

          // 为发码请求在备用代理列表前加上自定义代理
          // 为接收短信请求也添加自定义代理支持（如果配置了）
          let allProxies = [...corsProxies];
          if (isSendSmsRequest && customProxy) {
            allProxies = [customProxy, ...corsProxies];
          } else if (!isSendSmsRequest && customProxy && originalUrl.includes('csfaka.cn')) {
            // 接收短信请求也可以使用自定义代理作为备用选项
            allProxies = [customProxy, ...corsProxies];
            console.log('📱 接收短信请求启用自定义代理备用重试:', customProxy);
          }

          // 尝试备用代理
          const proxyIndex = (attempt - 1) % allProxies.length;
          const selectedProxy = allProxies[proxyIndex];

          // 检查originalUrl是否已经包含协议，如果没有则添加https://
          if (!originalUrl.startsWith('http')) {
            originalUrl = 'https://' + originalUrl;
          }

          // 根据代理格式构建URL
          if (selectedProxy.includes('url=')) {
            // AllOrigins格式: ...?url=
            currentUrl = selectedProxy + encodeURIComponent(originalUrl);
          } else if (selectedProxy.includes('proxy?url=')) {
            // Deno代理格式: ...proxy?url=
            currentUrl = selectedProxy + encodeURIComponent(originalUrl);
          } else if (selectedProxy.includes('test.cors.workers.dev/?')) {
            // Cloudflare代理格式: .../?
            currentUrl = selectedProxy + encodeURIComponent(originalUrl);
          } else {
            // 其他格式，直接拼接
            currentUrl = selectedProxy + originalUrl;
          }

          const isUsingCustomProxy = selectedProxy === customProxy || selectedProxy.includes('cors.elfs.pp.ua');
          console.log(`${isUsingCustomProxy ? '重试自定义代理' : '尝试备用代理'} ${proxyIndex + 1}: ${selectedProxy}，原始URL: ${originalUrl.substring(0, 30)}...`);
        }
      }

      try {
        const controller = new AbortController();
        // 发码请求使用更长超时时间，避免过早中止
        const timeoutMs = isSendSmsRequest ? 30000 : 10000;
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        // 添加详细日志
        console.log(`🔄 请求 #${attempt + 1} 到: ${currentUrl.substring(0, 50)}...`);

        // 检查是否是发码请求，添加特殊处理
        let fetchOptions = { ...options };

        // 移除对发码请求的特殊处理，将其视为普通GET请求
        // 只保留基本的请求头
        fetchOptions = {
          ...fetchOptions,
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            ...fetchOptions.headers
          }
        };

        // 添加详细的请求日志
        console.log(`📤 发送请求: ${currentUrl.substring(0, 50)}...`, {
          isSendSmsRequest,
          超时时间: `${timeoutMs / 1000}秒`,
          代理类型: currentUrl.includes('cors.elfs.pp.ua') ? '自定义代理' :
            currentUrl.includes('allorigins.win') ? 'allorigins' :
              currentUrl.includes('test.cors.workers.dev') ? 'cloudflare' : '其他',
          attempt: attempt + 1
        });

        const response = await fetch(currentUrl, fetchOptions);

        clearTimeout(timeoutId);

        // 添加响应日志
        console.log(`响应 #${attempt + 1} 状态: ${response.status} ${response.statusText}`);

        // 检查响应状态
        if (response.ok) {
          return response;
        } else if (response.status === 403) {
          // 403错误（如cors-anywhere）快速跳过到下一个代理
          console.warn(`❌ 代理返回403 Forbidden，快速跳过到下一个代理...`);
          if (attempt < maxRetries && isProduction) {
            // 不等待，直接尝试下一个代理
            continue;
          }
        } else if (response.status === 429) {
          // 速率限制，等待后重试
          console.warn(`速率限制 (429)，等待后重试...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 2000 * (attempt + 1)));
            continue;
          }
        } else if (response.status >= 500) {
          // 服务器错误，可以重试
          console.warn(`服务器错误 (${response.status})，准备重试...`);
          if (attempt < maxRetries) {
            await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
            continue;
          }
        }

        // 对于其他错误状态，仍然返回响应让调用者处理
        return response;

      } catch (error) {
        lastError = error as Error;
        console.warn(`尝试 ${attempt + 1} 失败:`, error);

        // 如果是网络错误且在生产环境，快速尝试备用代理
        if (isProduction && attempt < maxRetries) {
          // 减少等待时间，加快代理切换
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
          continue;
        }

        // 如果不是最后一次尝试，等待后重试
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
        }
      }
    }

    throw lastError!;
  };

  // API服务状态检测函数
  const checkApiStatus = async (apiUrl: string): Promise<'online' | 'offline'> => {
    try {
      const proxyUrl = getProxyUrl(apiUrl);
      const response = await fetchWithRetry(proxyUrl, {}, 1); // 只尝试一次

      // 429频率限制说明API服务正常，只是请求太频繁
      if (response.status === 429) {
        console.log('检测到429频率限制，API服务正常:', apiUrl.substring(0, 50));
        return 'online'; // API在线，只是频率限制
      }

      return response.ok ? 'online' : 'offline';
    } catch (error) {
      console.warn('API状态检测失败:', error);
      return 'offline';
    }
  };

  // 批量检测API状态 - 改为串行检测避免频率限制
  const checkAllApiStatus = async () => {
    const uniqueApis = [...new Set(tableData.map(row => row.api))];
    const statusUpdates: { [key: string]: 'checking' | 'online' | 'offline' } = {};

    // 设置所有API为检测中状态
    uniqueApis.forEach(api => {
      statusUpdates[api] = 'checking';
    });
    setApiStatus(statusUpdates);

    console.log(`🔍 开始串行检测 ${uniqueApis.length} 个API状态，避免频率限制...`);

    // 串行检测API状态，添加延迟避免频率限制
    const finalStatus: { [key: string]: 'online' | 'offline' } = {};

    for (let i = 0; i < uniqueApis.length; i++) {
      const api = uniqueApis[i];
      console.log(`检测API ${i + 1}/${uniqueApis.length}: ${api.substring(0, 50)}...`);

      try {
        const status = await checkApiStatus(api);
        finalStatus[api] = status;

        // 更新单个API状态
        setApiStatus(prev => ({
          ...prev,
          [api]: status
        }));

        console.log(`API ${i + 1} 检测完成: ${status}`);
      } catch (error) {
        console.warn(`API ${i + 1} 检测失败:`, error);
        finalStatus[api] = 'offline';
        setApiStatus(prev => ({
          ...prev,
          [api]: 'offline'
        }));
      }

      // 添加延迟避免频率限制（最后一个请求不需要延迟）
      if (i < uniqueApis.length - 1) {
        console.log('等待0.8秒后检测下一个API...(Deno代理限制100次/分钟)');
        await new Promise(resolve => setTimeout(resolve, 800));
      }
    }

    console.log('✅ API状态检测完成:', finalStatus);

    // 测试发码代理是否工作正常
    if (uniqueApis.length > 0 && uniqueApis.some(api => api.includes('sendSms'))) {
      console.log('检测到发码API，测试代理服务...');
      const sendSmsApi = uniqueApis.find(api => api.includes('sendSms'));
      if (sendSmsApi) {
        try {
          const proxyUrl = getProxyUrl(sendSmsApi, true);
          console.log('发码API代理测试:', {
            原始URL: sendSmsApi,
            代理URL: proxyUrl,
            使用代理: proxyUrl !== sendSmsApi,
            代理服务: proxyUrl.includes('cors.elfs.pp.ua') ? 'Deno代理' :
              proxyUrl.includes('allorigins.win') ? 'allorigins.win' :
                proxyUrl.includes('test.cors.workers.dev') ? 'cloudflare' : '其他代理'
          });
        } catch (error) {
          console.error('发码代理测试失败:', error);
        }
      }
    }
  };

  // 初始化默认API配置
  useEffect(() => {
    const defaultConfigs: APIConfig[] = [
      {
        id: 'api-sms-pro',
        name: 'API-SMS.PRO',
        isDefault: true,
        urlPattern: /https:\/\/www\.api-sms\.pro\/api\/get_sms\?key=([a-zA-Z0-9]+)/,
        responseType: 'text',
        parseRule: {
          success: (text) => text !== 'no|暂无验证码' && !text.includes('暂无验证码'),
          extractSms: (text) => text,
          noSmsMessage: 'no|暂无验证码'
        },
        inputPatterns: [
          /^(\d{10,})\s+.*?(https:\/\/www\.api-sms\.pro\/api\/get_sms\?key=[a-zA-Z0-9]+)/,
          /^\+1\s?(\d{10,})----(https:\/\/www\.api-sms\.pro\/api\/get_sms\?key=[a-zA-Z0-9]+)/
        ]
      },
      {
        id: 'csfaka-cn',
        name: 'CSFAKA.CN',
        isDefault: true,
        urlPattern: /https:\/\/csfaka\.cn\/api\/Sms\/receive\?key=([a-zA-Z0-9]+)/,
        responseType: 'json',
        parseRule: {
          success: (data) => data.status === 200 && data.data && !data.data.includes('暂时没有收到短信'),
          extractSms: (data) => data.data || '未获取到短信',
          noSmsMessage: '暂时没有收到短信，请耐心等待'
        },
        inputPatterns: [
          /^(\d{10,})\s+.*?(https:\/\/csfaka\.cn\/api\/Sms\/receive\?key=[a-zA-Z0-9]+)/,
          /^\+1\s?(\d{10,})----(https:\/\/csfaka\.cn\/api\/Sms\/receive\?key=[a-zA-Z0-9]+)/
        ],
        sendUrlPattern: /https:\/\/csfaka\.cn\/api\/Sms\/sendSms\?key=([a-zA-Z0-9]+)/,
        sendResponseType: 'json',
        sendParseRule: {
          success: (data: any) => {
            // 根据实际API响应格式调整判断逻辑
            // status 200 = 发码成功
            // status 201 = 频率限制，需要特殊处理但不算失败
            if (data.status === 200) {
              return true; // 发码成功
            } else if (data.status === 201) {
              return 'rate_limit'; // 频率限制，特殊返回值
            }
            return false;
          },
          extractMessage: (data: any) => {
            // 对于频率限制，提供更清晰的信息
            if (data.status === 201) {
              const endTime = data.end_time;
              const baseMsg = data.msg || '请求太频繁，请稍后再试';

              if (endTime) {
                // 计算剩余时间
                const endDate = new Date(endTime);
                const now = new Date();
                const remainingMs = endDate.getTime() - now.getTime();
                const remainingMinutes = Math.ceil(remainingMs / 60000);

                if (remainingMinutes > 0) {
                  return `${baseMsg}（预计 ${remainingMinutes} 分钟后可用）`;
                } else {
                  return `${baseMsg}（现在应该可以重试了）`;
                }
              }

              // 如果有嵌套的message，优先使用
              if (data.data && data.data.data && data.data.data.message) {
                return `频率限制: ${data.data.data.message}`;
              }

              return `频率限制: ${baseMsg}`;
            }

            // 成功或其他情况的处理
            if (data.msg) {
              return data.msg;
            }
            // 检查嵌套的message字段
            if (data.data && typeof data.data === 'object') {
              if (data.data.data && data.data.data.message) {
                return data.data.data.message || '发送完成';
              }
              if (data.data.message) {
                return data.data.message;
              }
            }
            return '发送完成';
          },
          cooldownTime: 120,
          getEndTime: (data: any) => data.end_time || null
        }
      }
    ];

    setApiConfigs(defaultConfigs);
    loadConfig(defaultConfigs);

    // 加载自定义代理配置
    try {
      const savedProxy = localStorage.getItem('customProxy');
      if (savedProxy) {
        setCustomProxy(savedProxy);
        console.log('已加载自定义代理:', savedProxy);
      } else {
        // 默认使用新的Deno代理
        setCustomProxy('https://cors.elfs.pp.ua/proxy?url=');
        console.log('已加载自定义代理: https://cors.elfs.pp.ua/proxy?url=');
      }
    } catch (error) {
      console.error('加载代理配置失败:', error);
      setCustomProxy('https://cors.elfs.pp.ua/proxy?url=');
    }
  }, []);

  const saveConfig = (configs: APIConfig[]) => {
    try {
      const customConfigs = configs.filter(config => !config.isDefault);
      const configsToSave = customConfigs.map(config => ({
        ...config,
        urlPattern: config.urlPattern.toString(),
        inputPatterns: config.inputPatterns.map(pattern => pattern.toString()),
        sendUrlPattern: config.sendUrlPattern?.toString()
      }));

      localStorage.setItem('apiConfigs', JSON.stringify(configsToSave));
      console.log('API配置保存成功:', {
        配置数量: configsToSave.length,
        配置: configsToSave.map(c => c.name)
      });
      return true;
    } catch (error) {
      console.error('保存配置失败:', error);
      return false;
    }
  };

  const loadConfig = (defaultConfigs: APIConfig[]) => {
    try {
      const saved = localStorage.getItem('apiConfigs');
      if (saved) {
        const loadedConfigs = JSON.parse(saved);
        console.log('从本地存储加载API配置:', {
          配置数量: loadedConfigs.length,
          配置: loadedConfigs.map((c: any) => c.name)
        });

        loadedConfigs.forEach((config: any) => {
          if (config.urlPattern && typeof config.urlPattern === 'string') {
            const match = config.urlPattern.match(/^\/(.+)\/([gimuy]*)$/);
            if (match) {
              config.urlPattern = new RegExp(match[1], match[2]);
            }
          }
          if (config.inputPatterns) {
            config.inputPatterns = config.inputPatterns.map((pattern: string) => {
              const match = pattern.match(/^\/(.+)\/([gimuy]*)$/);
              if (match) {
                return new RegExp(match[1], match[2]);
              }
              return pattern;
            });
          }
          if (config.sendUrlPattern && typeof config.sendUrlPattern === 'string') {
            const match = config.sendUrlPattern.match(/^\/(.+)\/([gimuy]*)$/);
            if (match) {
              config.sendUrlPattern = new RegExp(match[1], match[2]);
            }
          }
        });

        setApiConfigs([...defaultConfigs, ...loadedConfigs]);
        console.log('API配置加载完成, 总配置数:', defaultConfigs.length + loadedConfigs.length);
      } else {
        console.log('未找到保存的API配置，使用默认配置');
      }
    } catch (error) {
      console.error('加载配置失败:', error);
    }
  };

  // 重新排序函数
  const reorderTableData = (data: TableRow[]) => {
    return data.map((row, index) => ({
      ...row,
      index: index + 1
    }));
  };

  const parseData = () => {
    const text = inputText.trim();
    const lines = text.split('\n').filter(line => line.trim());
    const existPhones = new Set(tableData.filter(d => d.status === '已使用').map(d => d.phone));
    const newData: TableRow[] = [];

    lines.forEach(line => {
      let matched = false;

      // 首先尝试解析4-URL格式
      const fourUrlMatch = line.match(/^(\d{10,})\s+(https:\/\/[^\s]+\/sendSms[^\s]*)\s+(https:\/\/[^\s]+\/receive[^\s]*)\s+(https:\/\/[^\s]+)/);
      if (fourUrlMatch) {
        const phone = fourUrlMatch[1];
        const sendApi = fourUrlMatch[2];
        const receiveApi = fourUrlMatch[3];

        const matchedConfig = apiConfigs.find(config => config.urlPattern.test(receiveApi)) || apiConfigs[0];

        if (!existPhones.has(phone)) {
          newData.push({
            index: 0, // 临时设置为0，稍后重新排序
            phone: phone,
            api: receiveApi,
            sendApi: sendApi,
            apiConfig: matchedConfig,
            status: '未使用',
            countdown: 0,
            timer: null,
            sms: '未获取',
            sendCooldown: 0,
            sendTimer: null,
            lastSendTime: 0,
            isExpanded: false
          });
        }
        matched = true;
      }

      if (!matched) {
        for (const config of apiConfigs) {
          for (const pattern of config.inputPatterns) {
            const match = line.match(pattern);
            if (match) {
              const phone = match[1];
              const api = match[2];

              if (!existPhones.has(phone)) {
                newData.push({
                  index: 0, // 临时设置为0，稍后重新排序
                  phone: phone,
                  api: api,
                  sendApi: undefined,
                  apiConfig: config,
                  status: '未使用',
                  countdown: 0,
                  timer: null,
                  sms: '未获取',
                  sendCooldown: 0,
                  sendTimer: null,
                  lastSendTime: 0,
                  isExpanded: false
                });
              }
              matched = true;
              break;
            }
          }
          if (matched) break;
        }
      }
    });

    const existingUsedData = tableData.filter(d => d.status === '已使用').map(d => ({
      ...d,
      importedAsUsed: true,
      isExpanded: false
    }));

    const combinedData = [...existingUsedData, ...newData];
    const reorderedData = reorderTableData(combinedData);
    setTableData(reorderedData);
  };

  const fetchSms = async (apiUrl: string, config: APIConfig) => {
    console.log(`🌐 发送HTTP请求获取短信: ${apiUrl.substring(0, 80)}...`);

    // 直接传递原始URL给fetchWithRetry，让它内部处理代理逻辑，避免双重代理
    const response = await fetchWithRetry(apiUrl);

    console.log(`📡 收到HTTP响应: 状态${response.status} ${response.statusText}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    let data;

    if (config.responseType === 'json') {
      const text = await response.text();
      console.log(`📄 收到JSON响应文本: ${text.substring(0, 200)}...`);
      try {
        data = JSON.parse(text);
        console.log(`✅ JSON解析成功:`, data);
      } catch (jsonError) {
        console.error(`❌ JSON解析失败:`, jsonError);
        throw new Error(`JSON解析失败: 响应内容不是有效的JSON格式。响应内容: ${text.substring(0, 200)}...`);
      }
    } else {
      data = await response.text();
      console.log(`📄 收到文本响应: ${data.substring(0, 200)}...`);
    }

    const result = {
      success: config.parseRule.success(data),
      sms: config.parseRule.extractSms(data),
      raw: data
    };

    console.log(`🔍 短信解析结果:`, {
      success: result.success,
      sms: result.sms.substring(0, 100) + '...',
      configName: config.name
    });

    return result;
  };

  const toggleExpanded = (idx: number) => {
    setTableData(prevData => {
      const updatedData = [...prevData];
      updatedData[idx] = {
        ...updatedData[idx],
        isExpanded: !updatedData[idx].isExpanded
      };
      return updatedData;
    });
  };

  const sendOrRefresh = async (idx: number) => {
    const row = tableData[idx];
    if (row.status === '已使用') return;

    const config = row.apiConfig || apiConfigs[0];

    if (!row.hasSent) {
      console.log(`📨 首次发送短信请求 - 行${idx + 1}, API: ${row.api.substring(0, 50)}...`);

      // 创建倒计时定时器
      const timer = setInterval(() => {
        setTableData(prevData => {
          const updatedData = [...prevData];
          const currentRow = { ...updatedData[idx] };
          currentRow.countdown = Math.max(0, currentRow.countdown - 1);

          if (currentRow.countdown <= 0) {
            if (currentRow.timer) {
              clearInterval(currentRow.timer);
            }
            currentRow.timer = null;
          }

          updatedData[idx] = currentRow;
          return updatedData;
        });
      }, 1000);

      // 一次性设置所有初始状态，包括定时器
      setTableData(prevData => {
        const updatedData = [...prevData];
        updatedData[idx] = {
          ...updatedData[idx],
          hasSent: true,
          countdown: 60,
          sms: '获取中...',
          isExpanded: true,
          timer: timer
        };
        return updatedData;
      });

      try {
        const result = await fetchSms(row.api, config);
        console.log(`✅ 首次获取成功 - 行${idx + 1}, 获取到短信:`, result.sms.substring(0, 100) + '...');

        // 只更新短信内容，保持其他状态不变
        setTableData(prevData => {
          const updatedData = [...prevData];
          updatedData[idx] = { ...updatedData[idx], sms: result.sms };
          return updatedData;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`❌ 首次获取失败 - 行${idx + 1}:`, error);

        // 只更新短信内容，保持其他状态不变
        setTableData(prevData => {
          const updatedData = [...prevData];
          updatedData[idx] = { ...updatedData[idx], sms: `请求失败: ${errorMessage}` };
          return updatedData;
        });
      }
    } else {
      // 刷新逻辑：使用函数式状态更新避免状态过时问题
      setTableData(prevData => {
        const updatedData = [...prevData];
        updatedData[idx] = { ...updatedData[idx], sms: '刷新中...', isExpanded: true };
        return updatedData;
      });

      console.log(`🔄 开始刷新短信 - 行${idx + 1}, API: ${row.api.substring(0, 50)}...`);

      try {
        const result = await fetchSms(row.api, config);
        console.log(`✅ 刷新成功 - 行${idx + 1}, 获取到短信:`, result.sms.substring(0, 100) + '...');

        // 使用函数式状态更新确保使用最新状态
        setTableData(prevData => {
          const updatedData = [...prevData];
          updatedData[idx] = { ...updatedData[idx], sms: result.sms };
          return updatedData;
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        console.error(`❌ 刷新失败 - 行${idx + 1}:`, error);

        // 使用函数式状态更新确保使用最新状态
        setTableData(prevData => {
          const updatedData = [...prevData];
          updatedData[idx] = { ...updatedData[idx], sms: `请求失败: ${errorMessage}` };
          return updatedData;
        });
      }
    }
  };

  // 验证发码状态的函数


  const sendSms = async (idx: number) => {
    const row = tableData[idx];
    if (row.status === '已使用' || !row.sendApi) return;

    const config = row.apiConfig;
    if (!config || !config.sendParseRule) {
      alert('该API不支持发码功能');
      return;
    }

    if (row.sendCooldown > 0) return;

    // 设置发码中状态
    setTableData(prevData => {
      const updatedData = [...prevData];
      updatedData[idx] = {
        ...updatedData[idx],
        isExpanded: true,
        lastSendResult: '发码中...'
      };
      return updatedData;
    });

    try {
      // 发码请求直接传递原始URL给fetchWithRetry，让它内部处理代理逻辑
      console.log('发送发码请求到:', row.sendApi);

      // 明确标识这是发码请求，不进行重试，用户手动重试
      const response = await fetchWithRetry(row.sendApi, {}, 0, true);

      // 只要请求发送成功（没有网络错误），就认定为成功并开启120秒冷却
      console.log('发码请求已发送，响应状态:', response.status);

      // 创建发码冷却定时器
      const sendTimer = setInterval(() => {
        setTableData(prevData => {
          const updatedData = [...prevData];
          const currentRow = { ...updatedData[idx] };
          currentRow.sendCooldown = Math.max(0, currentRow.sendCooldown - 1);

          if (currentRow.sendCooldown <= 0) {
            if (currentRow.sendTimer) {
              clearInterval(currentRow.sendTimer);
            }
            currentRow.sendTimer = null;
          }

          updatedData[idx] = currentRow;
          return updatedData;
        });
      }, 1000);

      // 一次性设置成功状态和冷却时间
      setTableData(prevData => {
        const updatedData = [...prevData];
        updatedData[idx] = {
          ...updatedData[idx],
          lastSendResult: '✅ 发码请求已发送',
          sendCooldown: 120,
          sendTimer: sendTimer
        };
        return updatedData;
      });

    } catch (error) {
      console.error('发码请求失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';

      let userFriendlyMessage = '';

      // 简化错误处理，专注于网络层面错误
      if (errorMessage.includes('AbortError') || errorMessage.includes('timeout') || errorMessage.includes('signal is aborted')) {
        userFriendlyMessage = `⏰ 网络超时: 请求可能已发送，请稍后重试`;
      } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
        userFriendlyMessage = `🌐 网络连接失败: 请检查网络连接`;
      } else {
        userFriendlyMessage = `❌ 发码请求失败: ${errorMessage}`;
      }

      // 设置错误状态，不设置冷却
      setTableData(prevData => {
        const updatedData = [...prevData];
        updatedData[idx] = {
          ...updatedData[idx],
          lastSendResult: userFriendlyMessage
        };
        return updatedData;
      });
    }
  };

  const markDone = (idx: number) => {
    setTableData(prevData => {
      const updatedData = [...prevData];
      const currentRow = { ...updatedData[idx] };

      // 清理定时器
      if (currentRow.timer) {
        clearInterval(currentRow.timer);
      }
      if (currentRow.sendTimer) {
        clearInterval(currentRow.sendTimer);
      }

      // 更新状态
      currentRow.status = '已使用';
      currentRow.isExpanded = false;
      currentRow.timer = null;
      currentRow.sendTimer = null;
      currentRow.countdown = 0;
      currentRow.sendCooldown = 0;

      updatedData[idx] = currentRow;
      return updatedData;
    });
  };

  const exportCSV = () => {
    let csv = '\uFEFF';
    csv += '手机号,发码API,接收API,状态\n';

    tableData.forEach(row => {
      const sendApi = row.sendApi || '';
      csv += `${row.phone},${sendApi},${row.api},${row.status}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '接码数据.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const importCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const newData: TableRow[] = [];

      lines.forEach((line, idx) => {
        if (idx === 0 && line.includes('手机号')) return;

        const arr = line.split(',');
        if (arr.length < 2) return;

        const phone = arr[0].replace(/"/g, '').trim();
        let api, sendApi = undefined, status;

        if (arr.length >= 4) {
          sendApi = arr[1].replace(/"/g, '').trim() || undefined;
          api = arr[2].replace(/"/g, '').trim();
          status = arr[3].replace(/"/g, '').trim();
        } else if (arr.length === 3) {
          api = arr[1].replace(/"/g, '').trim();
          status = arr[2].replace(/"/g, '').trim();
        } else {
          api = arr[1].replace(/"/g, '').trim();
          status = '未使用';
        }

        if (status === '已完成') status = '已使用';

        if (phone && api && phone.match(/^\d{10,}$/)) {
          const matchedConfig = apiConfigs.find(config => config.urlPattern.test(api)) || apiConfigs[0];

          newData.push({
            index: 0, // 临时设置为0，稍后重新排序
            phone,
            api,
            sendApi,
            apiConfig: matchedConfig,
            status,
            countdown: 0,
            timer: null,
            sms: '未获取',
            sendCooldown: 0,
            sendTimer: null,
            lastSendTime: 0,
            importedAsUsed: status === '已使用',
            isExpanded: false
          });
        }
      });

      const reorderedData = reorderTableData(newData);
      setTableData(reorderedData);
    };
    reader.readAsText(file, 'utf-8');
  };

  const addApiConfig = () => {
    const { name, type, url, sendUrl, patterns, noSms, cooldown } = newApiConfig;

    if (!name || !url || !patterns || !noSms) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      const inputPatterns = patterns.split('\n')
        .filter(p => p.trim())
        .map(p => new RegExp(p.trim()));

      const urlPattern = new RegExp(url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.*'));

      let parseRule;
      if (type === 'json') {
        parseRule = {
          success: (data: any) => {
            try {
              return data && !JSON.stringify(data).includes(noSms);
            } catch {
              return false;
            }
          },
          extractSms: (data: any) => {
            if (typeof data === 'object' && data.data) {
              return data.data;
            }
            return JSON.stringify(data);
          },
          noSmsMessage: noSms
        };
      } else {
        parseRule = {
          success: (text: any) => Boolean(text && !text.includes(noSms)),
          extractSms: (text: any) => String(text),
          noSmsMessage: noSms
        };
      }

      const newConfig: APIConfig = {
        id: 'custom-' + Date.now(),
        name: name,
        urlPattern: urlPattern,
        responseType: type,
        parseRule: parseRule,
        inputPatterns: inputPatterns
      };

      if (sendUrl) {
        const sendUrlPattern = new RegExp(sendUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace('\\*', '.*'));
        newConfig.sendUrlPattern = sendUrlPattern;
        newConfig.sendResponseType = type;
        newConfig.sendParseRule = {
          success: (data: any) => {
            if (type === 'json') {
              return data && (data.status === 200 || data.status === 201);
            } else {
              return data && !data.includes('失败') && !data.includes('错误');
            }
          },
          extractMessage: (data: any) => {
            if (type === 'json') {
              return data.msg || data.message || '发送完成';
            } else {
              return data;
            }
          },
          cooldownTime: cooldown,
          getEndTime: (data: any) => {
            if (type === 'json' && data.end_time) {
              return data.end_time;
            }
            return null;
          }
        };
      }

      const updatedConfigs = [...apiConfigs, newConfig];
      setApiConfigs(updatedConfigs);
      saveConfig(updatedConfigs);

      setNewApiConfig({
        name: '',
        type: 'text',
        url: '',
        sendUrl: '',
        patterns: '',
        noSms: '',
        cooldown: 120
      });

      alert('API配置添加成功！');
    } catch (error) {
      alert('配置格式错误：' + (error as Error).message);
    }
  };

  const deleteApiConfig = (index: number) => {
    const config = apiConfigs[index];
    if (config.isDefault) {
      alert('默认配置不可删除！');
      return;
    }
    if (confirm('确定要删除这个API配置吗？')) {
      const updatedConfigs = apiConfigs.filter((_, i) => i !== index);
      setApiConfigs(updatedConfigs);
      saveConfig(updatedConfigs);
    }
  };

  // 智能短信内容渲染函数
  const renderSmsContent = (sms: string, lastSendResult?: string) => {
    // 检查是否是错误信息
    if (sms.includes('请求失败') || sms.includes('网络连接失败')) {
      return (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span className="text-sm font-medium text-red-700">连接错误</span>
            </div>
            <div className="mt-2 text-sm text-red-800 break-all">{sms}</div>
            <div className="mt-3 text-xs text-red-600">
              💡 提示: 这通常是由于外部API服务暂时不可用导致的，请稍后重试
            </div>
          </div>
        </div>
      );
    }

    // 检查是否是JSON格式的验证码短信
    const isJsonSms = sms.startsWith('{') && sms.includes('"code"');

    if (isJsonSms) {
      try {
        const data = JSON.parse(sms);
        const code = data.data?.match(/\d{4,8}/)?.[0] || data.code;
        const message = data.data || data.msg || sms;

        return (
          <div className="space-y-3">
            {code && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    <span className="text-sm font-medium text-green-700">验证码</span>
                  </div>
                  <button
                    onClick={() => navigator.clipboard.writeText(code)}
                    className="flex items-center gap-1 px-3 py-1 bg-green-100 hover:bg-green-200 text-green-700 rounded-lg text-xs transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </button>
                </div>
                <div className="mt-2 text-2xl font-mono font-bold text-green-800 tracking-wider">
                  {code}
                </div>
              </div>
            )}
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span className="text-sm font-medium text-purple-700">短信内容</span>
              </div>
              <div className="text-sm text-purple-800 break-all">{message}</div>
            </div>
            {data.code_time && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-700">接收时间: {data.code_time}</span>
                </div>
              </div>
            )}
          </div>
        );
      } catch {
        // JSON解析失败，按普通文本处理
      }
    }

    // 检查是否是文本格式的验证码
    const codeMatch = sms.match(/\b(\d{4,8})\b/);
    if (codeMatch && (sms.includes('验证码') || sms.includes('code') || sms.includes('verification'))) {
      const code = codeMatch[1];
      return (
        <div className="space-y-3">
          <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-blue-700">验证码</span>
              </div>
              <button
                onClick={() => navigator.clipboard.writeText(code)}
                className="flex items-center gap-1 px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg text-xs transition-colors"
              >
                <Copy className="w-3 h-3" />
                复制
              </button>
            </div>
            <div className="mt-2 text-2xl font-mono font-bold text-blue-800 tracking-wider">
              {code}
            </div>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-gray-600" />
              <span className="text-sm font-medium text-gray-700">完整内容</span>
            </div>
            <div className="text-sm text-gray-800 break-all">{sms}</div>
          </div>
        </div>
      );
    }

    // 状态信息特殊处理
    if (sms === '获取中...' || sms === '刷新中...') {
      return (
        <div className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-orange-700">{sms}</span>
          </div>
        </div>
      );
    }

    // 普通文本内容
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="w-4 h-4 text-gray-600" />
          <span className="text-sm font-medium text-gray-700">短信内容</span>
        </div>
        <div className="text-sm text-gray-800 break-all">{sms}</div>
        {lastSendResult && (
          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-1">
              {lastSendResult.includes('❌') || lastSendResult.includes('错误') ? (
                <AlertTriangle className="w-4 h-4 text-red-600" />
              ) : lastSendResult.includes('⏱️') ? (
                <Clock className="w-4 h-4 text-orange-600" />
              ) : lastSendResult.includes('✨') ? (
                <Activity className="w-4 h-4 text-purple-600" />
              ) : (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
              <span className={`text-xs font-medium ${lastSendResult.includes('❌') || lastSendResult.includes('错误')
                ? 'text-red-700'
                : lastSendResult.includes('⏱️')
                  ? 'text-orange-700'
                  : lastSendResult.includes('✨')
                    ? 'text-purple-700'
                    : 'text-green-700'
                }`}>
                发码结果
              </span>
            </div>
            <div className={`text-xs ${lastSendResult.includes('❌') || lastSendResult.includes('错误')
              ? 'text-red-800'
              : lastSendResult.includes('⏱️')
                ? 'text-orange-800'
                : lastSendResult.includes('✨')
                  ? 'text-purple-800'
                  : 'text-green-800'
              }`}>
              {lastSendResult}
            </div>
          </div>
        )}
      </div>
    );
  };

  const collapsibleRecords = tableData.filter(d => d.status === '已使用' && d.importedAsUsed);
  const visibleData = tableData.filter(row => {
    if (isCollapsed && row.status === '已使用' && row.importedAsUsed) {
      return false;
    }
    return true;
  });

  // 保存自定义代理配置
  const saveCustomProxy = (proxy: string) => {
    try {
      localStorage.setItem('customProxy', proxy);
      setCustomProxy(proxy);
      console.log('自定义代理保存成功:', proxy);
      return true;
    } catch (error) {
      console.error('保存自定义代理失败:', error);
      return false;
    }
  };

  // 测试代理功能
  const testProxy = async () => {
    if (!customProxy) {
      alert('请先设置代理URL');
      return;
    }

    try {
      // 使用一个简单的测试URL
      const testUrl = 'https://httpbin.org/get';
      const proxyUrl = customProxy.includes('proxy?url=') ?
        customProxy + encodeURIComponent(testUrl) :
        customProxy + testUrl;

      console.log('测试代理:', {
        原始URL: testUrl,
        代理URL: proxyUrl,
        代理服务: customProxy
      });

      const startTime = Date.now();
      const response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      if (response.ok) {
        const data = await response.text();
        console.log('代理测试成功:', {
          状态: response.status,
          响应时间: responseTime + 'ms',
          响应大小: data.length + ' bytes'
        });

        alert(`✅ 代理测试成功！\n状态: ${response.status}\n响应时间: ${responseTime}ms\n代理服务正常工作`);
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('代理测试失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert(`❌ 代理测试失败！\n错误: ${errorMessage}\n请检查代理URL是否正确或代理服务是否可用`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 via-blue-50 to-cyan-100 relative">
      {/* 背景装饰 */}
      <div className="absolute inset-0 bg-gradient-to-r from-purple-400/10 via-pink-400/10 to-blue-400/10"></div>
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]"></div>

      <div className="relative z-10 container mx-auto px-4 py-8 pb-20">
        {/* 标题 */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-blue-600 bg-clip-text text-transparent mb-2">
            接码数据管理面板
          </h1>
          <p className="text-gray-600 text-lg">现代化短信接收与管理系统</p>
        </div>

        {/* 导入区域 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8 transition-all duration-300 hover:shadow-3xl hover:bg-white/90">
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="w-full h-32 p-4 border-2 border-gray-200 rounded-2xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 resize-none bg-gray-50/50 backdrop-blur-sm"
            placeholder="请粘贴您的接码数据文本..."
          />

          <div className="flex flex-wrap gap-4 mt-6">
            <button
              onClick={parseData}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Upload className="w-4 h-4" />
              导入文本
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Upload className="w-4 h-4" />
              导入CSV
            </button>

            <button
              onClick={exportCSV}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Download className="w-4 h-4" />
              导出CSV
            </button>

            <button
              onClick={checkAllApiStatus}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-500 text-white rounded-full hover:from-blue-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Activity className="w-4 h-4" />
              检测API状态
              <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">串行检测</span>
            </button>

            <button
              onClick={() => setShowApiConfig(!showApiConfig)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Settings className="w-4 h-4" />
              API配置
            </button>

            <button
              onClick={() => setShowProxyConfig(!showProxyConfig)}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-indigo-500 text-white rounded-full hover:from-purple-600 hover:to-indigo-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
            >
              <Settings className="w-4 h-4" />
              代理设置
            </button>
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={importCSV}
          />
        </div>

        {/* 代理配置区域 */}
        {showProxyConfig && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8 transition-all duration-500 transform">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              代理服务配置
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  自定义代理URL (用于发码请求)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customProxy}
                    onChange={(e) => setCustomProxy(e.target.value)}
                    placeholder="例如: https://cors.elfs.pp.ua/proxy?url="
                    className="flex-1 p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                  />
                  <button
                    onClick={() => saveCustomProxy(customProxy)}
                    className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    保存
                  </button>
                  <button
                    onClick={testProxy}
                    className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl hover:from-green-600 hover:to-emerald-600 transition-all duration-300 shadow-lg hover:shadow-xl"
                  >
                    测试
                  </button>
                </div>
                <p className="mt-2 text-sm text-gray-500">
                  注意: 代理URL格式示例: https://cors.elfs.pp.ua/proxy?url=
                </p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <h4 className="font-medium text-blue-800 mb-2">推荐代理服务</h4>
                <ul className="space-y-2">
                  <li className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomProxy('https://cors.elfs.pp.ua/proxy?url=')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      https://cors.elfs.pp.ua/proxy?url= (Deno代理)
                    </button>
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">推荐</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">100次/分钟</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomProxy('https://api.allorigins.win/raw?url=')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      https://api.allorigins.win/raw?url= (AllOrigins)
                    </button>
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full">20次/分钟</span>
                    <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">备用</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <button
                      onClick={() => setCustomProxy('https://test.cors.workers.dev/?')}
                      className="text-blue-600 hover:text-blue-800 text-sm"
                    >
                      https://test.cors.workers.dev/? (Cloudflare)
                    </button>
                    <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">无明确限制</span>
                    <span className="text-xs bg-orange-100 text-orange-800 px-2 py-0.5 rounded-full">新增</span>
                  </li>

                </ul>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-600" />
                  <h4 className="font-medium text-yellow-800">当前代理状态</h4>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-yellow-700">
                    当前代理: <span className="font-mono font-bold">{customProxy || '无'}</span>
                  </p>
                  <p className="text-sm text-yellow-700">
                    代理格式: <span className="font-medium">
                      {customProxy?.includes('proxy?url=') ? 'Deno代理格式 ✅' :
                        customProxy?.endsWith('/') ? '直接拼接格式' : '其他格式'}
                    </span>
                  </p>
                  <p className="text-sm text-yellow-700">
                    环境: <span className="font-medium">
                      {isProductionEnvironment() ? '生产环境 (使用代理)' : '开发环境 (使用Vite代理)'}
                    </span>
                  </p>
                </div>
                <div className="mt-3 pt-3 border-t border-yellow-200">
                  <p className="text-xs text-yellow-600">
                    💡 提示: 点击"测试"按钮验证代理是否正常工作。如果发码功能不正常，请尝试更换代理服务。
                  </p>
                  <p className="text-xs text-yellow-600 mt-1">
                    ⚠️ 注意: 大量API检测可能触发代理频率限制(429错误)，现已优化为串行检测并添加延迟。
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* API配置区域 */}
        {showApiConfig && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-8 mb-8 transition-all duration-500 transform">
            <h3 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Settings className="w-6 h-6" />
              API配置管理
            </h3>

            {/* 当前配置列表 */}
            <div className="space-y-3 mb-8">
              {apiConfigs.map((config, index) => (
                <div key={config.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl border border-gray-200">
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-800">{config.name}</span>
                    <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">{config.responseType}</span>
                    {config.isDefault && (
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">默认</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => deleteApiConfig(index)}
                      disabled={config.isDefault}
                      className="p-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* 添加新配置 */}
            <div className="border-t border-gray-200 pt-8">
              <h4 className="text-lg font-semibold text-gray-800 mb-4">添加新API配置</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <input
                  type="text"
                  placeholder="API名称"
                  value={newApiConfig.name}
                  onChange={(e) => setNewApiConfig({ ...newApiConfig, name: e.target.value })}
                  className="p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                />
                <select
                  value={newApiConfig.type}
                  onChange={(e) => setNewApiConfig({ ...newApiConfig, type: e.target.value as 'text' | 'json' })}
                  className="p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                >
                  <option value="text">文本响应</option>
                  <option value="json">JSON响应</option>
                </select>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="接收API URL模式"
                  value={newApiConfig.url}
                  onChange={(e) => setNewApiConfig({ ...newApiConfig, url: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                />

                <input
                  type="text"
                  placeholder="发送API URL模式 (可选)"
                  value={newApiConfig.sendUrl}
                  onChange={(e) => setNewApiConfig({ ...newApiConfig, sendUrl: e.target.value })}
                  className="w-full p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                />

                <textarea
                  placeholder="输入文本匹配模式 (每行一个正则表达式)"
                  value={newApiConfig.patterns}
                  onChange={(e) => setNewApiConfig({ ...newApiConfig, patterns: e.target.value })}
                  className="w-full h-20 p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300 resize-none"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder="无短信时的响应内容"
                    value={newApiConfig.noSms}
                    onChange={(e) => setNewApiConfig({ ...newApiConfig, noSms: e.target.value })}
                    className="p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                  />

                  <input
                    type="number"
                    placeholder="发码冷却时间（秒）"
                    value={newApiConfig.cooldown}
                    onChange={(e) => setNewApiConfig({ ...newApiConfig, cooldown: parseInt(e.target.value) || 120 })}
                    className="p-3 border-2 border-gray-200 rounded-xl focus:border-purple-400 focus:ring-4 focus:ring-purple-100 transition-all duration-300"
                  />
                </div>
              </div>

              <div className="flex gap-4 mt-6">
                <button
                  onClick={addApiConfig}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full hover:from-purple-600 hover:to-pink-600 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Plus className="w-4 h-4" />
                  添加配置
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 折叠摘要 */}
        {collapsibleRecords.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 p-6 mb-8 transition-all duration-300 hover:shadow-3xl">
            <div
              className="flex items-center justify-between cursor-pointer"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              <div className="flex items-center gap-4">
                <span className="text-lg font-semibold text-gray-800">📁 已使用号码</span>
                <span className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full text-sm font-medium">
                  {collapsibleRecords.length}
                </span>
                <span className="text-gray-600">个记录{isCollapsed ? '已折叠' : '已展开'}</span>
              </div>
              <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 text-white rounded-full hover:from-purple-600 hover:to-blue-600 transition-all duration-300 shadow-lg hover:shadow-xl">
                {isCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                <span>{isCollapsed ? '展开查看' : '收起隐藏'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 数据表格 */}
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/30 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-purple-500 to-blue-500 text-white">
                  <th className="px-4 py-4 text-left font-semibold">序号</th>
                  <th className="px-4 py-4 text-left font-semibold">手机号</th>
                  <th className="px-4 py-4 text-left font-semibold">API Key</th>
                  <th className="px-4 py-4 text-left font-semibold">收码操作</th>
                  <th className="px-4 py-4 text-left font-semibold">发码操作</th>
                  <th className="px-4 py-4 text-left font-semibold">状态</th>
                  <th className="px-4 py-4 text-left font-semibold">操作</th>
                </tr>
              </thead>
              <tbody>
                {visibleData.map((row, i) => {
                  const originalIndex = tableData.indexOf(row);
                  const keyMatch = row.api.match(/key=([a-zA-Z0-9]+)/);
                  const key = keyMatch ? keyMatch[1] : row.api;

                  return (
                    <React.Fragment key={i}>
                      <tr
                        className={`transition-all duration-300 hover:bg-gradient-to-r hover:from-purple-50 hover:to-blue-50 ${row.status === '已使用' ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-l-4 border-green-400' : ''
                          } ${row.isExpanded ? 'border-b-0' : ''}`}
                      >
                        <td className="px-4 py-4 font-medium text-gray-800">{row.index}</td>
                        <td className="px-4 py-4 font-mono text-gray-800">{row.phone}</td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <a
                              href={row.api}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:text-blue-800 font-mono text-sm underline decoration-dotted"
                            >
                              {key}
                            </a>
                            {/* API状态指示器 */}
                            {apiStatus[row.api] && (
                              <div className="flex items-center">
                                {apiStatus[row.api] === 'checking' && (
                                  <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" title="检测中..."></div>
                                )}
                                {apiStatus[row.api] === 'online' && (
                                  <div className="w-2 h-2 bg-green-400 rounded-full" title="API在线"></div>
                                )}
                                {apiStatus[row.api] === 'offline' && (
                                  <div className="w-2 h-2 bg-red-400 rounded-full" title="API离线"></div>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => sendOrRefresh(originalIndex)}
                            disabled={row.countdown > 0 || row.status === '已使用'}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-full hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                          >
                            {row.countdown > 0 ? (
                              <>⏰ {row.countdown}s</>
                            ) : (
                              <>
                                {row.hasSent ? <RefreshCw className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                                {row.hasSent ? '刷新' : '发送'}
                              </>
                            )}
                          </button>
                        </td>
                        <td className="px-4 py-4">
                          {row.sendApi ? (
                            <button
                              onClick={() => sendSms(originalIndex)}
                              disabled={row.sendCooldown > 0 || row.status === '已使用'}
                              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-full hover:from-orange-600 hover:to-red-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                            >
                              {row.sendCooldown > 0 ? (
                                <>⏰ {row.sendCooldown}s</>
                              ) : (
                                <>
                                  <Send className="w-4 h-4" />
                                  发码
                                </>
                              )}
                            </button>
                          ) : (
                            <span className="text-gray-400 text-sm">不支持</span>
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${row.status === '已使用'
                            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800'
                            : 'bg-gradient-to-r from-orange-100 to-red-100 text-orange-800'
                            }`}>
                            {row.status}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex gap-2">
                            <button
                              onClick={() => toggleExpanded(originalIndex)}
                              className="flex items-center gap-1 px-3 py-1 bg-gradient-to-r from-gray-500 to-gray-600 text-white rounded-full hover:from-gray-600 hover:to-gray-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              {row.isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                              <span className="text-xs">{row.isExpanded ? '收起' : '详情'}</span>
                            </button>
                            <button
                              onClick={() => markDone(originalIndex)}
                              disabled={row.status === '已使用'}
                              className="flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-full hover:from-green-600 hover:to-emerald-600 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none"
                            >
                              <Check className="w-3 h-3" />
                              <span className="text-xs">完成</span>
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* 折叠的短信内容行 */}
                      {row.isExpanded && (
                        <tr className="bg-gradient-to-r from-gray-50 to-blue-50 border-l-4 border-blue-400">
                          <td colSpan={7} className="px-4 py-6">
                            <div className="max-w-4xl">
                              <div className="flex items-center gap-2 mb-4">
                                <MessageSquare className="w-5 h-5 text-blue-600" />
                                <span className="text-lg font-semibold text-gray-800">短信详情</span>
                              </div>
                              {renderSmsContent(row.sms, row.lastSendResult)}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 底部信息 */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-white/30 z-50">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
            <span>🔒 本工具不存储不上传任何数据，请放心使用</span>
            <a
              href="https://demo.lvdpub.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-purple-600 hover:text-purple-800 font-medium transition-colors"
            >
              ✨ 联系作者
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default App;