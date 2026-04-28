import { QueryClient } from '@tanstack/react-query'

const NON_RETRYABLE_STATUS = new Set([400, 401, 403, 404, 422])

function shouldRetry(failureCount, error) {
  if (error?.name === 'AbortError') return false
  if (error?.status && NON_RETRYABLE_STATUS.has(error.status)) return false
  return failureCount < 1
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: true,
      retry: shouldRetry,
    },
    mutations: {
      retry: false,
    },
  },
})
