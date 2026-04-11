import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from './ConfirmModal'
import { clearDraggedNote, getDraggedNote, setDraggedNote } from '../utils/noteDrag'
import { clearDraggedFolder, getDraggedFolder, setDraggedFolder } from '../utils/folderDrag'
import './VaultSidebar.css'

const SIDEBAR_WIDTH_KEY = 'kg-sidebar-width'
const MIN_SIDEBAR = 220
const MAX_SIDEBAR = 360
const DEFAULT_SIDEBAR = 248
const ROOT_DROP_TARGET = '__root__'
const MOBILE_SIDEBAR_MEDIA = '(max-width: 680px)'

function isMobileSidebarViewport() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia(MOBILE_SIDEBAR_MEDIA).matches
}

const SidebarSection = ({ title, children, defaultOpen = true, aside, className = '', contentClassName = '' }) => {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <section className={`sidebar-section${className ? ` ${className}` : ''}`}>
      <button
        className="sidebar-section-header"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
      >
        <span className="sidebar-section-title-wrap">
          <i className={`sidebar-section-chevron${open ? ' open' : ''}`}>▶</i>
          <span>{title}</span>
        </span>
        {aside ? <span className="sidebar-section-aside">{aside}</span> : null}
      </button>
      {open ? <div className={`sidebar-section-content${contentClassName ? ` ${contentClassName}` : ''}`}>{children}</div> : null}
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

function getFolderAncestry(folderId, categories) {
  if (!folderId) return []

  const ancestry = []
  let currentId = String(folderId)

  while (currentId) {
    ancestry.push(currentId)
    const currentFolder = categories.find((category) => String(category.id) === currentId)
    currentId = currentFolder?.parentId ? String(currentFolder.parentId) : ''
  }

  return ancestry
}

function isFolderMoveInvalid(draggedFolder, targetParentId, categories) {
  if (!draggedFolder) return true

  const draggedFolderId = String(draggedFolder.id)
  const normalizedTargetParentId = targetParentId == null ? null : String(targetParentId)
  const currentParentId = draggedFolder.parentId == null ? null : String(draggedFolder.parentId)

  if (normalizedTargetParentId === draggedFolderId) return true
  if (normalizedTargetParentId === currentParentId) return true
  if (normalizedTargetParentId == null) return false

  return getFolderAncestry(normalizedTargetParentId, categories).includes(draggedFolderId)
}

const DraftFolderRow = ({
  draftName,
  placeholder,
  ariaLabel = '새 폴더 이름',
  onDraftNameChange,
  onDraftSubmit,
  onDraftKeyDown,
  disabled = false,
}) => (
  <li className="tree-folder tree-folder--draft">
    <form className="tree-folder-draft-form" onSubmit={onDraftSubmit}>
      <span className="tree-folder-draft-icon" aria-hidden="true">📁</span>
      <input
        className="tree-folder-draft-input"
        value={draftName}
        onChange={(event) => onDraftNameChange(event.target.value)}
        onKeyDown={onDraftKeyDown}
        placeholder={placeholder || '새 폴더'}
        aria-label={ariaLabel}
        disabled={disabled}
        autoFocus
      />
    </form>
  </li>
)

const DraftNoteRow = ({
  draftName,
  placeholder,
  onDraftNameChange,
  onDraftSubmit,
  onDraftKeyDown,
  disabled = false,
}) => (
  <li className="tree-folder tree-folder--draft">
    <form className="tree-folder-draft-form" onSubmit={onDraftSubmit}>
      <span className="tree-folder-draft-icon" aria-hidden="true">📄</span>
      <input
        className="tree-folder-draft-input"
        value={draftName}
        onChange={(event) => onDraftNameChange(event.target.value)}
        onKeyDown={onDraftKeyDown}
        placeholder={placeholder || '노트 제목'}
        aria-label="노트 이름 변경"
        disabled={disabled}
        autoFocus
      />
    </form>
  </li>
)

const FolderNode = ({
  folder,
  categories,
  notes,
  openFolders,
  toggleFolder,
  markFolderSelectionToggle,
  onPostClick,
  activeFolderId,
  onFolderClick,
  activePostId,
  searchQuery,
  onFolderContextMenu,
  onNoteContextMenu,
  onFolderDragOver,
  onFolderDrop,
  onFolderDragStart,
  onFolderDragEnd,
  onNoteDragStart,
  onNoteDragEnd,
  dropTargetId,
  draggingNoteId,
  draggingFolderId,
  movingNoteId,
  movingFolderId,
  draftNote,
  draftNoteTitle,
  onDraftNoteTitleChange,
  onDraftNoteSubmit,
  onDraftNoteKeyDown,
  isRenamingNote,
  draftFolder,
  draftName,
  onDraftNameChange,
  onDraftSubmit,
  onDraftKeyDown,
  isSubmittingFolder,
  registerFolderButton,
}) => {
  const childFolders = categories.filter((category) => String(category.parentId) === String(folder.id))
  const visibleChildFolders = childFolders.filter((child) => folderHasMatch(child, categories, notes, searchQuery))
  const directNotes = notes
    .filter((note) => note.category && String(note.category.id) === String(folder.id))
    .filter((note) => noteMatchesQuery(note, searchQuery))
  const isOpen = searchQuery ? true : Boolean(openFolders[folder.id])
  const isDropTarget = dropTargetId === String(folder.id)
  const showDraftHere = draftFolder?.mode === 'create' && String(draftFolder.parentId ?? '') === String(folder.id)
  const showRenameDraft = draftFolder?.mode === 'rename' && String(draftFolder.folderId) === String(folder.id)

  if (!searchQuery && visibleChildFolders.length === 0 && directNotes.length === 0 && !folderHasMatch(folder, categories, notes, searchQuery)) {
    return null
  }

  if (showRenameDraft) {
    return (
      <DraftFolderRow
        draftName={draftName}
        placeholder={draftFolder?.currentName || folder.name}
        ariaLabel="폴더 이름 변경"
        onDraftNameChange={onDraftNameChange}
        onDraftSubmit={onDraftSubmit}
        onDraftKeyDown={onDraftKeyDown}
        disabled={isSubmittingFolder}
      />
    )
  }

  return (
    <li className="tree-folder">
      <div
        className="tree-folder-header"
        onDragOver={(event) => onFolderDragOver(event, folder.id)}
        onDrop={(event) => onFolderDrop(event, folder.id, folder.name)}
      >
        <button
          className="tree-expand-btn"
          onClick={() => toggleFolder(folder.id)}
          aria-label={isOpen ? '폴더 닫기' : '폴더 열기'}
        >
          <span className="tree-folder-icon">{isOpen ? '📂' : '📁'}</span>
        </button>
        <button
          ref={(node) => registerFolderButton(folder.id, node)}
          draggable={String(movingFolderId) !== String(folder.id)}
          className={`sidebar-item sidebar-folder-label${activeFolderId === String(folder.id) ? ' active' : ''}${isDropTarget ? ' drop-target' : ''}${draggingFolderId === String(folder.id) ? ' is-dragging' : ''}`}
          onClick={() => {
            if (activeFolderId !== String(folder.id)) {
              markFolderSelectionToggle(folder.id)
            }
            onFolderClick(String(folder.id))
            toggleFolder(folder.id)
          }}
          onDragStart={(event) => onFolderDragStart(event, folder)}
          onDragEnd={onFolderDragEnd}
          onContextMenu={(event) => {
            event.preventDefault()
            event.stopPropagation()
            if (!isOpen) toggleFolder(folder.id)
            onFolderContextMenu(folder, event)
          }}
        >
          <span className="tree-label">{folder.name}</span>
          <span className="sidebar-item-count">{directNotes.length}</span>
        </button>
      </div>

      {isOpen && (showDraftHere || visibleChildFolders.length > 0 || directNotes.length > 0) && (
        <ul
          className="tree-children"
          onDragOver={(event) => onFolderDragOver(event, folder.id)}
          onDrop={(event) => onFolderDrop(event, folder.id, folder.name)}
        >
          {showDraftHere ? (
            <DraftFolderRow
              draftName={draftName}
              onDraftNameChange={onDraftNameChange}
              onDraftSubmit={onDraftSubmit}
              onDraftKeyDown={onDraftKeyDown}
              disabled={isSubmittingFolder}
            />
          ) : null}

          {visibleChildFolders.map((child) => (
            <FolderNode
              key={child.id}
              folder={child}
              categories={categories}
              notes={notes}
              openFolders={openFolders}
              toggleFolder={toggleFolder}
              markFolderSelectionToggle={markFolderSelectionToggle}
              onPostClick={onPostClick}
              activeFolderId={activeFolderId}
              onFolderClick={onFolderClick}
              activePostId={activePostId}
              searchQuery={searchQuery}
              onFolderContextMenu={onFolderContextMenu}
              onNoteContextMenu={onNoteContextMenu}
              onFolderDragOver={onFolderDragOver}
              onFolderDrop={onFolderDrop}
              onFolderDragStart={onFolderDragStart}
              onFolderDragEnd={onFolderDragEnd}
              onNoteDragStart={onNoteDragStart}
              onNoteDragEnd={onNoteDragEnd}
              dropTargetId={dropTargetId}
              draggingNoteId={draggingNoteId}
              draggingFolderId={draggingFolderId}
              movingNoteId={movingNoteId}
              movingFolderId={movingFolderId}
              draftNote={draftNote}
              draftNoteTitle={draftNoteTitle}
              onDraftNoteTitleChange={onDraftNoteTitleChange}
              onDraftNoteSubmit={onDraftNoteSubmit}
              onDraftNoteKeyDown={onDraftNoteKeyDown}
              isRenamingNote={isRenamingNote}
              draftFolder={draftFolder}
              draftName={draftName}
              onDraftNameChange={onDraftNameChange}
              onDraftSubmit={onDraftSubmit}
              onDraftKeyDown={onDraftKeyDown}
              isSubmittingFolder={isSubmittingFolder}
              registerFolderButton={registerFolderButton}
            />
          ))}

          {directNotes.map((note) => (
            draftNote?.surface === 'tree' && String(draftNote.noteId) === String(note.id) ? (
              <DraftNoteRow
                key={note.id}
                draftName={draftNoteTitle}
                placeholder={draftNote.placeholder}
                onDraftNameChange={onDraftNoteTitleChange}
                onDraftSubmit={onDraftNoteSubmit}
                onDraftKeyDown={onDraftNoteKeyDown}
                disabled={isRenamingNote}
              />
            ) : (
              <li key={note.id}>
                <button
                  draggable={String(movingNoteId) !== String(note.id)}
                  className={`sidebar-item sidebar-file-item${activePostId === String(note.id) ? ' active' : ''}${draggingNoteId === String(note.id) ? ' is-dragging' : ''}`}
                  onClick={() => onPostClick(note)}
                  onContextMenu={(event) => onNoteContextMenu(note, event, 'tree')}
                  onDragStart={(event) => onNoteDragStart(event, note)}
                  onDragEnd={onNoteDragEnd}
                  title={note.title}
                >
                  <span className="tree-file-icon">📄</span>
                  <span className="tree-file-label">{note.title}</span>
                </button>
              </li>
            )
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
  onTreeContextMenu,
  onFolderContextMenu,
  onNoteContextMenu,
  onFolderDragOver,
  onFolderDrop,
  onFolderDragStart,
  onFolderDragEnd,
  onNoteDragStart,
  onNoteDragEnd,
  dropTargetId,
  draggingNoteId,
  draggingFolderId,
  movingNoteId,
  movingFolderId,
  draftNote,
  draftNoteTitle,
  onDraftNoteTitleChange,
  onDraftNoteSubmit,
  onDraftNoteKeyDown,
  isRenamingNote,
  draftFolder,
  draftName,
  onDraftNameChange,
  onDraftSubmit,
  onDraftKeyDown,
  isSubmittingFolder,
  registerFolderButton,
  rootFolderButtonRef,
}) => {
  const [openFolders, setOpenFolders] = useState({})
  const skipAutoOpenFolderRef = useRef(null)

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

  useEffect(() => {
    if (!draftFolder?.parentId) return
    setOpenFolders((prev) => ({ ...prev, [draftFolder.parentId]: true }))
  }, [draftFolder])

  useEffect(() => {
    if (!activeFolderId) {
      skipAutoOpenFolderRef.current = null
      return
    }

    const shouldSkipAutoOpen = skipAutoOpenFolderRef.current === String(activeFolderId)
    const ancestry = getFolderAncestry(activeFolderId, categories)
    if (ancestry.length === 0) {
      skipAutoOpenFolderRef.current = null
      return
    }

    if (!shouldSkipAutoOpen) {
      setOpenFolders((prev) => {
        const next = { ...prev }
        let changed = false

        ancestry.forEach((folderId) => {
          if (!next[folderId]) {
            next[folderId] = true
            changed = true
          }
        })

        return changed ? next : prev
      })
    }

    skipAutoOpenFolderRef.current = null
  }, [activeFolderId, categories])

  const toggleFolder = (id) => {
    if (searchQuery) return
    setOpenFolders((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const markFolderSelectionToggle = (id) => {
    skipAutoOpenFolderRef.current = String(id)
  }

  const topLevelFolders = categories.filter((category) => !category.parentId)
  const visibleTopLevelFolders = topLevelFolders.filter((folder) => folderHasMatch(folder, categories, notes, searchQuery))
  const uncategorizedNotes = notes
    .filter((note) => !note.category)
    .filter((note) => noteMatchesQuery(note, searchQuery))
  const showRootDraft = draftFolder?.mode === 'create' && !draftFolder.parentId

  return (
    <div className="sidebar-tree-surface" onContextMenu={onTreeContextMenu}>
      <ul className="sidebar-items tree-root">
        {showRootDraft ? (
          <DraftFolderRow
            draftName={draftName}
            onDraftNameChange={onDraftNameChange}
            onDraftSubmit={onDraftSubmit}
            onDraftKeyDown={onDraftKeyDown}
            disabled={isSubmittingFolder}
          />
        ) : null}

        {visibleTopLevelFolders.map((folder) => (
          <FolderNode
            key={folder.id}
            folder={folder}
            categories={categories}
            notes={notes}
            openFolders={openFolders}
            toggleFolder={toggleFolder}
            markFolderSelectionToggle={markFolderSelectionToggle}
            onPostClick={onPostClick}
            activeFolderId={activeFolderId}
            onFolderClick={onFolderClick}
            activePostId={activePostId}
            searchQuery={searchQuery}
            onFolderContextMenu={onFolderContextMenu}
            onNoteContextMenu={onNoteContextMenu}
            onFolderDragOver={onFolderDragOver}
            onFolderDrop={onFolderDrop}
            onFolderDragStart={onFolderDragStart}
            onFolderDragEnd={onFolderDragEnd}
            onNoteDragStart={onNoteDragStart}
            onNoteDragEnd={onNoteDragEnd}
            dropTargetId={dropTargetId}
            draggingNoteId={draggingNoteId}
            draggingFolderId={draggingFolderId}
            movingNoteId={movingNoteId}
            movingFolderId={movingFolderId}
            draftNote={draftNote}
            draftNoteTitle={draftNoteTitle}
            onDraftNoteTitleChange={onDraftNoteTitleChange}
            onDraftNoteSubmit={onDraftNoteSubmit}
            onDraftNoteKeyDown={onDraftNoteKeyDown}
            isRenamingNote={isRenamingNote}
            draftFolder={draftFolder}
            draftName={draftName}
            onDraftNameChange={onDraftNameChange}
            onDraftSubmit={onDraftSubmit}
            onDraftKeyDown={onDraftKeyDown}
            isSubmittingFolder={isSubmittingFolder}
            registerFolderButton={registerFolderButton}
          />
        ))}

        {uncategorizedNotes.map((note) => (
          draftNote?.surface === 'tree' && String(draftNote.noteId) === String(note.id) ? (
            <DraftNoteRow
              key={note.id}
              draftName={draftNoteTitle}
              placeholder={draftNote.placeholder}
              onDraftNameChange={onDraftNoteTitleChange}
              onDraftSubmit={onDraftNoteSubmit}
              onDraftKeyDown={onDraftNoteKeyDown}
              disabled={isRenamingNote}
            />
          ) : (
            <li key={note.id}>
              <button
                draggable={String(movingNoteId) !== String(note.id)}
                className={`sidebar-item sidebar-file-item sidebar-file-item--root${activePostId === String(note.id) ? ' active' : ''}${draggingNoteId === String(note.id) ? ' is-dragging' : ''}`}
                onClick={() => onPostClick(note)}
                onContextMenu={(event) => onNoteContextMenu(note, event, 'tree')}
                onDragStart={(event) => onNoteDragStart(event, note)}
                onDragEnd={onNoteDragEnd}
                title={note.title}
              >
                <span className="tree-file-icon">📄</span>
                <span className="tree-file-label">{note.title}</span>
              </button>
            </li>
          )
        ))}

        {searchQuery && visibleTopLevelFolders.length === 0 && uncategorizedNotes.length === 0 ? (
          <li className="tree-empty-hint">검색 결과가 없습니다</li>
        ) : null}

        <li
          ref={rootFolderButtonRef}
          tabIndex={-1}
          aria-label="최상위 드롭 영역"
          className={`sidebar-root-drop-zone${dropTargetId === ROOT_DROP_TARGET ? ' drop-target' : ''}`}
          onDragOver={(event) => onFolderDragOver(event, null)}
          onDrop={(event) => onFolderDrop(event, null, '최상위')}
        />
      </ul>
    </div>
  )
}

const VaultSidebar = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const toast = useToast()
  const confirm = useConfirm()
  const activePostId = location.pathname.match(/^\/notes\/([^/]+)$/)?.[1] || null
  const {
    allNotes,
    categories,
    recentNotes,
    categoryId,
    setCategoryId,
    navigateToNote,
    resetFilters,
    createCategory,
    renameCategory,
    deleteCategory,
    moveCategory,
    moveNoteToFolder,
    updateNote: updateNoteInVault,
    deleteNote: deleteNoteInVault,
  } = useVault()

  const [explorerQuery, setExplorerQuery] = useState('')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    if (isMobileSidebarViewport()) {
      return true
    }

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
  const [draftFolder, setDraftFolder] = useState(null)
  const [draftFolderName, setDraftFolderName] = useState('')
  const [isSubmittingFolder, setIsSubmittingFolder] = useState(false)
  const [draftNote, setDraftNote] = useState(null)
  const [draftNoteTitle, setDraftNoteTitle] = useState('')
  const [isRenamingNote, setIsRenamingNote] = useState(false)
  const [dropTargetId, setDropTargetId] = useState(null)
  const [draggingNoteId, setDraggingNoteId] = useState(null)
  const [draggingFolderId, setDraggingFolderId] = useState(null)
  const [movingNoteId, setMovingNoteId] = useState(null)
  const [movingFolderId, setMovingFolderId] = useState(null)
  const [contextMenu, setContextMenu] = useState(null)
  const [pendingFocusFolderId, setPendingFocusFolderId] = useState(null)
  const contextMenuRef = useRef(null)
  const creatingFolderRef = useRef(false)
  const renamingNoteRef = useRef(false)
  const folderButtonRefs = useRef(new Map())
  const rootFolderButtonRef = useRef(null)

  const filteredRecentNotes = recentNotes
    .map((note) => allNotes.find((candidate) => String(candidate.id) === String(note.id)) || note)
    .filter((note) => matchesQuery(note.title, explorerQuery.trim().toLowerCase()))
    .slice(0, 5)
  const showFolderSelection = !activePostId

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

  useEffect(() => {
    if (!isMobileSidebarViewport()) return
    setSidebarCollapsed(true)
  }, [location.pathname])

  useEffect(() => {
    const clearDragState = () => {
      setDropTargetId(null)
      setDraggingNoteId(null)
      setDraggingFolderId(null)
      clearDraggedNote()
      clearDraggedFolder()
    }

    window.addEventListener('drop', clearDragState)
    window.addEventListener('dragend', clearDragState)

    return () => {
      window.removeEventListener('drop', clearDragState)
      window.removeEventListener('dragend', clearDragState)
    }
  }, [])

  useEffect(() => {
    if (!draftFolder && !draftNote) return undefined

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setDraftFolder(null)
        setDraftFolderName('')
        setDraftNote(null)
        setDraftNoteTitle('')
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [draftFolder, draftNote])

  useEffect(() => {
    if (!contextMenu) return undefined

    const handlePointerDown = (event) => {
      if (contextMenuRef.current?.contains(event.target)) return
      setContextMenu(null)
    }

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setContextMenu(null)
      }
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('resize', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('resize', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [contextMenu])

  useEffect(() => {
    if (!pendingFocusFolderId) return undefined

    let frameA = 0
    let frameB = 0

    frameA = requestAnimationFrame(() => {
      frameB = requestAnimationFrame(() => {
        if (pendingFocusFolderId === ROOT_DROP_TARGET) {
          rootFolderButtonRef.current?.focus()
          setPendingFocusFolderId(null)
          return
        }

        const targetButton = folderButtonRefs.current.get(String(pendingFocusFolderId))
        if (targetButton) {
          targetButton.focus()
          setPendingFocusFolderId(null)
        }
      })
    })

    return () => {
      cancelAnimationFrame(frameA)
      cancelAnimationFrame(frameB)
    }
  }, [pendingFocusFolderId, categories, categoryId])

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

  const registerFolderButton = (folderId, node) => {
    const key = String(folderId)
    if (node) {
      folderButtonRefs.current.set(key, node)
      return
    }
    folderButtonRefs.current.delete(key)
  }

  const openFolderDraft = (parentFolder = null) => {
    setDraftFolder({
      mode: 'create',
      parentId: parentFolder?.id ?? null,
      parentName: parentFolder?.name ?? null,
    })
    setDraftFolderName('')
  }

  const openFolderRenameDraft = (folder) => {
    setDraftFolder({
      mode: 'rename',
      folderId: String(folder.id),
      parentId: folder.parentId ?? null,
      currentName: folder.name ?? '',
    })
    setDraftFolderName('')
  }

  const handleDeleteFolder = async (folder) => {
    setContextMenu(null)

    const ok = await confirm(`"${folder.name}" 폴더를 삭제하시겠습니까?\n하위 폴더나 노트가 남아 있으면 삭제할 수 없습니다.`, {
      title: '폴더 삭제',
      confirmLabel: '삭제',
      cancelLabel: '취소',
    })

    if (!ok) return

    try {
      await deleteCategory(folder.id)

      if (String(categoryId) === String(folder.id)) {
        resetFilters()
        navigate('/notes/list')
      }

      toast.success('폴더를 삭제했습니다.')
    } catch (error) {
      if (error?.code === 'FOLDER_NOT_EMPTY') {
        toast.error('하위 폴더나 문서가 남아 있어 삭제할 수 없습니다.')
        return
      }

      if (error?.code === 'FOLDER_NOT_FOUND') {
        toast.error('이미 삭제되었거나 존재하지 않는 폴더입니다.')
        return
      }

      toast.error('폴더 삭제에 실패했습니다.')
    }
  }

  const openFolderContextMenu = (event, parentFolder = null) => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      kind: 'folder',
      parentFolder,
      note: null,
    })
  }

  const openNoteContextMenu = (note, event, surface = 'tree') => {
    event.preventDefault()
    event.stopPropagation()
    setContextMenu({
      x: event.clientX,
      y: event.clientY,
      kind: 'note',
      parentFolder: null,
      note,
      surface,
    })
  }

  const handleFolderDraftSubmit = async (event) => {
    event.preventDefault()
    if (creatingFolderRef.current || isSubmittingFolder || !draftFolder) return

    const trimmedName = draftFolderName.trim()
    if (!trimmedName) {
      toast.error('폴더 이름을 입력해주세요.')
      return
    }

    if (draftFolder.mode === 'rename' && trimmedName === String(draftFolder.currentName || '').trim()) {
      setDraftFolder(null)
      setDraftFolderName('')
      return
    }

    const pendingDraft = draftFolder
    creatingFolderRef.current = true
    setIsSubmittingFolder(true)
    setDraftFolder(null)
    setDraftFolderName('')

    try {
      if (pendingDraft.mode === 'rename') {
        await renameCategory(pendingDraft.folderId, trimmedName)
        toast.success('폴더 이름을 변경했습니다.')
      } else {
        await createCategory(trimmedName, pendingDraft?.parentId ?? null)
        toast.success(pendingDraft?.parentName ? `${pendingDraft.parentName} 안에 폴더를 만들었습니다.` : '새 폴더를 만들었습니다.')
      }
    } catch {
      setDraftFolder(pendingDraft)
      setDraftFolderName(trimmedName)
      toast.error(pendingDraft.mode === 'rename' ? '폴더 이름 변경에 실패했습니다.' : '폴더 생성에 실패했습니다.')
    } finally {
      creatingFolderRef.current = false
      setIsSubmittingFolder(false)
    }
  }

  const handleDraftKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraftFolder(null)
      setDraftFolderName('')
    }
  }

  const handleFolderDragOver = (event, folderId) => {
    const draggedNote = getDraggedNote(event)
    const draggedFolder = getDraggedFolder(event)
    if (!draggedNote && !draggedFolder) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(folderId == null ? ROOT_DROP_TARGET : String(folderId))
  }

  const handleFolderDrop = async (event, folderId, folderName) => {
    const draggedNote = getDraggedNote(event)
    const draggedFolder = getDraggedFolder(event)
    if (!draggedNote && !draggedFolder) return

    event.preventDefault()
    event.stopPropagation()
    setDropTargetId(null)
    setDraggingNoteId(null)
    setDraggingFolderId(null)
    clearDraggedNote()
    clearDraggedFolder()

    if (draggedFolder) {
      const nextParentId = folderId ?? null

      if (isFolderMoveInvalid(draggedFolder, nextParentId, categories)) {
        return
      }

      setMovingFolderId(String(draggedFolder.id))
      try {
        await moveCategory(draggedFolder.id, nextParentId)
        setPendingFocusFolderId(nextParentId == null ? ROOT_DROP_TARGET : String(draggedFolder.id))
        toast.success(nextParentId == null
          ? `"${draggedFolder.name}" 폴더를 최상위로 이동했습니다.`
          : `"${draggedFolder.name}" 폴더를 ${folderName} 아래로 이동했습니다.`)
      } catch (error) {
        if (error?.code === 'FOLDER_MOVE_INVALID') {
          toast.error('해당 위치로는 폴더를 이동할 수 없습니다.')
        } else if (error?.code === 'FOLDER_NAME_DUPLICATED') {
          toast.error('대상 위치에 같은 이름의 폴더가 이미 있습니다.')
        } else if (error?.code === 'FOLDER_NOT_FOUND') {
          toast.error('이동할 폴더 또는 대상 폴더를 찾을 수 없습니다.')
        } else {
          toast.error('폴더 이동에 실패했습니다.')
        }
      } finally {
        setMovingFolderId(null)
      }
      return
    }

    const currentFolderId = draggedNote.folderId ?? null
    const nextFolderId = folderId ?? null
    if (String(currentFolderId ?? '') === String(nextFolderId ?? '')) {
      return
    }

    setMovingNoteId(String(draggedNote.id))
    try {
      await moveNoteToFolder(draggedNote.id, nextFolderId)
      setCategoryId(nextFolderId == null ? '' : String(nextFolderId))
      setPendingFocusFolderId(nextFolderId == null ? ROOT_DROP_TARGET : String(nextFolderId))
      toast.success(`"${draggedNote.title}" 문서를 ${folderName}로 이동했습니다.`)
    } catch {
      toast.error('문서 이동에 실패했습니다.')
    } finally {
      setMovingNoteId(null)
    }
  }

  const handleNoteDragStart = (event, note) => {
    setDraggedNote(event, note)
    setDraggingNoteId(String(note.id))
  }

  const handleNoteDragEnd = () => {
    setDraggingNoteId(null)
    setDropTargetId(null)
    clearDraggedNote()
  }

  const handleFolderDragStart = (event, folder) => {
    setDraggedFolder(event, folder)
    setDraggingFolderId(String(folder.id))
  }

  const handleFolderDragEnd = () => {
    setDraggingFolderId(null)
    setDropTargetId(null)
    clearDraggedFolder()
  }

  const handleRenameNote = (note, surface) => {
    setContextMenu(null)
    setDraftNote({
      noteId: String(note.id),
      surface,
      placeholder: note.title || '노트 제목',
    })
    setDraftNoteTitle('')
  }

  const handleDraftNoteSubmit = async (event) => {
    event.preventDefault()
    if (renamingNoteRef.current || isRenamingNote || !draftNote) return

    const trimmedTitle = draftNoteTitle.trim()
    if (!trimmedTitle) {
      toast.error('노트 이름을 입력해주세요.')
      return
    }

    const noteSnapshot = allNotes.find((candidate) => String(candidate.id) === String(draftNote.noteId))
    if (!noteSnapshot) {
      toast.error('노트 정보를 다시 불러온 뒤 시도해주세요.')
      return
    }

    if (trimmedTitle === String(noteSnapshot.title || '').trim()) {
      setDraftNote(null)
      setDraftNoteTitle('')
      return
    }

    const pendingDraftNote = draftNote
    renamingNoteRef.current = true
    setIsRenamingNote(true)
    setDraftNote(null)
    setDraftNoteTitle('')

    try {
      await updateNoteInVault(noteSnapshot.id, {
        title: trimmedTitle,
        content: noteSnapshot.content ?? '',
        visibility: noteSnapshot.visibility ?? 'PRIVATE',
        aiCollectable: noteSnapshot.aiCollectable ?? true,
        folderId: noteSnapshot.folderId ?? noteSnapshot.categoryId ?? noteSnapshot.category?.id ?? null,
      })
      toast.success('노트 이름을 변경했습니다.')
    } catch {
      setDraftNote(pendingDraftNote)
      setDraftNoteTitle(trimmedTitle)
      toast.error('이름 변경에 실패했습니다.')
    } finally {
      renamingNoteRef.current = false
      setIsRenamingNote(false)
    }
  }

  const handleDraftNoteKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      setDraftNote(null)
      setDraftNoteTitle('')
    }
  }

  const handleDeleteNote = async (note) => {
    setContextMenu(null)

    const ok = await confirm(`"${note.title}" 노트를 삭제하시겠습니까?`, {
      title: '노트 삭제',
      confirmLabel: '삭제',
      cancelLabel: '취소',
    })

    if (!ok) return

    try {
      await deleteNoteInVault(note.id)
      if (activePostId === String(note.id)) {
        navigate('/notes/list')
      }
      toast.success('노트를 삭제했습니다.')
    } catch {
      toast.error('삭제에 실패했습니다.')
    }
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
        {contextMenu ? (
          <div
            ref={contextMenuRef}
            className="sidebar-context-menu"
            style={{ left: contextMenu.x, top: contextMenu.y }}
            role="menu"
            aria-label={contextMenu.kind === 'note' ? '노트 메뉴' : '폴더 메뉴'}
          >
            {contextMenu.kind === 'note' ? (
              <>
                <button
                  type="button"
                  className="sidebar-context-menu-item"
                  onClick={() => handleRenameNote(contextMenu.note, contextMenu.surface)}
                  role="menuitem"
                >
                  이름 변경
                </button>
                <button
                  type="button"
                  className="sidebar-context-menu-item"
                  onClick={() => handleDeleteNote(contextMenu.note)}
                  role="menuitem"
                >
                  삭제
                </button>
              </>
            ) : (
              <>
                {contextMenu.parentFolder ? (
                  <>
                    <button
                      type="button"
                      className="sidebar-context-menu-item"
                      onClick={() => {
                        openFolderRenameDraft(contextMenu.parentFolder)
                        setContextMenu(null)
                      }}
                      role="menuitem"
                    >
                      이름 변경
                    </button>
                    <button
                      type="button"
                      className="sidebar-context-menu-item"
                      onClick={() => handleDeleteFolder(contextMenu.parentFolder)}
                      role="menuitem"
                    >
                      삭제
                    </button>
                  </>
                ) : null}
                <button
                  type="button"
                  className="sidebar-context-menu-item"
                  onClick={() => {
                    openFolderDraft(contextMenu.parentFolder)
                    setContextMenu(null)
                  }}
                  role="menuitem"
                >
                  새 폴더
                </button>
              </>
            )}
          </div>
        ) : null}

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
                draftNote?.surface === 'recent' && String(draftNote.noteId) === String(note.id) ? (
                  <DraftNoteRow
                    key={note.id}
                    draftName={draftNoteTitle}
                    placeholder={draftNote.placeholder}
                    onDraftNameChange={setDraftNoteTitle}
                    onDraftSubmit={handleDraftNoteSubmit}
                    onDraftKeyDown={handleDraftNoteKeyDown}
                    disabled={isRenamingNote}
                  />
                ) : (
                  <li key={note.id}>
                    <button
                      draggable={String(movingNoteId) !== String(note.id)}
                      className={`sidebar-item sidebar-file-item recent-file-item${draggingNoteId === String(note.id) ? ' is-dragging' : ''}`}
                      onClick={() => navigate(`/notes/${note.id}`)}
                      onContextMenu={(event) => openNoteContextMenu(note, event, 'recent')}
                      onDragStart={(event) => handleNoteDragStart(event, note)}
                      onDragEnd={handleNoteDragEnd}
                      title={note.title}
                    >
                      <span className="recent-file-dot">·</span>
                      <span className="recent-file-label">{note.title}</span>
                    </button>
                  </li>
                )
              ))}
            </ul>
          </SidebarSection>
        )}

        <SidebarSection title="폴더" defaultOpen aside="우클릭 +" className="sidebar-section--folders" contentClassName="sidebar-section-content--fill">
          <div className="sidebar-folder-surface" onContextMenu={(event) => openFolderContextMenu(event, null)}>
            <CategoryTree
              categories={categories}
              notes={allNotes}
              onPostClick={navigateToNote}
              activeFolderId={showFolderSelection ? categoryId : ''}
              onFolderClick={handleFolderClick}
              activePostId={activePostId}
              searchQuery={explorerQuery.trim().toLowerCase()}
              onTreeContextMenu={(event) => openFolderContextMenu(event, null)}
              onFolderContextMenu={(folder, event) => openFolderContextMenu(event, folder)}
              onNoteContextMenu={openNoteContextMenu}
              onFolderDragOver={handleFolderDragOver}
              onFolderDrop={handleFolderDrop}
              onFolderDragStart={handleFolderDragStart}
              onFolderDragEnd={handleFolderDragEnd}
              onNoteDragStart={handleNoteDragStart}
              onNoteDragEnd={handleNoteDragEnd}
              dropTargetId={dropTargetId}
              draggingNoteId={draggingNoteId}
              draggingFolderId={draggingFolderId}
              movingNoteId={movingNoteId}
              movingFolderId={movingFolderId}
              draftNote={draftNote}
              draftNoteTitle={draftNoteTitle}
              onDraftNoteTitleChange={setDraftNoteTitle}
              onDraftNoteSubmit={handleDraftNoteSubmit}
              onDraftNoteKeyDown={handleDraftNoteKeyDown}
              isRenamingNote={isRenamingNote}
              draftFolder={draftFolder}
              draftName={draftFolderName}
              onDraftNameChange={setDraftFolderName}
              onDraftSubmit={handleFolderDraftSubmit}
              onDraftKeyDown={handleDraftKeyDown}
              isSubmittingFolder={isSubmittingFolder}
              registerFolderButton={registerFolderButton}
              rootFolderButtonRef={rootFolderButtonRef}
            />
          </div>
        </SidebarSection>

        {categoryId ? (
          <button type="button" className="sidebar-reset-btn" onClick={() => { resetFilters(); navigate('/notes/list') }}>
            선택 해제
          </button>
        ) : null}
      </div>
    </aside>
  )
}

export default VaultSidebar
