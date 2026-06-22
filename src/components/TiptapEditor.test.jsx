import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'
import TiptapEditor from './TiptapEditor'

describe('TiptapEditor', () => {
  beforeEach(() => {
    URL.createObjectURL = vi.fn(() => 'blob:preview-image')
    URL.revokeObjectURL = vi.fn()
  })

  it('closes the open color palette when Escape is pressed', async () => {
    const user = userEvent.setup()

    render(<TiptapEditor value="테스트" onChange={() => {}} />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: '글자색' })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: '글자색' }))

    expect(screen.getByRole('menu', { name: '글자색 선택' })).toBeInTheDocument()

    await user.keyboard('{Escape}')

    await waitFor(() => {
      expect(screen.queryByRole('menu', { name: '글자색 선택' })).not.toBeInTheDocument()
    })
  })

  it('inserts a local image preview and uploads the selected image file', async () => {
    const onUploadImage = vi.fn().mockResolvedValue({
      publicId: 'image-public-id',
      status: 'PENDING',
    })

    render(<TiptapEditor value="테스트" onChange={() => {}} noteId="10" onUploadImage={onUploadImage} />)

    const file = new File(['image-content'], 'image.png', { type: 'image/png' })

    fireEvent.change(screen.getByLabelText('이미지 파일 업로드'), { target: { files: [file] } })

    await waitFor(() => {
      expect(onUploadImage).toHaveBeenCalledWith(file)
    })

    const image = document.querySelector('img[src="blob:preview-image"]')
    expect(image).toBeInTheDocument()

    await waitFor(() => {
      expect(image).toHaveAttribute('title', 'publicId:image-public-id;status:PENDING')
    })
    expect(screen.getByRole('status')).toHaveTextContent('이미지 업로드가 시작되었습니다.')
  })

  it('uploads a pasted image file through the same local preview flow', async () => {
    const onUploadImage = vi.fn().mockResolvedValue({
      publicId: 'pasted-image-public-id',
      status: 'PENDING',
    })

    render(<TiptapEditor value="테스트" onChange={() => {}} noteId="10" onUploadImage={onUploadImage} />)

    const file = new File(['pasted-image-content'], 'pasted.png', { type: 'image/png' })
    const editor = document.querySelector('.tiptap-prosemirror')

    fireEvent.paste(editor, {
      clipboardData: {
        files: [file],
        items: [],
        getData: vi.fn(() => ''),
      },
    })

    await waitFor(() => {
      expect(onUploadImage).toHaveBeenCalledWith(file)
    })

    const image = document.querySelector('img[src="blob:preview-image"]')
    expect(image).toBeInTheDocument()

    await waitFor(() => {
      expect(image).toHaveAttribute('title', 'publicId:pasted-image-public-id;status:PENDING')
    })
    expect(screen.getByRole('status')).toHaveTextContent('이미지 업로드가 시작되었습니다.')
  })
})
