import { formatDate } from '../../utils/format'

const RAGSourceList = ({ sources, activeSourceId, onSourceSelect, onOpenSource }) => {
  return (
    <div className="rag-source-list">
      {sources.map((source) => (
        <div key={source.id} className={`rag-source-item${source.id === activeSourceId ? ' is-active' : ''}`}>
          <button type="button" className="rag-source-item__main" onClick={() => onSourceSelect(source.id)}>
            <span className="rag-source-item__type">{source.typeLabel}</span>
            <strong>{source.title}</strong>
            <span className="rag-source-item__meta">
              관련도 {Math.round(source.relevance * 100)}% · {source.updatedAt ? formatDate(source.updatedAt) : '날짜 없음'}
            </span>
          </button>
          <button type="button" className="rag-source-item__link" onClick={() => onOpenSource(source)}>
            원문
          </button>
        </div>
      ))}
    </div>
  )
}

export default RAGSourceList
