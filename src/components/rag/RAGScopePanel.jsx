import { getRAGScopeLabel } from '../../api/rag'

const SCOPE_OPTIONS = [
  { value: 'all', label: '전체 지식베이스' },
  { value: 'notes', label: '메모만' },
  { value: 'blogs', label: '블로그만' },
  { value: 'current-note', label: '현재 문서 기준' },
]

const DATE_OPTIONS = [
  { value: '', label: '전체 기간' },
  { value: 30, label: '최근 30일' },
  { value: 90, label: '최근 90일' },
]

function buildDateFrom(days) {
  if (!days) return ''
  const date = new Date()
  date.setDate(date.getDate() - Number(days))
  return date.toISOString().slice(0, 10)
}

const RAGScopePanel = ({ rag }) => {
  const { scope, setScope, suggestedQueries, applySuggestedQuery, activeEntry } = rag
  const retrieval = activeEntry?.retrieval

  return (
    <div className="rag-panel">
      <section className="rag-panel__section">
        <p className="rag-panel__eyebrow">RAG WORKSPACE</p>
        <h1 className="rag-panel__title">질문 범위</h1>
        <p className="rag-panel__desc">
          지금 답변은 <strong>{getRAGScopeLabel(scope)}</strong> 범위를 기준으로 검색됩니다.
        </p>
      </section>

      <section className="rag-panel__section">
        <h2 className="rag-panel__heading">범위</h2>
        <div className="rag-option-list">
          {SCOPE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`rag-option-btn${scope.mode === option.value ? ' is-active' : ''}`}
              onClick={() => setScope((prev) => ({ ...prev, mode: option.value }))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <section className="rag-panel__section">
        <h2 className="rag-panel__heading">필터</h2>
        <label className="rag-field">
          <span>카테고리 ID</span>
          <input
            value={scope.categoryId || ''}
            onChange={(event) => setScope((prev) => ({ ...prev, categoryId: event.target.value }))}
            placeholder="선택된 카테고리 ID"
          />
        </label>

        <label className="rag-field rag-field--inline">
          <span>AI 수집 허용 문서만</span>
          <input
            type="checkbox"
            checked={scope.aiOnly !== false}
            onChange={(event) => setScope((prev) => ({ ...prev, aiOnly: event.target.checked }))}
          />
        </label>

        <label className="rag-field">
          <span>기간</span>
          <select
            value={scope.dateFrom ? Math.abs(Math.round((new Date() - new Date(scope.dateFrom)) / 86400000)) : ''}
            onChange={(event) => {
              const dateFrom = buildDateFrom(event.target.value)
              setScope((prev) => ({ ...prev, dateFrom }))
            }}
          >
            {DATE_OPTIONS.map((option) => (
              <option key={option.value || 'all'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="rag-panel__section">
        <h2 className="rag-panel__heading">검색 상태</h2>
        <div className="rag-status-list">
          <div>
            <span>Scanned</span>
            <strong>{retrieval?.scannedCount ?? 0}</strong>
          </div>
          <div>
            <span>Matched</span>
            <strong>{retrieval?.matchedCount ?? 0}</strong>
          </div>
          <div>
            <span>Chunks</span>
            <strong>{retrieval?.selectedChunks ?? 0}</strong>
          </div>
        </div>
      </section>

      <section className="rag-panel__section">
        <h2 className="rag-panel__heading">추천 질문</h2>
        <div className="rag-suggestion-list">
          {suggestedQueries.map((query) => (
            <button
              key={query}
              type="button"
              className="rag-suggestion-btn"
              onClick={() => applySuggestedQuery(query)}
            >
              {query}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

export default RAGScopePanel
