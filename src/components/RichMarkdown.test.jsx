import { render, screen } from '@testing-library/react'
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

  it('renders safe note text colors from stored markdown html', () => {
    const { container } = render(
      <RichMarkdown>{'<span style="color: #8aadf4;">포인트</span>'}</RichMarkdown>,
    )

    const coloredText = container.querySelector('span[data-note-color="blue"]')

    expect(coloredText).toBeInTheDocument()
    expect(coloredText).toHaveTextContent('포인트')
  })

  it('keeps angle-bracket autolinks clickable instead of escaping them as raw html', () => {
    const { container } = render(
      <RichMarkdown>{'PostgreSQL 공식 문서 — Multicolumn Indexes: <https://www.postgresql.org/docs/current/indexes-multicolumn.html>'}</RichMarkdown>,
    )

    const link = screen.getByRole('link', { name: 'https://www.postgresql.org/docs/current/indexes-multicolumn.html' })

    expect(link).toHaveAttribute('href', 'https://www.postgresql.org/docs/current/indexes-multicolumn.html')
    expect(container.textContent).not.toContain('<https://www.postgresql.org/docs/current/indexes-multicolumn.html>')
  })

  it('preserves generic type syntax inside inline code spans', () => {
    const { container } = render(
      <RichMarkdown>{'`Page<NoteSummaryResult>` 같은 read model을 직접 반환해도 된다.'}</RichMarkdown>,
    )

    const inlineCode = container.querySelector('code')

    expect(inlineCode).toBeInTheDocument()
    expect(inlineCode).toHaveTextContent('Page<NoteSummaryResult>')
    expect(container.textContent).not.toContain('Page&lt;NoteSummaryResult&gt;')
  })

  it('preserves generic type syntax inside fenced code blocks', () => {
    const { container } = render(
      <RichMarkdown>{['```ts', 'const page: Page<NoteSummaryResult> = fetchPage()', '```'].join('\n')}</RichMarkdown>,
    )

    const codeBlock = container.querySelector('pre code')

    expect(codeBlock).toBeInTheDocument()
    expect(codeBlock).toHaveTextContent('const page: Page<NoteSummaryResult> = fetchPage()')
    expect(container.textContent).not.toContain('Page&lt;NoteSummaryResult&gt;')
  })
})
