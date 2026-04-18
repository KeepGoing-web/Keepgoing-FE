const NotesSidebarHeader = ({ noteCount }) => {
  return (
    <>
      <div className="sidebar-minimal-header">
        <span className="sidebar-minimal-title">콘텐츠</span>
        <span className="sidebar-minimal-count">노트 {noteCount}개</span>
      </div>

      <div className="sidebar-segmented" aria-label="콘텐츠 보기">
        <span className="sidebar-segmented__button is-active" aria-current="page">
          노트
        </span>
        <span className="sidebar-segmented__button" aria-hidden="true">
          블로그
        </span>
      </div>
    </>
  )
}

export default NotesSidebarHeader
