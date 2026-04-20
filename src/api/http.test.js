import { describe, expect, it } from 'vitest'
import { getAuthHeaders } from './http'

describe('getAuthHeaders', () => {
  it('does not read legacy localStorage tokens for cookie-based auth', () => {
    localStorage.setItem('token', 'legacy-token')
    localStorage.setItem('refreshToken', 'legacy-refresh')

    expect(getAuthHeaders()).toEqual({})
  })
})
