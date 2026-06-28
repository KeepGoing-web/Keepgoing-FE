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
      const image = document.querySelector('img[alt="image.png"]')
      expect(image).toHaveAttribute('title', 'publicId:image-public-id;status:PENDING')
      // src는 서버 404를 피하기 위해 blob URL을 그대로 유지
      expect(image).toHaveAttribute('src', 'blob:preview-image')
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
      const image = document.querySelector('img[alt="pasted.png"]')
      expect(image).toHaveAttribute('title', 'publicId:pasted-image-public-id;status:PENDING')
      // src는 서버 404를 피하기 위해 blob URL을 그대로 유지
      expect(image).toHaveAttribute('src', 'blob:preview-image')
    })
    expect(screen.getByRole('status')).toHaveTextContent('이미지 업로드가 시작되었습니다.')
  })

  it('detects macOS screenshot by extension and uploads with corrected MIME type', async () => {
    const onUploadImage = vi.fn().mockResolvedValue({
      publicId: 'macos-public-id',
      status: 'PENDING',
    })

    render(<TiptapEditor value="테스트" onChange={() => {}} noteId="10" onUploadImage={onUploadImage} />)

    const file = new File(
      ['screenshot-content'],
      'Screenshot 2024-06-28 at 10.00.00.png',
      { type: '' },
    )
    const editor = document.querySelector('.tiptap-prosemirror')

    fireEvent.paste(editor, {
      clipboardData: {
        files: [],
        items: [{ kind: 'file', type: '', getAsFile: () => file }],
        getData: vi.fn(() => 'Screenshot 2024-06-28 at 10.00.00.png'),
        types: ['text/plain', 'Files'],
      },
    })

    // 확장자 기반으로 MIME type이 보정되어 업로드되어야 함
    await waitFor(() => {
      const image = document.querySelector('img[alt="Screenshot 2024-06-28 at 10.00.00.png"]')
      expect(image).toHaveAttribute('title', 'publicId:macos-public-id;status:PENDING')
    })
  })
})
