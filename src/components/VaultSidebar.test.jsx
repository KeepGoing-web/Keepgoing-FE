import { useMemo, useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VaultSidebar from './VaultSidebar'
import { clearDraggedNote } from '../utils/noteDrag'
import { clearDraggedFolder } from '../utils/folderDrag'

const mockUseVault = vi.fn()
const mockConfirm = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
}

vi.mock('../contexts/VaultContext', () => ({
  useVault: () => mockUseVault(),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}))

vi.mock('./ConfirmModal', () => ({
  useConfirm: () => mockConfirm,
}))

function createDataTransfer() {
  const store = new Map()

  return {
    effectAllowed: 'all',
    dropEffect: 'move',
    setData: (type, value) => {
      store.set(type, value)
    },
    getData: (type) => store.get(type) || '',
  }
}

function createBaseVault(overrides = {}) {
  return {
    allNotes: [
      { id: 'note_1', title: '미분류 노트', content: '미분류 메모', folderId: null, categoryId: null, category: null },
      { id: 'note_2', title: '인박스 문서', content: '폴더 안 문서', folderId: 'folder_1', categoryId: 'folder_1', category: { id: 'folder_1', name: 'Inbox' } },
    ],
    categories: [
      { id: 'folder_1', name: 'Inbox', parentId: null },
      { id: 'folder_2', name: 'Archive', parentId: null },
    ],
    recentNotes: [],
    categoryId: '',
    setCategoryId: vi.fn(),
    navigateToNote: vi.fn(),
    resetFilters: vi.fn(),
    createCategory: vi.fn().mockResolvedValue({ id: 'folder_3', name: '회의록', parentId: 'folder_1' }),
    renameCategory: vi.fn().mockResolvedValue({ id: 'folder_1', name: 'Inbox 정리', parentId: null }),
    deleteCategory: vi.fn().mockResolvedValue(true),
    moveCategory: vi.fn().mockResolvedValue({ id: 'folder_2', name: 'Archive', parentId: 'folder_1' }),
    moveNoteToFolder: vi.fn().mockResolvedValue(true),
    updateNote: vi.fn().mockResolvedValue(true),
    deleteNote: vi.fn().mockResolvedValue(true),
    ...overrides,
  }
}

function renderSidebar(overrides = {}, initialEntry = '/notes/list') {
  const vault = createBaseVault(overrides)
  mockUseVault.mockReturnValue(vault)

  const view = render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/notes/*" element={<VaultSidebar />} />
      </Routes>
    </MemoryRouter>,
  )

  return { vault, ...view }
}

function renderSidebarWithLiveCategoryId(overrides = {}, initialEntry = '/notes/list') {
  const sharedVault = createBaseVault(overrides)
  let latestVault = sharedVault

  function Harness() {
    const [categoryId, setCategoryIdState] = useState(sharedVault.categoryId)
    const setCategoryId = useMemo(() => vi.fn((nextCategoryId) => setCategoryIdState(nextCategoryId)), [])
    const vault = useMemo(() => ({
      ...sharedVault,
      categoryId,
      setCategoryId,
    }), [categoryId, setCategoryId])

    latestVault = vault
    mockUseVault.mockReturnValue(vault)

    return (
      <MemoryRouter initialEntries={[initialEntry]}>
        <Routes>
          <Route path="/notes/*" element={<VaultSidebar />} />
        </Routes>
      </MemoryRouter>
    )
  }

  const view = render(<Harness />)
  return {
    get vault() {
      return latestVault
    },
    ...view,
  }
}

describe('VaultSidebar', () => {
  beforeEach(() => {
    mockUseVault.mockReset()
    mockConfirm.mockReset()
    mockConfirm.mockResolvedValue(true)
    mockToast.success.mockReset()
    mockToast.error.mockReset()
    clearDraggedNote()
    clearDraggedFolder()
  })

  it('opens the same context menu from blank folder-area space and creates a top-level folder inline', async () => {
    const user = userEvent.setup()
    const { vault, container } = renderSidebar()
    const surface = container.querySelector('.sidebar-folder-surface')

    fireEvent.contextMenu(surface)

    await user.click(screen.getByRole('menuitem', { name: '새 폴더' }))
    expect(screen.getByLabelText('새 폴더 이름')).toBeInTheDocument()

    await user.type(screen.getByLabelText('새 폴더 이름'), '인박스{Enter}')

    await waitFor(() => {
      expect(vault.createCategory).toHaveBeenCalledWith('인박스', null)
      expect(vault.createCategory).toHaveBeenCalledTimes(1)
    })
  })

  it('moves a dragged note into a folder drop target', async () => {
    const { vault } = renderSidebar()
    const dataTransfer = createDataTransfer()

    fireEvent.dragStart(screen.getByRole('button', { name: /미분류 노트/i }), { dataTransfer })
    fireEvent.dragOver(screen.getByRole('button', { name: /Inbox/i }), { dataTransfer })
    fireEvent.drop(screen.getByRole('button', { name: /Inbox/i }), { dataTransfer })

    await waitFor(() => {
      expect(vault.moveNoteToFolder).toHaveBeenCalledWith('note_1', 'folder_1')
    })
  })

  it('falls back to global drag payload when the browser does not expose custom drag data on drop', async () => {
    const { vault } = renderSidebar()
    const startTransfer = createDataTransfer()
    const dropTransfer = createDataTransfer()

    fireEvent.dragStart(screen.getByRole('button', { name: /미분류 노트/i }), { dataTransfer: startTransfer })
    fireEvent.dragOver(screen.getByRole('button', { name: /Inbox/i }), { dataTransfer: dropTransfer })
    fireEvent.drop(screen.getByRole('button', { name: /Inbox/i }), { dataTransfer: dropTransfer })

    await waitFor(() => {
      expect(vault.moveNoteToFolder).toHaveBeenCalledWith('note_1', 'folder_1')
    })
  })

  it('focuses the actual nested target folder after a successful drop', async () => {
    const dataTransfer = createDataTransfer()
    const { vault } = renderSidebar({
      categories: [
        { id: 'folder_1', name: 'Top', parentId: null },
        { id: 'folder_2', name: 'Middle', parentId: 'folder_1' },
        { id: 'folder_3', name: 'Bottom', parentId: 'folder_2' },
      ],
      allNotes: [
        { id: 'note_1', title: '미분류 노트', content: '미분류 메모', folderId: null, categoryId: null, category: null },
      ],
      moveNoteToFolder: vi.fn().mockResolvedValue(true),
    })

    fireEvent.dragStart(screen.getByRole('button', { name: /미분류 노트/i }), { dataTransfer })
    fireEvent.dragOver(screen.getByRole('button', { name: /Bottom/i }), { dataTransfer })
    fireEvent.drop(screen.getByRole('button', { name: /Bottom/i }), { dataTransfer })

    await waitFor(() => {
      expect(vault.moveNoteToFolder).toHaveBeenCalledWith('note_1', 'folder_3')
      expect(screen.getByRole('button', { name: /Bottom/i })).toHaveFocus()
    })
  })

  it('keeps the innermost nested folder as the visible drag target while dragging', async () => {
    const dataTransfer = createDataTransfer()
    renderSidebar({
      categories: [
        { id: 'folder_1', name: 'Top', parentId: null },
        { id: 'folder_2', name: 'Middle', parentId: 'folder_1' },
        { id: 'folder_3', name: 'Bottom', parentId: 'folder_2' },
      ],
      allNotes: [
        { id: 'note_1', title: '미분류 노트', content: '미분류 메모', folderId: null, categoryId: null, category: null },
      ],
    })

    fireEvent.dragStart(screen.getByRole('button', { name: /미분류 노트/i }), { dataTransfer })
    fireEvent.dragOver(screen.getByRole('button', { name: /Bottom/i }), { dataTransfer })

    expect(screen.getByRole('button', { name: /Bottom/i })).toHaveClass('drop-target')
    expect(screen.getByRole('button', { name: /Top/i })).not.toHaveClass('drop-target')
  })

  it('moves a folder into another folder via drag and drop', async () => {
    const dataTransfer = createDataTransfer()
    const { vault } = renderSidebar({
      categories: [
        { id: 'folder_1', name: 'Top', parentId: null },
        { id: 'folder_2', name: 'Middle', parentId: null },
      ],
      allNotes: [],
      moveCategory: vi.fn().mockResolvedValue({ id: 'folder_2', name: 'Middle', parentId: 'folder_1' }),
    })

    fireEvent.dragStart(screen.getByRole('button', { name: /Middle/i }), { dataTransfer })
    fireEvent.dragOver(screen.getByRole('button', { name: /Top/i }), { dataTransfer })
    fireEvent.drop(screen.getByRole('button', { name: /Top/i }), { dataTransfer })

    await waitFor(() => {
      expect(vault.moveCategory).toHaveBeenCalledWith('folder_2', 'folder_1')
    })
  })

  it('moves a folder to root via drag and drop', async () => {
    const dataTransfer = createDataTransfer()
    const { vault, container } = renderSidebar({
      categories: [
        { id: 'folder_1', name: 'Top', parentId: null },
        { id: 'folder_2', name: 'Middle', parentId: 'folder_1' },
      ],
      allNotes: [],
      moveCategory: vi.fn().mockResolvedValue({ id: 'folder_2', name: 'Middle', parentId: null }),
    })

    fireEvent.dragStart(screen.getByRole('button', { name: /Middle/i }), { dataTransfer })
    const rootDropZone = container.querySelector('.sidebar-root-drop-zone')
    expect(rootDropZone).toBeInTheDocument()

    fireEvent.dragOver(rootDropZone, { dataTransfer })
    fireEvent.drop(rootDropZone, { dataTransfer })

    await waitFor(() => {
      expect(vault.moveCategory).toHaveBeenCalledWith('folder_2', null)
    })
  })

  it('creates a child folder inline and submits on Enter', async () => {
    const user = userEvent.setup()
    const { vault } = renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: /Inbox/i }))

    await user.click(screen.getByRole('menuitem', { name: '새 폴더' }))
    await user.type(screen.getByLabelText('새 폴더 이름'), '회의록{Enter}')

    await waitFor(() => {
      expect(vault.createCategory).toHaveBeenCalledWith('회의록', 'folder_1')
      expect(vault.createCategory).toHaveBeenCalledTimes(1)
    })
  })

  it('opens folder actions on right click and renames the selected folder inline', async () => {
    const user = userEvent.setup()
    const { vault } = renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: /Inbox/i }))

    await user.click(screen.getByRole('menuitem', { name: '이름 변경' }))

    const renameInput = screen.getByLabelText('폴더 이름 변경')
    expect(renameInput).toBeInTheDocument()
    expect(renameInput).toHaveAttribute('placeholder', 'Inbox')

    await user.type(renameInput, 'Inbox 정리{Enter}')

    await waitFor(() => {
      expect(vault.renameCategory).toHaveBeenCalledWith('folder_1', 'Inbox 정리')
    })

    expect(mockToast.success).toHaveBeenCalledWith('폴더 이름을 변경했습니다.')
  })

  it('deletes the selected folder from the folder context menu after confirmation', async () => {
    const user = userEvent.setup()
    const { vault } = renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: /Inbox/i }))

    await user.click(screen.getByRole('menuitem', { name: '삭제' }))

    expect(mockConfirm).toHaveBeenCalledWith(
      '"Inbox" 폴더를 삭제하시겠습니까?\n하위 폴더나 노트가 남아 있으면 삭제할 수 없습니다.',
      expect.objectContaining({
        title: '폴더 삭제',
        confirmLabel: '삭제',
      }),
    )

    await waitFor(() => {
      expect(vault.deleteCategory).toHaveBeenCalledWith('folder_1')
    })

    expect(mockToast.success).toHaveBeenCalledWith('폴더를 삭제했습니다.')
  })

  it('opens note actions on right click and renames the selected note inline', async () => {
    const user = userEvent.setup()
    const { vault } = renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: /인박스 문서/i }))

    await user.click(screen.getByRole('menuitem', { name: '이름 변경' }))

    const renameInput = screen.getByLabelText('노트 이름 변경')
    expect(renameInput).toBeInTheDocument()
    expect(renameInput).toHaveAttribute('placeholder', '인박스 문서')

    await user.type(renameInput, '회의록 초안{Enter}')

    await waitFor(() => {
      expect(vault.updateNote).toHaveBeenCalledWith('note_2', expect.objectContaining({
        title: '회의록 초안',
        content: '폴더 안 문서',
        folderId: 'folder_1',
      }))
    })

    expect(mockToast.success).toHaveBeenCalledWith('노트 이름을 변경했습니다.')
  })

  it('deletes the selected note from the note context menu after confirmation', async () => {
    const user = userEvent.setup()
    const { vault } = renderSidebar()

    fireEvent.contextMenu(screen.getByRole('button', { name: /인박스 문서/i }))

    await user.click(screen.getByRole('menuitem', { name: '삭제' }))

    expect(mockConfirm).toHaveBeenCalledWith('"인박스 문서" 노트를 삭제하시겠습니까?', expect.objectContaining({
      title: '노트 삭제',
      confirmLabel: '삭제',
    }))

    await waitFor(() => {
      expect(vault.deleteNote).toHaveBeenCalledWith('note_2')
    })

    expect(mockToast.success).toHaveBeenCalledWith('노트를 삭제했습니다.')
  })

  it('keeps the folder collapsed on the first click even after that folder becomes active', async () => {
    const user = userEvent.setup()
    renderSidebarWithLiveCategoryId()

    expect(screen.getByRole('button', { name: /인박스 문서/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Inbox/i }))

    expect(screen.queryByRole('button', { name: /인박스 문서/i })).not.toBeInTheDocument()
  })

  it('does not keep folder or recent-note active styling when a note page is open', () => {
    const { container } = renderSidebar({
      categoryId: 'folder_1',
      recentNotes: [{ id: 'note_2', title: '인박스 문서' }],
    }, '/notes/note_2')

    expect(screen.getByRole('button', { name: /Inbox/i })).not.toHaveClass('active')

    const recentNoteButton = container.querySelector('.recent-file-item')
    expect(recentNoteButton).not.toHaveClass('active')

    const treeNoteButton = container.querySelector('.sidebar-tree-surface .sidebar-file-item:not(.recent-file-item)')
    expect(treeNoteButton).toHaveClass('active')
  })

  it('toggles the clicked folder level when the folder label is clicked', async () => {
    const user = userEvent.setup()
    renderSidebar()

    expect(screen.getByRole('button', { name: /인박스 문서/i })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Inbox/i }))
    expect(screen.queryByRole('button', { name: /인박스 문서/i })).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /Inbox/i }))
    expect(screen.getByRole('button', { name: /인박스 문서/i })).toBeInTheDocument()
  })

})
