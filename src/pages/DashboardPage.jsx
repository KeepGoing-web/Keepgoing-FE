import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useVault } from '../contexts/VaultContext'
import { deriveDashboardTodoGroups } from '../utils/dashboardTasks'
import LoadingDots from '../components/LoadingDots'
import ActivityHeatmap from '../components/ActivityHeatmap'
import NotesPageHeader from '../components/NotesPageHeader'
import './DashboardPage.css'

const EMPTY_STATE_SUBTITLE = '새 노트를 만들면 여기서 바로 이어볼 수 있습니다.'

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('ko-KR', {
  timeZone: 'Asia/Seoul',
  month: '2-digit',
  day: '2-digit',
})

function formatCompactDate(value) {
  return SHORT_DATE_FORMATTER.format(new Date(value)).replace(/\.\s*$/, '')
}

const DashboardPage = () => {
  const { allNotes, loading, navigateToNote } = useVault()

  const openNoteSummary = (noteId, noteTitle) => {
    navigateToNote({ id: noteId, title: noteTitle })
  }

  const { groups: todoGroups, totalOpenTasks } = useMemo(
    () => deriveDashboardTodoGroups(allNotes, { maxGroups: 3, maxTasksPerGroup: 1 }),
    [allNotes],
  )

  if (loading) {
    return (
      <div className="dash-page">
        <LoadingDots />
      </div>
    )
  }

  if (allNotes.length === 0) {
    return (
      <div className="dash-page dash-page--empty">
        <div className="dash-scroll">
          <div className="dash-empty-state">
            <NotesPageHeader
              kicker="노트"
              title="최근 노트"
              subtitle={EMPTY_STATE_SUBTITLE}
              actions={(
                <>
                  <Link to="/notes/write" className="notes-page-action">새 노트</Link>
                  <Link to="/notes/list" className="notes-page-action--secondary">보관함</Link>
                </>
              )}
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="dash-page">
      <div className="dash-scroll">
        <section className="dash-section-shell dash-section-shell--activity" aria-labelledby="dashboard-activity-title">
          <div className="dash-activity-layout">
            <div className="dash-activity-copy">
              <p className="dash-panel-kicker dash-panel-kicker--notes">ACTIVITY</p>
              <h2 id="dashboard-activity-title" className="dash-panel-title dash-panel-title--balanced">활동 캘린더</h2>
            </div>
            <ActivityHeatmap posts={allNotes} months={4} />
          </div>
        </section>

        <section className="dash-section-shell dash-section-shell--todo" aria-labelledby="dashboard-todo-title">
          <div className="dash-section-shell__header dash-section-shell__header--split">
            <div>
              <p className="dash-panel-kicker">Focus</p>
              <h2 id="dashboard-todo-title" className="dash-panel-title dash-panel-title--balanced">TODO</h2>
            </div>
            <div className="dash-todo-actions">
              <Link to="/notes/write" className="dash-todo-add-link">새 노트</Link>
              <span className="dash-todo-pill">{totalOpenTasks}개 진행 중</span>
            </div>
          </div>

          {todoGroups.length > 0 ? (
            <div className="dash-todo-groups">
              {todoGroups.map((group) => (
                <article key={group.noteId} className="dash-todo-group">
                  <div className="dash-todo-group__header">
                    <div className="dash-todo-group__meta">
                      <strong className="dash-todo-group__title">{group.noteTitle}</strong>
                      {group.categoryName ? (
                        <>
                          <span className="dash-todo-group__divider">·</span>
                          <span className="dash-todo-group__category">{group.categoryName}</span>
                        </>
                      ) : null}
                      <span className="dash-todo-group__divider">·</span>
                      <span className="dash-todo-group__date">{formatCompactDate(group.updatedAt)}</span>
                    </div>
                    <button type="button" className="dash-todo-group__cta" onClick={() => openNoteSummary(group.noteId, group.noteTitle)}>
                      노트 열기 ↗
                    </button>
                  </div>
                  <ul className="dash-todo-list">
                    {group.tasks.map((task) => (
                      <li key={task.id}>
                        <button type="button" className="dash-todo-row" onClick={() => openNoteSummary(group.noteId, group.noteTitle)}>
                          <span className="dash-todo-checkbox" aria-hidden="true" />
                          <span className="dash-todo-text">{task.text}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>
          ) : (
            <div className="dash-todo-empty">
              <p>아직 진행 중인 TODO가 없습니다.</p>
              <span>노트에서 체크리스트를 추가하면 이 영역에 자동으로 나타납니다.</span>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default DashboardPage
