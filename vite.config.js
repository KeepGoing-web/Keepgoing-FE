import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

function createDevProxy(target) {
  return {
    target,
    changeOrigin: true,
    secure: false,
    configure(proxy) {
      proxy.on('proxyReq', (proxyReq) => {
        proxyReq.removeHeader('origin')
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://localhost:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': createDevProxy(devApiTarget),
        '/oauth2': createDevProxy(devApiTarget),
        '/login/oauth2': createDevProxy(devApiTarget),
      },
    },
    test: {
      globals: true,
      environment: 'jsdom',
      setupFiles: './src/test/setup.js',
      css: true,
      exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
    },
  }
})
