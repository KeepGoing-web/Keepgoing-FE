const RAGEmptyState = ({ suggestedQueries, onSuggestedQueryClick }) => {
  return (
    <div className="rag-empty-state">
      <div className="rag-empty-state__icon">⬡</div>
      <h2>근거 중심으로 질문하세요</h2>
      <p>답변, 참조 문서, 직접 인용을 한 화면에서 확인할 수 있습니다.</p>
      <div className="rag-empty-state__actions">
        {suggestedQueries.map((query) => (
          <button key={query} type="button" onClick={() => onSuggestedQueryClick(query)}>
            {query}
          </button>
        ))}
      </div>
    </div>
  )
}

export default RAGEmptyState
