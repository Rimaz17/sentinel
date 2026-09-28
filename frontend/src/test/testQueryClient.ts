import { QueryClient } from '@tanstack/react-query'

/**
 * A fresh query client per test, with retries off so an error state shows at
 * once instead of after the production retry.
 */
export function createTestQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}
