import { describe, expect, it } from 'vitest'
import { prepareMarkdownForRender } from './highlightPalette'

describe('prepareMarkdownForRender', () => {
  it('converts trusted highlight spans into safe mark tags', () => {
    const markdown = '<span style="background-color: rgba(250, 224, 118, 0.32);">**중요**</span> 메모'

    expect(prepareMarkdownForRender(markdown)).toBe('<mark data-note-highlight="yellow">**중요**</mark> 메모')
  })

  it('escapes unsupported raw html while keeping the text', () => {
    const markdown = '<script>alert(1)</script><span style="color: red;">위험</span>'

    expect(prepareMarkdownForRender(markdown)).toBe('&lt;script&gt;alert(1)&lt;/script&gt;&lt;span style="color: red;"&gt;위험&lt;/span&gt;')
  })
})
