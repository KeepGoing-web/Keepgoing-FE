import { useState, useEffect, useCallback, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import './VaultSidebar.css'

/* ── Sidebar resize constants ────────────────────────── */
const SIDEBAR_WIDTH_KEY = 'kg-sidebar-width'
const MIN_SIDEBAR = 180
const MAX_SIDEBAR = 420
const DEFAULT_SIDEBAR = 240

/* ── SidebarSection (collapsible) ────────────────────── */

const SidebarSection = ({ title, children, defaultOpen = true }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="sidebar-section">
      <button
        className="sidebar-section-header"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <i className={`sidebar-section-chevron${open ? ' open' : ''}`}>▶</i>
        {title}
      </button>
      {open && children}
    </div>
  )
}

/* ── CategoryTree: folder/file tree (recursive) ────── */

/* Helper: collect all descendant category IDs */
const getDescendantIds = (catId, categories) => {
  const children = categories.filter((c) => c.parentId === catId)
  let ids = children.map((c) => c.id)
  children.forEach((c) => { ids = ids.concat(getDescendantIds(c.id, categories)) })
  return ids
}

/* Single folder node (recursive) */
const FolderNode = ({ cat, categories, allPosts, openFolders, toggleFolder, onPostClick, activeCategoryId, onCategoryClick, activePostId, onFolderContextMenu, newDir }) => {
  const childCats = categories.filter((c) => c.parentId === cat.id)
  const directPosts = allPosts.filter((p) => p.category && p.category.id === cat.id)
  const isOpen = !!openFolders[cat.id]
  const showNewDirInput = newDir.active && newDir.parentId === cat.id

  const handleFolderClick = () => {
    toggleFolder(cat.id)
    onCategoryClick(String(cat.id))
  }

  return (
    <li className="tree-folder">
      <div
        className="tree-folder-header"
        onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onFolderContextMenu(e, cat.id) }}
      >
        <button
          className="tree-expand-btn"
          onClick={() => toggleFolder(cat.id)}
          aria-label={isOpen ? '폴더 닫기' : '폴더 열기'}
        >
          <span className="tree-folder-icon">
            {isOpen ? '📂' : '📁'}
          </span>
        </button>
        <button
          className={`sidebar-item sidebar-folder-label${activeCategoryId === String(cat.id) ? ' active' : ''}`}
          onClick={handleFolderClick}
        >
          <span className="tree-label">{cat.name}</span>
          <span className="sidebar-item-count">{directPosts.length}</span>
        </button>
      </div>

      {(isOpen || showNewDirInput) && (
        <ul className="tree-children">
          {/* Child categories (recursive) */}
          {childCats.map((child) => (
            <FolderNode
              key={child.id}
              cat={child}
              categories={categories}
              allPosts={allPosts}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              onPostClick={onPostClick}
              activeCategoryId={activeCategoryId}
              onCategoryClick={onCategoryClick}
              activePostId={activePostId}
              onFolderContextMenu={onFolderContextMenu}
              newDir={newDir}
            />
          ))}
          {/* Direct posts */}
          {directPosts.map((post) => (
            <li key={post.id}>
              <button
                className={`sidebar-item sidebar-file-item${activePostId === String(post.id) ? ' active' : ''}`}
                onClick={() => onPostClick(post)}
                title={post.title}
              >
                <span className="tree-file-icon">📄</span>
                <span className="tree-file-label">{post.title}</span>
              </button>
            </li>
          ))}
          {/* Inline new subdirectory input */}
          {showNewDirInput && (
            <li className="new-dir-input-row">
              <span className="new-dir-icon">📁</span>
              <input
                ref={newDir.ref}
                className="new-dir-input"
                type="text"
                value={newDir.name}
                onChange={(e) => newDir.onChange(e.target.value)}
                onKeyDown={newDir.onKeyDown}
                onBlur={newDir.onCancel}
                placeholder="디렉토리 이름"
                autoFocus
              />
            </li>
          )}
          {childCats.length === 0 && directPosts.length === 0 && !showNewDirInput && (
            <li className="tree-empty-hint">포스트 없음</li>
          )}
        </ul>
      )}
    </li>
  )
}

const CategoryTree = ({ categories, allPosts, onPostClick, activeCategoryId, onCategoryClick, activePostId, onFolderContextMenu, newDir }) => {
  const [openFolders, setOpenFolders] = useState({ __uncategorized__: true })

  useEffect(() => {
    if (categories.length === 0) return
    setOpenFolders((prev) => {
      const next = { ...prev }
      let changed = false
      categories.forEach((c) => {
        if (!(c.id in next)) {
          next[c.id] = true
          changed = true
        }
      })
      return changed ? next : prev
    })
  }, [categories])

  /* Auto-open parent folder when creating a subdirectory */
  useEffect(() => {
    if (newDir.active && newDir.parentId != null) {
      setOpenFolders((prev) => ({ ...prev, [newDir.parentId]: true }))
    }
  }, [newDir.active, newDir.parentId])

  const toggleFolder = (id) => {
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const uncategorized = allPosts.filter((p) => !p.category)
  const topLevelCats = categories.filter((c) => !c.parentId)
  const showRootNewDir = newDir.active && newDir.parentId == null

  return (
    <ul className="sidebar-items tree-root">
      {/* All posts shortcut */}
      <li>
        <button
          className={`sidebar-item sidebar-folder-row${activeCategoryId === '' ? ' active' : ''}`}
          onClick={() => onCategoryClick('')}
        >
          <span className="tree-icon">◈</span>
          <span className="tree-label">전체 포스트</span>
          <span className="sidebar-item-count">{allPosts.length}</span>
        </button>
      </li>

      {/* Top-level category folders (recursive) */}
      {topLevelCats.map((cat) => (
        <FolderNode
          key={cat.id}
          cat={cat}
          categories={categories}
          allPosts={allPosts}
          openFolders={openFolders}
          toggleFolder={toggleFolder}
          onPostClick={onPostClick}
          activeCategoryId={activeCategoryId}
          onCategoryClick={onCategoryClick}
          activePostId={activePostId}
          onFolderContextMenu={onFolderContextMenu}
          newDir={newDir}
        />
      ))}

      {/* Root-level new directory input */}
      {showRootNewDir && (
        <li className="new-dir-input-row">
          <span className="new-dir-icon">📁</span>
          <input
            ref={newDir.ref}
            className="new-dir-input"
            type="text"
            value={newDir.name}
            onChange={(e) => newDir.onChange(e.target.value)}
            onKeyDown={newDir.onKeyDown}
            onBlur={newDir.onCancel}
            placeholder="디렉토리 이름"
            autoFocus
          />
        </li>
      )}

      {/* Uncategorized folder */}
      {uncategorized.length > 0 && (
        <li className="tree-folder">
          <div className="tree-folder-header">
            <button
              className="tree-expand-btn"
              onClick={() => toggleFolder('__uncategorized__')}
              aria-label={openFolders['__uncategorized__'] ? '폴더 닫기' : '폴더 열기'}
            >
              <span className="tree-folder-icon">
                {openFolders['__uncategorized__'] ? '📂' : '📁'}
              </span>
            </button>
            <button
              className="sidebar-item sidebar-folder-label"
              onClick={() => { toggleFolder('__uncategorized__'); onCategoryClick('__uncategorized__') }}
            >
              <span className="tree-label">미분류</span>
              <span className="sidebar-item-count">{uncategorized.length}</span>
            </button>
          </div>

          {openFolders['__uncategorized__'] && (
            <ul className="tree-children">
              {uncategorized.map((post) => (
                <li key={post.id}>
                  <button
                    className={`sidebar-item sidebar-file-item${activePostId === String(post.id) ? ' active' : ''}`}
                    onClick={() => onPostClick(post)}
                    title={post.title}
                  >
                    <span className="tree-file-icon">📄</span>
                    <span className="tree-file-label">{post.title}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </li>
      )}
    </ul>
  )
}

/* ── VaultSidebar main component ─────────────────────── */

const VaultSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const activePostId = location.pathname.match(/^\/blogs\/(\d+)$/)?.[1] || null
  const {
    allPosts, categories, tags, recentPosts, tagCounts,
    categoryId, setCategoryId, selectedTagIds, toggleTag, navigateToPost,
    createCategory,
  } = useVault()

  /* ── Context menu state ── */
  const [ctxMenu, setCtxMenu] = useState(null) // { x, y, parentId }
  const [newDirInput, setNewDirInput] = useState(false)
  const [newDirName, setNewDirName] = useState('')
  const [newDirParentId, setNewDirParentId] = useState(null)
  const newDirRef = useRef(null)

  /* Sidebar collapsed state */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('kg-sidebar-collapsed') === 'true' }
    catch { return false }
  })

  /* Sidebar resizable width */
  const [sidebarWidth, setSidebarWidth] = useState(() => {
    try {
      const saved = parseInt(localStorage.getItem(SIDEBAR_WIDTH_KEY), 10)
      return saved >= MIN_SIDEBAR && saved <= MAX_SIDEBAR ? saved : DEFAULT_SIDEBAR
    } catch { return DEFAULT_SIDEBAR }
  })
  const [isSidebarResizing, setIsSidebarResizing] = useState(false)

  /* Persist sidebar collapsed */
  const toggleSidebar = () => {
    setSidebarCollapsed((c) => {
      const next = !c
      try { localStorage.setItem('kg-sidebar-collapsed', String(next)) } catch {}
      return next
    })
  }

  /* ── Resize handlers ── */
  const handleSidebarResizeStart = useCallback((e) => {
    e.preventDefault()
    setIsSidebarResizing(true)
  }, [])

  useEffect(() => {
    if (!isSidebarResizing) return

    const handleMove = (e) => {
      const clamped = Math.min(MAX_SIDEBAR, Math.max(MIN_SIDEBAR, e.clientX))
      setSidebarWidth(clamped)
    }

    const handleEnd = () => {
      setIsSidebarResizing(false)
      try { localStorage.setItem(SIDEBAR_WIDTH_KEY, String(sidebarWidth)) } catch {}
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

  /* ── Context menu handlers ── */
  const handleFolderContextMenu = useCallback((e, folderId) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, parentId: folderId })
  }, [])

  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    setCtxMenu({ x: e.clientX, y: e.clientY, parentId: null })
  }, [])

  const closeCtxMenu = useCallback(() => {
    setCtxMenu(null)
  }, [])

  const handleNewDir = useCallback(() => {
    setNewDirParentId(ctxMenu?.parentId || null)
    setCtxMenu(null)
    setNewDirInput(true)
    setNewDirName('')
    setTimeout(() => newDirRef.current?.focus(), 50)
  }, [ctxMenu])

  const handleNewDirCancel = useCallback(() => {
    setNewDirInput(false)
    setNewDirName('')
    setNewDirParentId(null)
  }, [])

  const handleNewDirKeyDown = useCallback(async (e) => {
    if (e.key === 'Escape') {
      e.preventDefault()
      handleNewDirCancel()
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const name = newDirName.trim()
      if (!name) { handleNewDirCancel(); return }
      try {
        await createCategory(name, newDirParentId)
      } catch { /* ignore */ }
      handleNewDirCancel()
    }
  }, [newDirName, newDirParentId, createCategory, handleNewDirCancel])

  /* Close context menu on outside click */
  useEffect(() => {
    if (!ctxMenu) return
    const close = () => setCtxMenu(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [ctxMenu])

  /* ── Handlers ── */
  const handleCategoryClick = useCallback((catId) => {
    setCategoryId(catId)
  }, [setCategoryId])

  const handleTagClick = useCallback((tag) => {
    toggleTag(tag.id)
  }, [toggleTag])

  return (
    <aside
      className={`sidebar${sidebarCollapsed ? ' collapsed' : ''}${isSidebarResizing ? ' sidebar--resizing' : ''}`}
      style={!sidebarCollapsed ? { width: sidebarWidth, minWidth: sidebarWidth } : undefined}
      aria-label="Vault 탐색"
      onContextMenu={handleContextMenu}
    >
      <button
        className="sidebar-toggle"
        onClick={toggleSidebar}
        title={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
        aria-label={sidebarCollapsed ? '사이드바 열기' : '사이드바 닫기'}
      >
        {sidebarCollapsed ? '›' : '‹'}
      </button>

      {/* Resize handle */}
      {!sidebarCollapsed && (
        <div
          className="sidebar-resize-handle"
          onMouseDown={handleSidebarResizeStart}
          title="드래그하여 크기 조절"
          aria-label="사이드바 크기 조절"
        >
          <div className="sidebar-resize-handle-bar" />
        </div>
      )}

      <div className="sidebar-inner">
        {/* Write button */}
        <Link to="/blogs/write" className="sidebar-write-btn">
          <span>✦</span>
          새 포스트 작성
        </Link>

        <div className="sidebar-divider" />

        {/* Recent Files */}
        {recentPosts.length > 0 && (
          <>
            <SidebarSection title="최근 파일" defaultOpen={true}>
              <ul className="sidebar-items">
                {recentPosts.map((p) => (
                  <li key={p.id}>
                    <button
                      className="sidebar-item sidebar-file-item recent-file-item"
                      onClick={() => navigate(`/blogs/${p.id}`)}
                      title={p.title}
                    >
                      <span className="sidebar-item-icon recent-file-dot">·</span>
                      <span className="recent-file-label">{p.title}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </SidebarSection>
            <div className="sidebar-divider" />
          </>
        )}

        {/* File Explorer (Categories as folders) */}
        <SidebarSection title="파일 탐색기" defaultOpen={true}>
          <CategoryTree
            categories={categories}
            allPosts={allPosts}
            onPostClick={navigateToPost}
            activeCategoryId={categoryId}
            onCategoryClick={handleCategoryClick}
            activePostId={activePostId}
            onFolderContextMenu={handleFolderContextMenu}
            newDir={{
              active: newDirInput,
              parentId: newDirParentId,
              name: newDirName,
              ref: newDirRef,
              onChange: setNewDirName,
              onKeyDown: handleNewDirKeyDown,
              onCancel: handleNewDirCancel,
            }}
          />
        </SidebarSection>

        <div className="sidebar-divider" />

        {/* Tags */}
        <SidebarSection title="태그" defaultOpen={true}>
          <ul className="sidebar-items">
            {tags.map((t) => (
              <li key={t.id}>
                <button
                  className={`sidebar-item sidebar-tag-item${selectedTagIds.includes(t.id) ? ' active' : ''}`}
                  onClick={() => handleTagClick(t)}
                >
                  <span className="sidebar-tag-hash">#</span>
                  <span className="sidebar-tag-name">{t.name}</span>
                  {tagCounts[t.id] != null && (
                    <span className="sidebar-item-count">{tagCounts[t.id]}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        </SidebarSection>
      </div>

      {/* Context menu */}
      {ctxMenu && (
        <div
          className="sidebar-ctx-menu"
          style={{ top: ctxMenu.y, left: ctxMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button className="sidebar-ctx-item" onClick={handleNewDir}>
            <span className="sidebar-ctx-icon">📁</span>
            {ctxMenu.parentId ? '하위 디렉토리' : '새 디렉토리'}
          </button>
          <button className="sidebar-ctx-item" onClick={() => { setCtxMenu(null); navigate('/blogs/write') }}>
            <span className="sidebar-ctx-icon">📄</span>
            새 포스트
          </button>
        </div>
      )}
    </aside>
  )
}

export default VaultSidebar
