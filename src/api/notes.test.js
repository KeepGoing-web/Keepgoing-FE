import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createNote, moveNote, updateNote, uploadNoteImage } from './notes'

function mockJsonResponse(body, init = {}) {
  return new Response(JSON.stringify(body), {
    status: init.status ?? 200,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('note write requests', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn())
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('sends application/json when creating a note', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse(
        {
          data: {
            id: 1,
            title: '제목',
            content: '내용',
            visibility: 'PRIVATE',
            aiCollectable: true,
            folderId: null,
          },
        },
        { status: 201 },
      ),
    )

    await createNote({
      title: '제목',
      content: '내용',
      visibility: 'PRIVATE',
      aiCollectable: true,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/notes',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('sends application/json when updating a note', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          id: 1,
          title: '수정 제목',
          content: '수정 내용',
          visibility: 'PRIVATE',
          aiCollectable: true,
          folderId: null,
        },
      }),
    )

    await updateNote(1, {
      title: '수정 제목',
      content: '수정 내용',
      visibility: 'PRIVATE',
      aiCollectable: true,
    })

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/notes/1',
      expect.objectContaining({
        method: 'PUT',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('sends application/json when moving a note', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse({
        data: {
          id: 1,
          title: '제목',
          content: '내용',
          visibility: 'PRIVATE',
          aiCollectable: true,
          folderId: 2,
        },
      }),
    )

    await moveNote(1, 2)

    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/notes/1/folder',
      expect.objectContaining({
        method: 'PATCH',
        credentials: 'include',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    )
  })

  it('sends multipart/form-data without forcing a content-type when uploading a note image', async () => {
    globalThis.fetch.mockResolvedValueOnce(
      mockJsonResponse(
        {
          data: {
            publicId: 'image-public-id',
            status: 'PENDING',
          },
        },
        { status: 201 },
      ),
    )

    const file = new File(['image-content'], 'image.png', { type: 'image/png' })

    const result = await uploadNoteImage(10, file)

    expect(result).toEqual({ publicId: 'image-public-id', status: 'PENDING' })
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/notes/10/images',
      expect.objectContaining({
        method: 'POST',
        credentials: 'include',
        body: expect.any(FormData),
      }),
    )

    const [, options] = globalThis.fetch.mock.calls[0]
    expect(options.headers).not.toHaveProperty('Content-Type')
    expect(options.body.get('file')).toBe(file)
  })
})
