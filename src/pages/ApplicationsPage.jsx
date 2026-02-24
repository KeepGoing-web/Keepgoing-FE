import { useEffect, useMemo, useState } from 'react'
import { fetchApplications, createApplicationFromUrl, updateApplication, deleteApplication } from '../api/client'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from '../components/ConfirmModal'
import './ApplicationsPage.css'

function isSafeUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

const STATUS_OPTIONS = [
  { value: 'APPLIED', label: '지원완료' },
  { value: 'INTERVIEW', label: '면접 진행' },
  { value: 'OFFER', label: '오퍼' },
  { value: 'REJECTED', label: '불합격' },
  { value: 'WITHDRAWN', label: '지원취소' },
]

export default function ApplicationsPage() {
  const toast = useToast()
  const confirm = useConfirm()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [url, setUrl] = useState('')
  const [notes, setNotes] = useState('')
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('')
  const [source, setSource] = useState('')
  const [error, setError] = useState(null)

  const filtered = useMemo(() => {
    let arr = items
    if (query.trim()) {
      const ql = query.trim().toLowerCase()
      arr = arr.filter(
        (a) =>
          a.company.toLowerCase().includes(ql) ||
          a.title.toLowerCase().includes(ql) ||
          a.notes.toLowerCase().includes(ql)
      )
    }
    if (status) arr = arr.filter((a) => a.status === status)
    if (source) arr = arr.filter((a) => a.source === source)
    return arr
  }, [items, query, status, source])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetchApplications()
        setItems(res.applications || [])
      } catch (e) {
        setError('지원 목록을 불러오지 못했습니다.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleAdd = async (e) => {
    e.preventDefault()
    if (!url.trim()) return
    try {
      const created = await createApplicationFromUrl(url.trim(), notes)
      setItems((prev) => [created, ...prev])
      setUrl('')
      setNotes('')
    } catch {
      toast.error('추가에 실패했습니다.')
    }
  }

  const changeStatus = async (id, nextStatus) => {
    try {
      const updated = await updateApplication(id, { status: nextStatus })
      setItems((prev) => prev.map((a) => (a.id === id ? updated : a)))
    } catch {
      toast.error('상태 변경에 실패했습니다.')
    }
  }

  const handleDelete = async (id) => {
    const ok = await confirm('이 지원 내역을 삭제할까요?', {
      title: '지원 내역 삭제',
      confirmLabel: '삭제',
      cancelLabel: '취소',
    })
    if (!ok) return
    try {
      await deleteApplication(id)
      setItems((prev) => prev.filter((a) => a.id !== id))
      toast.success('지원 내역이 삭제되었습니다.')
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
  }

  return (
    <div className="applications-page">
      <h1>지원 관리</h1>
      <form className="app-form" onSubmit={handleAdd}>
        <input
          type="url"
          placeholder="채용 공고 URL (사람인/원티드/잡코리아 등)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="메모(선택)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
        <button type="submit">추가</button>
      </form>
      <div className="app-filters">
        <input
          placeholder="검색(회사/공고/메모)"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">전체 상태</option>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
        <select value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="">전체 출처</option>
          <option value="SARAMIN">사람인</option>
          <option value="WANTED">원티드</option>
          <option value="JOBKOREA">잡코리아</option>
          <option value="OTHER">기타</option>
        </select>
      </div>
      {error && <div className="error">{error}</div>}
      {loading ? (
        <div className="loading">로딩 중...</div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">📋</div>
          <h3 className="empty-state-title">지원 내역이 없습니다</h3>
          <p className="empty-state-desc">
            채용 공고 URL을 입력하면 자동으로 정보를 파싱하여 등록합니다.
          </p>
          <p className="empty-state-hint">
            사람인, 원티드, 잡코리아 등의 채용 공고 URL을 지원합니다.
          </p>
        </div>
      ) : (
        <div className="app-list">
          {filtered.map((a) => (
            <div key={a.id} className="app-card">
              <div className="app-header">
                <div className="app-title">
                  {isSafeUrl(a.url)
                    ? <a href={a.url} target="_blank" rel="noreferrer noopener">{a.title}</a>
                    : <span title="유효하지 않은 URL">{a.title}</span>
                  }
                  <span className="company">· {a.company}</span>
                </div>
                <div className="app-meta">
                  <span className={`source ${a.source.toLowerCase()}`}>{a.source}</span>
                  <span className="date">{new Date(a.createdAt).toLocaleDateString('ko-KR')}</span>
                </div>
              </div>
              <div className="app-body">
                <div className="notes">{a.notes}</div>
              </div>
              <div className="app-actions">
                <select
                  value={a.status}
                  onChange={(e) => changeStatus(a.id, e.target.value)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <button className="danger" onClick={() => handleDelete(a.id)}>삭제</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}


