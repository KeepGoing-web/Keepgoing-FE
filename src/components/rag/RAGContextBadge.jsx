import { getRAGScopeLabel } from '../../api/rag'

const RAGContextBadge = ({ scope }) => {
  return (
    <div className="rag-context-badge">
      <span className="rag-context-badge__label">Scope</span>
      <strong>{getRAGScopeLabel(scope)}</strong>
      {scope.currentNoteId ? <span className="rag-context-badge__meta">#{scope.currentNoteId}</span> : null}
    </div>
  )
}

export default RAGContextBadge
