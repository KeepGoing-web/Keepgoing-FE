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
  const devApiTarget = env.VITE_DEV_API_TARGET || 'http://127.0.0.1:8080'

  return {
    plugins: [react()],
    server: {
      proxy: {
        '/api': createDevProxy(devApiTarget),
        '/oauth2': createDevProxy(devApiTarget),
        '/login/oauth2': createDevProxy(devApiTarget),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) return undefined

            if (
              id.includes('@tiptap') ||
              id.includes('prosemirror') ||
              id.includes('lowlight') ||
              id.includes('highlight.js') ||
              id.includes('tiptap-markdown')
            ) {
              return 'editor'
            }

            if (
              id.includes('mermaid') ||
              id.includes('@mermaid-js') ||
              id.includes('katex') ||
              id.includes('cytoscape') ||
              id.includes('dagre') ||
              id.includes('d3-')
            ) {
              return 'mermaid'
            }

            return undefined
          },
        },
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
