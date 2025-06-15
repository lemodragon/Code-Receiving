import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import https from 'https';

// Create a custom HTTPS agent to handle connection issues
const httpsAgent = new https.Agent({
  rejectUnauthorized: false,
  keepAlive: true,
  timeout: 60000,
  maxSockets: 10,
  maxFreeSockets: 5
});

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: process.env.NODE_ENV === 'production' ? '/Code-Receiving/' : '/',
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/api-proxy/csfaka': {
        target: 'https://csfaka.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/csfaka/, ''),
        secure: false,
        timeout: 60000,
        agent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error for csfaka:', err.message);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'application/json',
              });
              res.end(JSON.stringify({
                error: 'Proxy connection failed',
                message: 'External API service is temporarily unavailable. Please try again later.',
                details: err.message
              }));
            }
          });

          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request to csfaka:', req.url);
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received response from csfaka:', proxyRes.statusCode);
          });
        }
      },
      '/api-proxy/api-sms': {
        target: 'https://www.api-sms.pro',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-proxy\/api-sms/, ''),
        secure: false,
        timeout: 60000,
        agent: httpsAgent,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'text/plain, */*',
          'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        },
        configure: (proxy, options) => {
          proxy.on('error', (err, req, res) => {
            console.log('Proxy error for api-sms:', err.message);
            if (!res.headersSent) {
              res.writeHead(500, {
                'Content-Type': 'text/plain',
              });
              res.end('External API service is temporarily unavailable. Please try again later.');
            }
          });

          proxy.on('proxyReq', (proxyReq, req, res) => {
            console.log('Proxying request to api-sms:', req.url);
          });

          proxy.on('proxyRes', (proxyRes, req, res) => {
            console.log('Received response from api-sms:', proxyRes.statusCode);
          });
        }
      }
    }
  }
});