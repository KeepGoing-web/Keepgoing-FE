import { Link } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import AIChatPanel from '../components/AIChatPanel'
import LoadingDots from '../components/LoadingDots'
import './DashboardPage.css'

const DashboardPage = () => {
  const { loading } = useVault()

  if (loading) {
    return (
      <div className="dash-page">
        <LoadingDots />
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-scroll">
        <AIChatPanel
          isOpen
          onClose={() => {}}
          variant="embedded"
        />

        <section className="dash-panel dash-panel--compact" aria-label="보조 작업">
          <p className="dash-panel-kicker">TOOLS</p>
          <p className="dash-panel-note">노트와 발행은 보조 도구로 바로 이동할 수 있습니다.</p>

          <div className="dash-secondary-links">
            <Link to="/notes/write" className="dash-quick-item">새 노트 작성</Link>
            <Link to="/notes/list" className="dash-quick-item">노트 보관함</Link>
            <Link to="/query" className="dash-quick-item">전체 RAG 작업실</Link>
          </div>
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
