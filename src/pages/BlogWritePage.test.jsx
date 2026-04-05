import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import BlogWritePage from './BlogWritePage'

const mockCreateNote = vi.fn()
const mockUpdateNote = vi.fn()
const mockFetchNote = vi.fn()
const mockFetchCategories = vi.fn()
const mockFetchTags = vi.fn()
const mockCreateTag = vi.fn()
const mockCreateCategory = vi.fn()
const mockRefreshNotes = vi.fn()
const mockToast = {
  success: vi.fn(),
  error: vi.fn(),
  info: vi.fn(),
}
const mockConfirm = vi.fn()

vi.mock('../components/TiptapEditor', () => ({
  default: ({ value = '', onChange }) => (
    <textarea aria-label="본문 입력" value={value} onChange={(event) => onChange(event.target.value)} />
  ),
}))

vi.mock('../api/client', () => ({
  fetchNote: (...args) => mockFetchNote(...args),
  createNote: (...args) => mockCreateNote(...args),
  updateNote: (...args) => mockUpdateNote(...args),
  fetchCategories: (...args) => mockFetchCategories(...args),
  fetchTags: (...args) => mockFetchTags(...args),
  createTag: (...args) => mockCreateTag(...args),
  createCategory: (...args) => mockCreateCategory(...args),
}))

vi.mock('../contexts/ToastContext', () => ({
  useToast: () => mockToast,
}))

vi.mock('../contexts/VaultContext', () => ({
  useVaultOptional: () => ({
    refreshNotes: mockRefreshNotes,
  }),
}))

vi.mock('../components/ConfirmModal', () => ({
  useConfirm: () => mockConfirm,
}))

function renderWritePage(initialEntry = '/notes/write') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route path="/notes/write" element={<BlogWritePage />} />
        <Route path="/notes/edit/:id" element={<BlogWritePage />} />
        <Route path="/notes/:id" element={<div>note detail</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('BlogWritePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.innerWidth = 1280
    mockFetchCategories.mockResolvedValue({ categories: [] })
    mockFetchTags.mockResolvedValue({ tags: [] })
    mockCreateTag.mockResolvedValue({ id: 'tag-1', name: '새 태그' })
    mockCreateCategory.mockResolvedValue({ id: 'cat-1', name: '새 카테고리' })
    mockRefreshNotes.mockResolvedValue()
    mockConfirm.mockResolvedValue(true)
  })

  it('navigates to the saved note detail after creating a note', async () => {
    mockCreateNote.mockResolvedValue({ id: 'note-321', title: '테스트 노트' })

    renderWritePage()

    fireEvent.change(screen.getByLabelText('노트 제목'), { target: { value: '테스트 노트' } })
    fireEvent.click(screen.getByRole('button', { name: '저장' }))

    await screen.findByText('note detail')

    expect(mockCreateNote).toHaveBeenCalledWith(
      expect.objectContaining({
        title: '테스트 노트',
      }),
    )
    expect(mockRefreshNotes).toHaveBeenCalled()
    expect(mockToast.success).toHaveBeenCalled()
  })

  it('starts with the settings panel closed on mobile and opens it on toggle', async () => {
    window.innerWidth = 640

    const { container } = renderWritePage()

    await waitFor(() => expect(mockFetchCategories).toHaveBeenCalled())

    const panel = container.querySelector('.bw-meta-panel')
    expect(panel).not.toHaveClass('open')

    const [headerToggle] = screen.getAllByRole('button', { name: /설정/ })
    fireEvent.click(headerToggle)

    expect(panel).toHaveClass('open')
  })
})
