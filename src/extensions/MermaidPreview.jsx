import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'
import mermaid from 'mermaid'
import DOMPurify from 'dompurify'
import { initMermaidWithTheme } from '../utils/mermaidTheme'

function sanitizeMermaidSvg(svg) {
  if (typeof svg !== 'string' || !svg) return ''
  return DOMPurify.sanitize(svg, {
    USE_PROFILES: { svg: true, svgFilters: true },
    ADD_TAGS: ['use'],
    KEEP_CONTENT: true,
  })
}

const mermaidPluginKey = new PluginKey('mermaidPreview')

let renderCounter = 0


function clearChildren(element) {
  while (element.firstChild) {
    element.removeChild(element.firstChild)
  }
}

function createEmptyMessage(text) {
  const empty = document.createElement('div')
  empty.className = 'mermaid-empty'
  empty.textContent = text
  return empty
}

function createErrorMessage(message) {
  const wrapper = document.createElement('div')
  wrapper.className = 'mermaid-error'

  const icon = document.createElement('span')
  icon.className = 'mermaid-error-icon'
  icon.textContent = '!'

  const text = document.createElement('span')
  text.className = 'mermaid-error-text'
  text.textContent = message

  wrapper.appendChild(icon)
  wrapper.appendChild(text)
  return wrapper
}

async function renderMermaidWidget(container, code) {
  if (!code.trim()) {
    clearChildren(container)
    container.appendChild(createEmptyMessage('다이어그램 코드를 입력하세요'))
    return
  }

  try {
    initMermaidWithTheme()
    const id = `mermaid-editor-${++renderCounter}`
    const { svg } = await mermaid.render(id, code.trim())
    clearChildren(container)
    const svgWrapper = document.createElement('div')
    svgWrapper.className = 'mermaid-svg'
    svgWrapper.innerHTML = sanitizeMermaidSvg(svg)
    container.appendChild(svgWrapper)
  } catch (err) {
    clearChildren(container)
    container.appendChild(createErrorMessage(err?.message || '렌더링 실패'))
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
  const headerLabel = document.createElement('span')
  headerLabel.className = 'mermaid-label'
  headerLabel.textContent = 'Mermaid Preview'
  header.appendChild(headerLabel)
  wrapper.appendChild(header)

  // Body
  const body = document.createElement('div')
  body.className = 'mermaid-preview-body'
  body.appendChild(createEmptyMessage('렌더링 중...'))
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
