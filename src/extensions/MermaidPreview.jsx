import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import mermaid from 'mermaid'

const mermaidPluginKey = new PluginKey('mermaidPreview')

let renderCounter = 0

function initMermaid() {
  const theme = document.documentElement.getAttribute('data-theme')
  mermaid.initialize({
    startOnLoad: false,
    theme: theme === 'light' ? 'default' : 'dark',
    fontFamily: 'var(--font-sans)',
    themeVariables:
      theme === 'light'
        ? {
            primaryColor: '#d1fae5',
            primaryTextColor: '#1e293b',
            primaryBorderColor: '#0d9488',
            lineColor: '#64748b',
            secondaryColor: '#e2e8f0',
            tertiaryColor: '#f1f5f9',
          }
        : {
            primaryColor: '#1e3a3a',
            primaryTextColor: '#cdd6f4',
            primaryBorderColor: '#2dd4bf',
            lineColor: '#6c7086',
            secondaryColor: '#313244',
            tertiaryColor: '#1e1e2e',
          },
  })
}

async function renderMermaidWidget(container, code) {
  if (!code.trim()) {
    container.innerHTML = '<div class="mermaid-empty">다이어그램 코드를 입력하세요</div>'
    return
  }

  try {
    initMermaid()
    const id = `mermaid-editor-${++renderCounter}`
    const { svg } = await mermaid.render(id, code.trim())
    container.innerHTML = `<div class="mermaid-svg">${svg}</div>`
  } catch (err) {
    container.innerHTML = `<div class="mermaid-error"><span class="mermaid-error-icon">!</span><span class="mermaid-error-text">${err?.message || '렌더링 실패'}</span></div>`
    // Clean up orphaned elements
    document.querySelectorAll('[id^="dmermaid-editor-"]').forEach((el) => el.remove())
  }
}

function createMermaidWidget(code) {
  const wrapper = document.createElement('div')
  wrapper.className = 'mermaid-preview-widget'
  wrapper.contentEditable = 'false'

  // Header
  const header = document.createElement('div')
  header.className = 'mermaid-preview-header'
  header.innerHTML = '<span class="mermaid-label">Mermaid Preview</span>'
  wrapper.appendChild(header)

  // Body
  const body = document.createElement('div')
  body.className = 'mermaid-preview-body'
  body.innerHTML = '<div class="mermaid-empty">렌더링 중...</div>'
  wrapper.appendChild(body)

  // Render asynchronously
  renderMermaidWidget(body, code)

  return wrapper
}

/**
 * MermaidPreview — Tiptap Extension
 *
 * Adds widget decorations after mermaid code blocks to show
 * a live SVG preview. Non-invasive: doesn't modify the codeBlock
 * schema, so tiptap-markdown serialization is unaffected.
 */
const MermaidPreview = Extension.create({
  name: 'mermaidPreview',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: mermaidPluginKey,
        state: {
          init(_, state) {
            return buildDecorations(state)
          },
          apply(tr, oldDecos, oldState, newState) {
            if (tr.docChanged) {
              return buildDecorations(newState)
            }
            return oldDecos
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

function buildDecorations(state) {
  const decorations = []
  state.doc.descendants((node, pos) => {
    if (node.type.name === 'codeBlock' && node.attrs.language === 'mermaid') {
      const code = node.textContent
      const endPos = pos + node.nodeSize

      const widget = Decoration.widget(endPos, () => createMermaidWidget(code), {
        side: 1,
        key: `mermaid-${pos}-${code.length}`,
      })
      decorations.push(widget)
    }
  })
  return DecorationSet.create(state.doc, decorations)
}

export default MermaidPreview
