import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
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
})
