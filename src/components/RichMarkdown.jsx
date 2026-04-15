import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import rehypeRaw from 'rehype-raw'
import MermaidCodeBlock from './MermaidCodeBlock'
import { prepareMarkdownForRender } from '../utils/highlightPalette'

const HighlightMark = ({ children, ...props }) => {
  const tone = typeof props['data-note-highlight'] === 'string'
    ? props['data-note-highlight']
    : undefined

  return (
    <mark
      {...props}
      data-note-highlight={tone}
      className={`markdown-highlight${tone ? ` markdown-highlight--${tone}` : ''}`}
    >
      {children}
    </mark>
  )
}

const RichMarkdown = ({ children = '' }) => (
  <ReactMarkdown
    remarkPlugins={[remarkGfm]}
    rehypePlugins={[rehypeHighlight, rehypeRaw]}
    components={{
      code: MermaidCodeBlock,
      mark: HighlightMark,
    }}
  >
    {prepareMarkdownForRender(children)}
  </ReactMarkdown>
)

export default RichMarkdown
