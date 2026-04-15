import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import TiptapEditor from './TiptapEditor'

describe('TiptapEditor', () => {
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
})
