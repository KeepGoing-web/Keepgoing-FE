import { useNavigate } from 'react-router-dom'
import RAGSourceList from './RAGSourceList'
import RAGQuoteList from './RAGQuoteList'

const RAGEvidencePanel = ({ rag }) => {
  const navigate = useNavigate()
  const {
    activeEntry,
    activeSourceId,
    setActiveSourceId,
    activeQuoteId,
    setActiveQuoteId,
  } = rag

  if (!activeEntry) {
    return (
      <div className="rag-evidence rag-evidence--empty">
        <p className="rag-evidence__eyebrow">EVIDENCE</p>
        <h2>근거 패널</h2>
        <p>질문을 보내면 참조 문서와 직접 인용이 이 영역에 표시됩니다.</p>
      </div>
    )
  }

  return (
    <div className="rag-evidence">
      <div className="rag-evidence__section">
        <p className="rag-evidence__eyebrow">EVIDENCE</p>
        <h2>참조 문서</h2>
        <RAGSourceList
          sources={activeEntry.sources}
          activeSourceId={activeSourceId}
          onSourceSelect={setActiveSourceId}
          onOpenSource={(source) => navigate(`/notes/${source.noteId}`)}
        />
      </div>

      <div className="rag-evidence__section">
        <h2>직접 인용</h2>
        <RAGQuoteList
          quotes={activeEntry.quotes}
          activeSourceId={activeSourceId}
          activeQuoteId={activeQuoteId}
          onQuoteSelect={(quote) => {
            setActiveQuoteId(quote.id)
            setActiveSourceId(quote.sourceId)
          }}
        />
      </div>
    </div>
  )
}

export default RAGEvidencePanel
