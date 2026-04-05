import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import RAGWorkspaceShell from '../components/rag/RAGWorkspaceShell'
import { useRAGSession } from '../hooks/useRAGSession'
import './RAGQueryPage.css'

const RAGQueryPage = () => {
  const [searchParams] = useSearchParams()
  const initialScope = useMemo(() => ({
    mode: searchParams.get('scope') || 'all',
    currentNoteId: searchParams.get('noteId') || null,
    categoryId: searchParams.get('categoryId') || '',
    tagIds: searchParams.getAll('tagId'),
    aiOnly: searchParams.get('aiOnly') !== 'false',
    dateFrom: '',
    dateTo: '',
  }), [searchParams])

  const rag = useRAGSession({
    initialQuery: searchParams.get('q') || '',
    initialScope,
  })

  return (
    <div className="rag-query-page">
      <RAGWorkspaceShell rag={rag} />
    </div>
  )
}

export default RAGQueryPage
