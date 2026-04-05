const RAGQuoteList = ({ quotes, activeSourceId, activeQuoteId, onQuoteSelect }) => {
  const visibleQuotes = activeSourceId
    ? quotes.filter((quote) => quote.sourceId === activeSourceId)
    : quotes

  return (
    <div className="rag-quote-list">
      {visibleQuotes.map((quote) => (
        <button
          key={quote.id}
          type="button"
          className={`rag-quote-item${quote.id === activeQuoteId ? ' is-active' : ''}`}
          onClick={() => onQuoteSelect(quote)}
        >
          <p>{quote.text}</p>
          <span>{quote.anchorLabel}</span>
        </button>
      ))}
    </div>
  )
}

export default RAGQuoteList
