import Image from '@tiptap/extension-image'
import { Plugin } from 'prosemirror-state'

function parsePublicIdFromTitle(title) {
  if (!title) return null
  const match = String(title).match(/publicId:([^;]+)/)
  return match ? match[1] : null
}

const ResizableImage = Image.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      onDeleteImage: null,
      onDeletePreviewImage: null,
    }
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
    }
  },

  /**
   * ProseMirror plugin that detects when image nodes are removed from the document
   * by ANY means — delete button, Backspace/Delete key, cut, range delete,
   * select-all + paste, setContent replacement, etc.
   *
   * On each state change, it diffs the set of known image srcs against the current
   * document. If an image disappeared:
   *  - with a publicId → calls onDeleteImage(publicId) to clean up the backend
   *  - without a publicId (preview/blob) → calls onDeletePreviewImage(src) so the
   *    editor can handle upload cancellation
   */
  addProseMirrorPlugins() {
    let prevImageMap = null

    return [
      new Plugin({
        view: () => ({
          update: (view) => {
            const currMap = new Map()
            view.state.doc.descendants((node) => {
              if (node.type.name === 'image') {
                const publicId = parsePublicIdFromTitle(node.attrs.title)
                currMap.set(node.attrs.src, { publicId })
              }
            })

            if (prevImageMap) {
              for (const [src, { publicId }] of prevImageMap) {
                if (!currMap.has(src)) {
                  if (publicId) {
                    this.options.onDeleteImage?.(publicId)
                  } else {
                    this.options.onDeletePreviewImage?.(src)
                  }
                }
              }
            }

            prevImageMap = currMap
          },
          destroy: () => {
            prevImageMap = null
          },
        }),
      }),
    ]
  },

  addNodeView() {
    return ({ node: initialNode, getPos, editor }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'resizable-image-wrapper'

      const currentAttrs = { ...initialNode.attrs }

      const img = document.createElement('img')
      img.src = currentAttrs.src
      img.alt = currentAttrs.alt || ''
      img.title = currentAttrs.title || ''
      img.draggable = false

      if (currentAttrs.width) {
        img.style.width = currentAttrs.width
      }
      if (currentAttrs.height) {
        img.style.height = currentAttrs.height
      }
      img.style.maxWidth = '100%'
      img.style.display = 'block'

      wrapper.appendChild(img)

      const handle = document.createElement('div')
      handle.className = 'resize-handle'
      wrapper.appendChild(handle)

      const deleteBtn = document.createElement('button')
      deleteBtn.className = 'resizable-image-delete-btn'
      deleteBtn.setAttribute('type', 'button')
      deleteBtn.setAttribute('aria-label', '이미지 삭제')
      deleteBtn.innerHTML =
        '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>'

      // Delete button only dispatches the node-removal transaction.
      // The ProseMirror plugin above detects the removal and calls
      // onDeleteImage / onDeletePreviewImage automatically.
      deleteBtn.addEventListener('pointerdown', (e) => {
        e.preventDefault()
        e.stopPropagation()

        if (!editor.isEditable) return

        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos !== null) {
          editor.view.dispatch(editor.view.state.tr.delete(pos, pos + initialNode.nodeSize))
        }
      })

      wrapper.appendChild(deleteBtn)

      let startX = 0
      let startY = 0
      let startWidth = 0
      let startHeight = 0
      let aspectRatio = 1
      let active = false

      const onPointerDown = (e) => {
        if (!editor.isEditable) return
        e.preventDefault()
        active = true
        startX = e.clientX
        startY = e.clientY
        startWidth = img.offsetWidth || img.naturalWidth || 300
        startHeight = img.offsetHeight || img.naturalHeight || 200
        aspectRatio = startWidth / startHeight

        document.addEventListener('pointermove', onPointerMove)
        document.addEventListener('pointerup', onPointerUp)
        document.body.style.userSelect = 'none'
        document.body.style.cursor = 'se-resize'
      }

      const onPointerMove = (e) => {
        if (!active) return
        const dx = e.clientX - startX
        const newWidth = Math.max(50, startWidth + dx)
        const newHeight = Math.round(newWidth / aspectRatio)
        img.style.width = `${Math.round(newWidth)}px`
        img.style.height = `${newHeight}px`
      }

      const onPointerUp = () => {
        if (!active) return
        active = false
        document.removeEventListener('pointermove', onPointerMove)
        document.removeEventListener('pointerup', onPointerUp)
        document.body.style.userSelect = ''
        document.body.style.cursor = ''

        const pos = typeof getPos === 'function' ? getPos() : null
        if (pos !== null && editor.isEditable) {
          const { width, height } = img.style
          editor.view.dispatch(
            editor.view.state.tr.setNodeMarkup(pos, undefined, {
              ...currentAttrs,
              width,
              height,
            }),
          )
        }
      }

      handle.addEventListener('pointerdown', onPointerDown)

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type !== initialNode.type) return false
          Object.assign(currentAttrs, updatedNode.attrs)
          img.src = currentAttrs.src
          img.alt = currentAttrs.alt || ''
          img.title = currentAttrs.title || ''
          if (currentAttrs.width) img.style.width = currentAttrs.width
          if (currentAttrs.height) img.style.height = currentAttrs.height
          return true
        },
        destroy: () => {
          handle.removeEventListener('pointerdown', onPointerDown)
          document.removeEventListener('pointermove', onPointerMove)
          document.removeEventListener('pointerup', onPointerUp)
        },
      }
    }
  },
})

export default ResizableImage
