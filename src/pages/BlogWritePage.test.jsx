import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { vi } from 'vitest'
import BlogWritePage from './BlogWritePage'

const mockCreateNote = vi.fn()
const mockUpdateNote = vi.fn()
const mockFetchNote = vi.fn()
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

  it('starts with the inspector panel closed on mobile and opens it on toggle', async () => {
    window.innerWidth = 640

    const { container } = renderWritePage()

    const panel = container.querySelector('.bw-meta-panel')
    expect(panel).not.toHaveClass('open')

    const [headerToggle] = screen.getAllByRole('button', { name: /인스펙터|설정/ })
    fireEvent.click(headerToggle)

    expect(panel).toHaveClass('open')
  })
})
