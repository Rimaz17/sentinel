import { type QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { type ReactNode } from 'react'
import { createTestQueryClient } from './testQueryClient'

export function QueryWrapper({
  client = createTestQueryClient(),
  children,
}: {
  client?: QueryClient
  children: ReactNode
}) {
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
