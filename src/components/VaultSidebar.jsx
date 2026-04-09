import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useVault } from '../contexts/VaultContext'
import { useToast } from '../contexts/ToastContext'
import { useConfirm } from './ConfirmModal'
import { clearDraggedNote, getDraggedNote, setDraggedNote } from '../utils/noteDrag'
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

const DraftFolderRow = ({
  draftName,
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
        placeholder="새 폴더"
        aria-label="새 폴더 이름"
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
  onNoteDragStart,
  onNoteDragEnd,
  dropTargetId,
  draggingNoteId,
  movingNoteId,
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
  isCreatingFolder,
  registerFolderButton,
}) => {
  const childFolders = categories.filter((category) => String(category.parentId) === String(folder.id))
  const visibleChildFolders = childFolders.filter((child) => folderHasMatch(child, categories, notes, searchQuery))
  const directNotes = notes
    .filter((note) => note.category && String(note.category.id) === String(folder.id))
    .filter((note) => noteMatchesQuery(note, searchQuery))
  const isOpen = searchQuery ? true : Boolean(openFolders[folder.id])
  const isDropTarget = dropTargetId === String(folder.id)
  const showDraftHere = draftFolder && String(draftFolder.parentId ?? '') === String(folder.id)

  if (!searchQuery && visibleChildFolders.length === 0 && directNotes.length === 0 && !folderHasMatch(folder, categories, notes, searchQuery)) {
    return null
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
          className={`sidebar-item sidebar-folder-label${activeFolderId === String(folder.id) ? ' active' : ''}${isDropTarget ? ' drop-target' : ''}`}
          onClick={() => {
            if (activeFolderId !== String(folder.id)) {
              markFolderSelectionToggle(folder.id)
            }
            onFolderClick(String(folder.id))
            toggleFolder(folder.id)
          }}
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
              disabled={isCreatingFolder}
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
              onNoteDragStart={onNoteDragStart}
              onNoteDragEnd={onNoteDragEnd}
              dropTargetId={dropTargetId}
              draggingNoteId={draggingNoteId}
              movingNoteId={movingNoteId}
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
              isCreatingFolder={isCreatingFolder}
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
  onNoteDragStart,
  onNoteDragEnd,
  dropTargetId,
  draggingNoteId,
  movingNoteId,
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
  isCreatingFolder,
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
  const showRootDraft = draftFolder && !draftFolder.parentId

  return (
    <div className="sidebar-tree-surface" onContextMenu={onTreeContextMenu}>
      <ul className="sidebar-items tree-root">
        {showRootDraft ? (
          <DraftFolderRow
            draftName={draftName}
            onDraftNameChange={onDraftNameChange}
            onDraftSubmit={onDraftSubmit}
            onDraftKeyDown={onDraftKeyDown}
            disabled={isCreatingFolder}
          />
        ) : null}

        <li>
          <button
            ref={rootFolderButtonRef}
            className={`sidebar-item sidebar-folder-row${activeFolderId === '' ? ' active' : ''}${dropTargetId === ROOT_DROP_TARGET ? ' drop-target' : ''}`}
            onClick={() => onFolderClick('')}
            onContextMenu={(event) => {
              event.preventDefault()
              event.stopPropagation()
              onTreeContextMenu(event)
            }}
            onDragOver={(event) => onFolderDragOver(event, null)}
            onDrop={(event) => onFolderDrop(event, null, '전체 문서')}
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
            onNoteDragStart={onNoteDragStart}
            onNoteDragEnd={onNoteDragEnd}
            dropTargetId={dropTargetId}
            draggingNoteId={draggingNoteId}
            movingNoteId={movingNoteId}
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
            isCreatingFolder={isCreatingFolder}
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
  const [isCreatingFolder, setIsCreatingFolder] = useState(false)
  const [draftNote, setDraftNote] = useState(null)
  const [draftNoteTitle, setDraftNoteTitle] = useState('')
  const [isRenamingNote, setIsRenamingNote] = useState(false)
  const [dropTargetId, setDropTargetId] = useState(null)
  const [draggingNoteId, setDraggingNoteId] = useState(null)
  const [movingNoteId, setMovingNoteId] = useState(null)
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
      clearDraggedNote()
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
      parentId: parentFolder?.id ?? null,
      parentName: parentFolder?.name ?? null,
    })
    setDraftFolderName('')
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

  const handleCreateFolder = async (event) => {
    event.preventDefault()
    if (creatingFolderRef.current || isCreatingFolder || !draftFolder) return

    const trimmedName = draftFolderName.trim()
    if (!trimmedName) {
      toast.error('폴더 이름을 입력해주세요.')
      return
    }

    const pendingDraft = draftFolder
    creatingFolderRef.current = true
    setIsCreatingFolder(true)
    setDraftFolder(null)
    setDraftFolderName('')

    try {
      await createCategory(trimmedName, pendingDraft?.parentId ?? null)
      toast.success(pendingDraft?.parentName ? `${pendingDraft.parentName} 안에 폴더를 만들었습니다.` : '새 폴더를 만들었습니다.')
    } catch {
      setDraftFolder(pendingDraft)
      setDraftFolderName(trimmedName)
      toast.error('폴더 생성에 실패했습니다.')
    } finally {
      creatingFolderRef.current = false
      setIsCreatingFolder(false)
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
    if (!getDraggedNote(event)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    setDropTargetId(folderId == null ? ROOT_DROP_TARGET : String(folderId))
  }

  const handleFolderDrop = async (event, folderId, folderName) => {
    const draggedNote = getDraggedNote(event)
    if (!draggedNote) return

    event.preventDefault()
    event.stopPropagation()
    setDropTargetId(null)
    setDraggingNoteId(null)
    clearDraggedNote()

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
              onNoteDragStart={handleNoteDragStart}
              onNoteDragEnd={handleNoteDragEnd}
              dropTargetId={dropTargetId}
              draggingNoteId={draggingNoteId}
              movingNoteId={movingNoteId}
              draftNote={draftNote}
              draftNoteTitle={draftNoteTitle}
              onDraftNoteTitleChange={setDraftNoteTitle}
              onDraftNoteSubmit={handleDraftNoteSubmit}
              onDraftNoteKeyDown={handleDraftNoteKeyDown}
              isRenamingNote={isRenamingNote}
              draftFolder={draftFolder}
              draftName={draftFolderName}
              onDraftNameChange={setDraftFolderName}
              onDraftSubmit={handleCreateFolder}
              onDraftKeyDown={handleDraftKeyDown}
              isCreatingFolder={isCreatingFolder}
              registerFolderButton={registerFolderButton}
              rootFolderButtonRef={rootFolderButtonRef}
            />
          </div>
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
