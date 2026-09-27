import { QueryClient } from '@tanstack/react-query'

/**
 * The one client for server state. A failed request is retried once before its
 * error is shown: enough to ride out a restart of the API, not so many that a
 * real outage hides behind a spinner.
 */
export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: 1,
      },
    },
  })
}
