import RAGComposer from './RAGComposer'
import RAGEmptyState from './RAGEmptyState'
import RAGRetrievalStatus from './RAGRetrievalStatus'
import RAGAnswerBlock from './RAGAnswerBlock'
import RAGFollowUpActions from './RAGFollowUpActions'

const RAGConversationPane = ({ rag }) => {
  const {
    draftQuery,
    setDraftQuery,
    scope,
    submitQuery,
    entries,
    activeEntryId,
    setActiveEntryId,
    setActiveSourceId,
    setActiveQuoteId,
    runFollowUpAction,
    applySuggestedQuery,
    suggestedQueries,
  } = rag

  return (
    <div className="rag-conversation">
      <RAGComposer
        draftQuery={draftQuery}
        onDraftQueryChange={setDraftQuery}
        scope={scope}
        onSubmit={(query) => submitQuery(query, scope)}
      />

      <div className="rag-conversation__scroll">
        {entries.length === 0 ? (
          <RAGEmptyState suggestedQueries={suggestedQueries} onSuggestedQueryClick={applySuggestedQuery} />
        ) : (
          entries.map((entry) => {
            const isActive = entry.id === activeEntryId

            return (
              <article
                key={entry.id}
                className={`rag-turn${isActive ? ' is-active' : ''}`}
                onClick={() => setActiveEntryId(entry.id)}
              >
                <div className="rag-turn__question">
                  <span className="rag-turn__label">질문</span>
                  <p>{entry.query}</p>
                </div>

                {entry.status === 'retrieving' || entry.status === 'answering' ? (
                  <RAGRetrievalStatus retrieval={entry.retrieval} status={entry.status} />
                ) : null}

                {entry.status === 'done' && entry.answer ? (
                  <>
                    <RAGAnswerBlock
                      answer={entry.answer}
                      onCitationClick={({ sourceId, quoteId }) => {
                        setActiveEntryId(entry.id)
                        setActiveSourceId(sourceId)
                        setActiveQuoteId(quoteId)
                      }}
                    />
                    <RAGFollowUpActions actions={entry.followUpActions} onActionClick={runFollowUpAction} />
                  </>
                ) : null}

                {entry.status === 'error' ? (
                  <div className="rag-turn__error">{entry.error || '질의에 실패했습니다.'}</div>
                ) : null}
              </article>
            )
          })
        )}
      </div>
    </div>
  )
}

export default RAGConversationPane
