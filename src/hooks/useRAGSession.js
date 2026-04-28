import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchRAGSuggestions, queryRAG } from '../api/rag'

function createEntryId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function createPendingEntry(query, scope) {
  return {
    id: createEntryId(),
    query,
    scope,
    status: 'retrieving',
    retrieval: {
      scannedCount: 0,
      matchedCount: 0,
      selectedChunks: 0,
      lastSyncedAt: null,
    },
    answer: null,
    sources: [],
    quotes: [],
    followUpActions: [],
    error: null,
  }
}

export function useRAGSession({ initialQuery = '', initialScope }) {
  const [draftQuery, setDraftQuery] = useState(initialQuery)
  const [scope, setScope] = useState(initialScope)
  const [entries, setEntries] = useState([])
  const [suggestedQueries, setSuggestedQueries] = useState([])
  const [activeEntryId, setActiveEntryId] = useState(null)
  const [activeSourceId, setActiveSourceId] = useState(null)
  const [activeQuoteId, setActiveQuoteId] = useState(null)
  const lastAutoSubmitKeyRef = useRef(null)

  const activeEntry = useMemo(
    () => entries.find((entry) => entry.id === activeEntryId) || entries[entries.length - 1] || null,
    [activeEntryId, entries],
  )

  const refreshSuggestions = useCallback(async (nextScope = scope) => {
    const nextSuggestions = await fetchRAGSuggestions(nextScope)
    setSuggestedQueries(nextSuggestions)
  }, [scope])

  useEffect(() => {
    void refreshSuggestions(scope)
  }, [scope, refreshSuggestions])

  const submitQuery = useCallback(async (rawQuery = draftQuery, overrideScope = scope) => {
    const question = String(rawQuery || '').trim()
    if (!question) return false

    const pendingEntry = createPendingEntry(question, overrideScope)
    setEntries((prev) => [...prev, pendingEntry])
    setActiveEntryId(pendingEntry.id)
    setActiveSourceId(null)
    setActiveQuoteId(null)
    setDraftQuery('')

    try {
      const result = await queryRAG({ query: question, scope: overrideScope })

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === pendingEntry.id
            ? {
                ...entry,
                status: 'answering',
                retrieval: result.retrieval,
                sources: result.sources,
                quotes: result.quotes,
              }
            : entry,
        ),
      )

      await new Promise((resolve) => setTimeout(resolve, 180))

      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === pendingEntry.id
            ? {
                ...entry,
                status: 'done',
                retrieval: result.retrieval,
                answer: result.answer,
                sources: result.sources,
                quotes: result.quotes,
                followUpActions: result.suggestedActions,
              }
            : entry,
        ),
      )

      setActiveSourceId(result.sources[0]?.id || null)
      setActiveQuoteId(result.quotes[0]?.id || null)
      return true
    } catch (error) {
      setEntries((prev) =>
        prev.map((entry) =>
          entry.id === pendingEntry.id
            ? {
                ...entry,
                status: 'error',
                error: error?.message || '질의에 실패했습니다.',
              }
            : entry,
        ),
      )
      return false
    }
  }, [draftQuery, scope])

  const applySuggestedQuery = useCallback((queryText) => {
    setDraftQuery(queryText)
    void submitQuery(queryText, scope)
  }, [scope, submitQuery])

  const runFollowUpAction = useCallback((action) => {
    if (!action?.prompt) return
    void submitQuery(action.prompt, scope)
  }, [scope, submitQuery])

  const resetSession = useCallback(() => {
    setEntries([])
    setActiveEntryId(null)
    setActiveSourceId(null)
    setActiveQuoteId(null)
  }, [])

  useEffect(() => {
    if (!initialQuery) return
    const key = `${initialQuery}|${JSON.stringify(initialScope)}`
    if (lastAutoSubmitKeyRef.current === key) return
    lastAutoSubmitKeyRef.current = key
    void submitQuery(initialQuery, initialScope)
    // submitQuery identity changes on every scope/draftQuery update; gating by
    // the auto-submit key above is what guarantees we only fire once per
    // (query, scope) pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialQuery, initialScope])

  return {
    draftQuery,
    setDraftQuery,
    scope,
    setScope,
    entries,
    activeEntry,
    activeEntryId,
    setActiveEntryId,
    activeSourceId,
    setActiveSourceId,
    activeQuoteId,
    setActiveQuoteId,
    suggestedQueries,
    submitQuery,
    applySuggestedQuery,
    runFollowUpAction,
    resetSession,
    refreshSuggestions,
  }
}
