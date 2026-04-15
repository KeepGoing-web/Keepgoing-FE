import { render } from '@testing-library/react'
import RichMarkdown from './RichMarkdown'

describe('RichMarkdown', () => {
  it('renders safe note highlights from stored markdown html', () => {
    const { container } = render(
      <RichMarkdown>{'<span style="background-color: rgba(250, 224, 118, 0.32);">중요 문장</span>'}</RichMarkdown>,
    )

    const highlight = container.querySelector('mark[data-note-highlight="yellow"]')

    expect(highlight).toBeInTheDocument()
    expect(highlight).toHaveTextContent('중요 문장')
  })

  it('does not render unsupported raw html tags', () => {
    const { container } = render(
      <RichMarkdown>{'<script>alert(1)</script><span style="background-color: rgba(253, 164, 175, 0.26);">확인</span>'}</RichMarkdown>,
    )

    expect(container.querySelector('script')).not.toBeInTheDocument()

    const highlight = container.querySelector('mark[data-note-highlight="red"]')

    expect(highlight).toBeInTheDocument()
    expect(container.textContent).toContain('<script>alert(1)</script>')
  })
})
