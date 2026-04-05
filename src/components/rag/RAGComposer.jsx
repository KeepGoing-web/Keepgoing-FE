import RAGContextBadge from './RAGContextBadge'

const RAGComposer = ({ draftQuery, onDraftQueryChange, scope, onSubmit }) => {
  const handleSubmit = (event) => {
    event.preventDefault()
    onSubmit(draftQuery)
  }

  return (
    <form className="rag-composer" onSubmit={handleSubmit}>
      <div className="rag-composer__topline">
        <RAGContextBadge scope={scope} />
      </div>

      <div className="rag-composer__row">
        <textarea
          className="rag-composer__input"
          rows={2}
          value={draftQuery}
          onChange={(event) => onDraftQueryChange(event.target.value)}
          placeholder="노트와 블로그를 바탕으로 질문하세요"
        />
        <button className="rag-composer__submit" type="submit" disabled={!draftQuery.trim()}>
          질문
        </button>
      </div>
    </form>
  )
}

export default RAGComposer
