import { useQuery } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { QueryWrapper } from '@/test/queryWrapper'
import { createTestQueryClient } from '@/test/testQueryClient'
import { LoadingRows, QueryView } from './QueryView'

function Items({ queryFn }: { queryFn: () => Promise<string[]> }) {
  const query = useQuery({ queryKey: ['items'], queryFn })
  return (
    <QueryView
      query={query}
      what="items"
      loading={<LoadingRows label="Loading items" />}
      isEmpty={(items) => items.length === 0}
      empty={<p>Nothing yet.</p>}
    >
      {(items) => (
        <ul>
          {items.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </QueryView>
  )
}

describe('QueryView', () => {
  it('shows a labelled skeleton while the first response is on its way', () => {
    render(
      <QueryWrapper>
        <Items queryFn={() => new Promise(() => {})} />
      </QueryWrapper>,
    )
    expect(screen.getByRole('status')).toHaveTextContent('Loading items')
  })

  it('shows the data once it arrives', async () => {
    render(
      <QueryWrapper>
        <Items queryFn={() => Promise.resolve(['KDY', 'CMB'])} />
      </QueryWrapper>,
    )
    expect(await screen.findByText('KDY')).toBeInTheDocument()
  })

  it('shows the empty state for a response with nothing in it', async () => {
    render(
      <QueryWrapper>
        <Items queryFn={() => Promise.resolve([])} />
      </QueryWrapper>,
    )
    expect(await screen.findByText('Nothing yet.')).toBeInTheDocument()
  })

  it('names the failure and retries on request', async () => {
    const queryFn = vi
      .fn<() => Promise<string[]>>()
      .mockRejectedValueOnce(new Error('The API could not be reached.'))
      .mockResolvedValueOnce(['KDY'])
    render(
      <QueryWrapper>
        <Items queryFn={queryFn} />
      </QueryWrapper>,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent('Could not load items.')
    expect(alert).toHaveTextContent('The API could not be reached.')

    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(await screen.findByText('KDY')).toBeInTheDocument()
  })

  it('keeps the last good figures when a later refresh fails, and says so', async () => {
    const client = createTestQueryClient()
    const queryFn = vi
      .fn<() => Promise<string[]>>()
      .mockResolvedValueOnce(['KDY'])
      .mockRejectedValueOnce(new Error('down'))
    render(
      <QueryWrapper client={client}>
        <Items queryFn={queryFn} />
      </QueryWrapper>,
    )
    await screen.findByText('KDY')

    await client.refetchQueries({ queryKey: ['items'] })

    expect(await screen.findByText(/could not refresh items/i)).toBeInTheDocument()
    expect(screen.getByText('KDY')).toBeInTheDocument()
  })
})
