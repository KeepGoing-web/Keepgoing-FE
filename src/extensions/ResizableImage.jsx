import Image from '@tiptap/extension-image'

const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
    }
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('div')
      wrapper.className = 'resizable-image-wrapper'

      const img = document.createElement('img')
      img.src = node.attrs.src
      img.alt = node.attrs.alt || ''
      img.title = node.attrs.title || ''
      img.draggable = false

      if (node.attrs.width) {
        img.style.width = node.attrs.width
      }
      if (node.attrs.height) {
        img.style.height = node.attrs.height
      }
      img.style.maxWidth = '100%'
      img.style.display = 'block'

      wrapper.appendChild(img)

      const handle = document.createElement('div')
      handle.className = 'resize-handle'
      wrapper.appendChild(handle)

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
              ...node.attrs,
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
          if (updatedNode.type !== node.type) return false
          img.src = updatedNode.attrs.src
          img.alt = updatedNode.attrs.alt || ''
          img.title = updatedNode.attrs.title || ''
          if (updatedNode.attrs.width) img.style.width = updatedNode.attrs.width
          if (updatedNode.attrs.height) img.style.height = updatedNode.attrs.height
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
