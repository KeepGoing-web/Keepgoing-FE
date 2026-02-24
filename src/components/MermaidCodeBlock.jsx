import MermaidRenderer from './MermaidRenderer'

/**
 * ReactMarkdown `components.code` replacement.
 * Detects ```mermaid code blocks and renders them as diagrams.
 * All other code blocks pass through to the default <code> element.
 */
const MermaidCodeBlock = ({ className, children, node, ...props }) => {
  const isMermaid = /language-mermaid/.test(className || '')

  // language-mermaid className is only set on fenced code blocks (```mermaid),
  // never on inline `code`, so isMermaid alone is sufficient.
  if (isMermaid) {
    return <MermaidRenderer code={String(children).replace(/\n$/, '')} />
  }

  return (
    <code className={className} {...props}>
      {children}
    </code>
  )
}

export default MermaidCodeBlock
