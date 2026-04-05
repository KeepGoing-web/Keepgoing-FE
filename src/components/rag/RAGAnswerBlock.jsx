const CONFIDENCE_LABELS = {
  grounded: '근거 충분',
  partial: '부분 근거',
  weak: '근거 부족',
}

const RAGAnswerBlock = ({ answer, onCitationClick }) => {
  const paragraphs = String(answer.text || '')
    .split(/\n{2,}/)
    .filter(Boolean)

  return (
    <div className="rag-answer">
      <header className="rag-answer__header">
        <p>{answer.summary}</p>
        <span>{CONFIDENCE_LABELS[answer.confidence] || '근거 확인 필요'}</span>
      </header>

      <div className="rag-answer__body">
        {paragraphs.map((paragraph) => (
          <p key={paragraph}>{paragraph}</p>
        ))}
      </div>

      {answer.citations?.length > 0 ? (
        <div className="rag-answer__citations">
          {answer.citations.map((citation) => (
            <button
              key={citation.id}
              type="button"
              onClick={() => onCitationClick({ sourceId: citation.sourceId, quoteId: citation.quoteId })}
            >
              근거 {citation.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}

export default RAGAnswerBlock
