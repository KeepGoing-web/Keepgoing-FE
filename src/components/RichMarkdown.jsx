import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import MermaidCodeBlock from './MermaidCodeBlock'
import { prepareMarkdownForRender } from '../utils/highlightPalette'

function joinClassNames(...values) {
  return values.filter(Boolean).join(' ')
}

const HighlightMark = ({ children, ...props }) => {
  const tone = typeof props['data-note-highlight'] === 'string'
    ? props['data-note-highlight']
    : undefined

  return (
    <mark
      {...props}
      data-note-highlight={tone}
      className={joinClassNames(props.className, 'markdown-highlight', tone ? `markdown-highlight--${tone}` : '')}
    >
      {children}
    </mark>
  )
}

const NoteColorSpan = ({ children, ...props }) => {
  const tone = typeof props['data-note-color'] === 'string'
    ? props['data-note-color']
    : undefined

  return (
    <span
      {...props}
      data-note-color={tone}
      className={joinClassNames(props.className, tone ? `markdown-color markdown-color--${tone}` : '')}
    >
      {children}
    </span>
  )
}

const RichMarkdown = ({ children = '' }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight, rehypeRaw]}
    components={{
      code: MermaidCodeBlock,
      mark: HighlightMark,
      span: NoteColorSpan,
    }}
  >
    {prepareMarkdownForRender(children)}
  </ReactMarkdown>
)

export default RichMarkdown
