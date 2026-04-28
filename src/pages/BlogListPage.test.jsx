import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import BlogListPage from './BlogListPage'

const mockFetchNotes = vi.fn()
const mockUseVault = vi.fn()

vi.mock('../api/client', () => ({
  fetchNotes: (...args) => mockFetchNotes(...args),
}))

function renderWithQuery(ui) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity, staleTime: 0 },
      mutations: { retry: false },
    },
  })
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )
}

vi.mock('../contexts/VaultContext', () => ({
  useVault: () => mockUseVault(),
}))

vi.mock('../hooks/useDebounce', () => ({
  useDebounce: (value) => value,
}))

describe('BlogListPage', () => {
  beforeEach(() => {
    mockFetchNotes.mockReset()
    mockUseVault.mockReset()

    mockUseVault.mockReturnValue({
      categories: [],
      categoryId: '',
      setCategoryId: vi.fn(),
      addRecentNote: vi.fn(),
      notesRevision: 0,
    })

    mockFetchNotes.mockResolvedValue({
      posts: [
        {
          id: 'note_1',
          title: '첫 번째 노트',
          content: '테스트 본문입니다.',
          visibility: 'PUBLIC',
          aiCollectable: false,
          createdAt: '2026-04-12T12:00:00.000Z',
          updatedAt: '2026-04-12T12:00:00.000Z',
          category: null,
          categoryId: null,
          folderId: null,
        },
      ],
      total: 1,
      totalPages: 1,
      hasNext: false,
      hasPrev: false,
    })
  })

  it('renders the note vault list even when the vault context has no tag reset handler', async () => {
    renderWithQuery(<BlogListPage />)

    expect(screen.getByRole('heading', { name: '노트 보관함' })).toBeInTheDocument()

    await waitFor(() => {
      expect(mockFetchNotes).toHaveBeenCalledTimes(1)
    })

    expect(await screen.findByText('첫 번째 노트')).toBeInTheDocument()
  })
})
