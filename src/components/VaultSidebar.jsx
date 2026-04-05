import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import './VaultSidebar.css'

const SIDEBAR_WIDTH_KEY = 'kg-sidebar-width'
const MIN_SIDEBAR = 220
const MAX_SIDEBAR = 360
const DEFAULT_SIDEBAR = 248

const SidebarSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className="sidebar-section">
      <button
        className="sidebar-section-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="sidebar-section-title-wrap">
          <i className={`sidebar-section-chevron${open ? ' open' : ''}`}>▶</i>
          <span>{title}</span>
        </span>
      </button>
      {open ? children : null}
    </section>
  )
}

function matchesQuery(value, query) {
  if (!query) return true
  return String(value || '').toLowerCase().includes(query)
}

function noteMatchesQuery(note, query) {
  if (!query) return true
  const normalized = query.toLowerCase()
  return matchesQuery(note.title, normalized) || matchesQuery(note.content, normalized)
}

function folderHasMatch(folder, categories, notes, query) {
  if (!query) return true
  if (matchesQuery(folder.name, query)) return true

  const directNotes = notes.filter((note) => note.category && String(note.category.id) === String(folder.id))
  if (directNotes.some((note) => noteMatchesQuery(note, query))) return true

  const children = categories.filter((category) => String(category.parentId) === String(folder.id))
  return children.some((child) => folderHasMatch(child, categories, notes, query))
}

const FolderNode = ({
  folder,
  categories,
  notes,
  openFolders,
  toggleFolder,
  onPostClick,
  activeFolderId,
  onFolderClick,
  activePostId,
  searchQuery,
}) => {
  const childFolders = categories.filter((category) => String(category.parentId) === String(folder.id))
  const visibleChildFolders = childFolders.filter((child) => folderHasMatch(child, categories, notes, searchQuery))
  const directNotes = notes
    .filter((note) => note.category && String(note.category.id) === String(folder.id))
    .filter((note) => noteMatchesQuery(note, searchQuery))
  const isOpen = searchQuery ? true : Boolean(openFolders[folder.id])

  if (!searchQuery && visibleChildFolders.length === 0 && directNotes.length === 0 && !folderHasMatch(folder, categories, notes, searchQuery)) {
    return null
  }

  return (
    <li className="tree-folder">
      <div className="tree-folder-header">
        <button
          className="tree-expand-btn"
          onClick={() => toggleFolder(folder.id)}
          aria-label={isOpen ? '폴더 닫기' : '폴더 열기'}
        >
          <span className="tree-folder-icon">{isOpen ? '📂' : '📁'}</span>
        </button>
        <button
          className={`sidebar-item sidebar-folder-label${activeFolderId === String(folder.id) ? ' active' : ''}`}
          onClick={() => onFolderClick(String(folder.id))}
        >
          <span className="tree-label">{folder.name}</span>
          <span className="sidebar-item-count">{directNotes.length}</span>
        </button>
      </div>

      {isOpen && (visibleChildFolders.length > 0 || directNotes.length > 0) && (
        <ul className="tree-children">
          {visibleChildFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              categories={categories}
              notes={notes}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              onPostClick={onPostClick}
              activeFolderId={activeFolderId}
              onFolderClick={onFolderClick}
              activePostId={activePostId}
              searchQuery={searchQuery}
            />
          ))}

          {directNotes.map((note) => (
            <li key={note.id}>
              <button
                className={`sidebar-item sidebar-file-item${activePostId === String(note.id) ? ' active' : ''}`}
                onClick={() => onPostClick(note)}
                title={note.title}
              >
                <span className="tree-file-icon">📄</span>
                <span className="tree-file-label">{note.title}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

const CategoryTree = ({
  categories,
  notes,
  onPostClick,
  activeFolderId,
  onFolderClick,
  activePostId,
  searchQuery,
}) => {
  const [openFolders, setOpenFolders] = useState({})

  useEffect(() => {
    if (categories.length === 0) return
    setOpenFolders((prev) => {
      const next = { ...prev }
      let changed = false
      categories.forEach((category) => {
        if (!(category.id in next)) {
          next[category.id] = true
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [categories])

  const toggleFolder = (id) => {
    if (searchQuery) return
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const topLevelFolders = categories.filter((category) => !category.parentId)
  const visibleTopLevelFolders = topLevelFolders.filter((folder) => folderHasMatch(folder, categories, notes, searchQuery))
  const uncategorizedNotes = notes
    .filter((note) => !note.category)
    .filter((note) => noteMatchesQuery(note, searchQuery))

  return (
    <ul className="sidebar-items tree-root">
      <li>
        <button
          className={`sidebar-item sidebar-folder-row${activeFolderId === '' ? ' active' : ''}`}
          onClick={() => onFolderClick('')}
        >
          <span className="tree-icon">◈</span>
          <span className="tree-label">전체 문서</span>
          <span className="sidebar-item-count">{notes.length}</span>
        </button>
      </li>

      {visibleTopLevelFolders.map((folder) => (
        <FolderNode
          key={folder.id}
          folder={folder}
          categories={categories}
          notes={notes}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          onPostClick={onPostClick}
          activeFolderId={activeFolderId}
          onFolderClick={onFolderClick}
          activePostId={activePostId}
          searchQuery={searchQuery}
        />
      ))}

      {uncategorizedNotes.map((note) => (
        <li key={note.id}>
          <button
            className={`sidebar-item sidebar-file-item sidebar-file-item--root${activePostId === String(note.id) ? ' active' : ''}`}
            onClick={() => onPostClick(note)}
            title={note.title}
          >
            <span className="tree-file-icon">📄</span>
            <span className="tree-file-label">{note.title}</span>
          </button>
        </li>
      ))}

      {searchQuery && visibleTopLevelFolders.length === 0 && uncategorizedNotes.length === 0 ? (
        <li className="tree-empty-hint">검색 결과가 없습니다</li>
      ) : null}
    </ul>
  )
}

const VaultSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const activePostId = location.pathname.match(/^\/notes\/([^/]+)$/)?.[1] || null
  const {
    allNotes,
    categories,
    recentNotes,
    categoryId,
    setCategoryId,
    navigateToNote,
    resetFilters,
  } = useVault()

  const [explorerQuery, setExplorerQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem('kg-sidebar-collapsed') === 'true'
    } catch {
      return false
    }
  })
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10)
      return saved >= MIN_SIDEBAR && saved <= MAX_SIDEBAR ? saved : DEFAULT_SIDEBAR
    } catch {
      return DEFAULT_SIDEBAR
    }
  })
  const [isSidebarResizing, setIsSidebarResizing] = useState(false)

  const filteredRecentNotes = recentNotes
    .filter((note) => matchesQuery(note.title, explorerQuery.trim().toLowerCase()))
    .slice(0, 5)

  useEffect(() => {
    if (!isSidebarResizing) return undefined

    const handleMove = (event) => {
      const clampedWidth = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, event.clientX))
      setSidebarWidth(clampedWidth)
    }

    const handleEnd = () => {
      setIsSidebarResizing(false)
      try {
        localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth))
      } catch {
        // ignore
      }
    }

    document.addEventListener('mousemove', handleMove)
    document.addEventListener('mouseup', handleEnd)
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'

    return () => {
      document.removeEventListener('mousemove', handleMove)
      document.removeEventListener('mouseup', handleEnd)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isSidebarResizing, sidebarWidth])

  const toggleSidebar = () => {
    setSidebarCollapsed((current) => {
      const next = !current
      try {
        localStorage.setItem('kg-sidebar-collapsed', String(next))
      } catch {
        // ignore
      }
      return next
    })
  }

  const handleFolderClick = (folderId) => {
    setCategoryId(folderId)
    navigate('/notes/list')
  }

  return (
    <aside
      className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}${isSidebarResizing ? ' sidebar--resizing' : ''}`}
      style={!sidebarCollapsed ? { width: sidebarWidth, minWidth: sidebarWidth } : undefined}
      aria-label="문서 탐색기"
    >
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={sidebarCollapsed ? '탐색기 열기' : '탐색기 닫기'}
        aria-label={sidebarCollapsed ? '탐색기 열기' : '탐색기 닫기'}
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      {!sidebarCollapsed && (
        <div
          className="sidebar-resize-handle"
          onMouseDown={(event) => {
            event.preventDefault()
            setIsSidebarResizing(true)
          }}
          title="드래그하여 크기 조절"
          aria-label="사이드바 크기 조절"
        >
          <div className="sidebar-resize-handle-bar" />
        </div>
      )}

      <div className="sidebar-inner">
        <div className="sidebar-minimal-header">
          <div>
            <span className="sidebar-minimal-title">문서</span>
            <p className="sidebar-minimal-copy">최근 문서와 폴더만 조용하게 정리합니다.</p>
          </div>
          <Link to="/notes/write" className="sidebar-new-note-btn">✦</Link>
        </div>

        <div className="sidebar-search-wrap">
          <span className="sidebar-search-icon">⌕</span>
          <input
            className="sidebar-search-input"
            value={explorerQuery}
            onChange={(event) => setExplorerQuery(event.target.value)}
            placeholder="문서 찾기"
            aria-label="탐색기 검색"
          />
          {explorerQuery ? (
            <button type="button" className="sidebar-search-clear" onClick={() => setExplorerQuery('')}>
              ×
            </button>
          ) : null}
        </div>

        {filteredRecentNotes.length > 0 && (
          <SidebarSection title="최근 문서" defaultOpen>
            <ul className="sidebar-items sidebar-list-plain">
              {filteredRecentNotes.map((note) => (
                <li key={note.id}>
                  <button
                    className={`sidebar-item sidebar-file-item recent-file-item${activePostId === String(note.id) ? ' active' : ''}`}
                    onClick={() => navigate(`/notes/${note.id}`)}
                    title={note.title}
                  >
                    <span className="recent-file-dot">·</span>
                    <span className="recent-file-label">{note.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          </SidebarSection>
        )}

        <SidebarSection title="폴더" defaultOpen>
          <CategoryTree
            categories={categories}
            notes={allNotes}
            onPostClick={navigateToNote}
            activeFolderId={categoryId}
            onFolderClick={handleFolderClick}
            activePostId={activePostId}
            searchQuery={explorerQuery.trim().toLowerCase()}
          />
        </SidebarSection>

        {categoryId ? (
          <button type="button" className="sidebar-reset-btn" onClick={() => { resetFilters(); navigate('/notes/list') }}>
            전체 문서 보기
          </button>
        ) : null}
      </div>
    </aside>
  )
}

export default VaultSidebar
