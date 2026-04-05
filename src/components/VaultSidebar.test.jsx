import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import VaultSidebar from './VaultSidebar'
import { clearDraggedNote } from '../utils/noteDrag'

const mockUseVault = vi.fn()
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

function renderSidebar(overrides = {}, initialEntry = '/notes/list') {
  const baseVault = {
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
    moveNoteToFolder: vi.fn().mockResolvedValue(true),
  }

  const vault = { ...baseVault, ...overrides }
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

describe('VaultSidebar', () => {
  beforeEach(() => {
    mockUseVault.mockReset()
    mockToast.success.mockReset()
    mockToast.error.mockReset()
    clearDraggedNote()
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
})
