import { useQuery } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { alert, NOW } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { AlertList } from './AlertList'
import type { Alert } from './api/types'

function Harness({
  alerts,
  districtName = null,
}: {
  alerts: Promise<Alert[]>
  districtName?: string | null
}) {
  const query = useQuery({ queryKey: ['alerts'], queryFn: () => alerts })
  return <AlertList query={query} districtName={districtName} now={NOW} />
}

function renderList(alerts: Promise<Alert[]>, districtName: string | null = null) {
  return render(
    <MemoryRouter>
      <QueryWrapper>
        <Harness alerts={alerts} districtName={districtName} />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('AlertList', () => {
  it('shows an alert in the internal wording', async () => {
    renderList(Promise.resolve([alert()]))

    const item = await screen.findByRole('article', { name: 'A-1001' })
    expect(item).toHaveTextContent('41 reports, 3.2σ above baseline')
    expect(item).toHaveTextContent('Dengue-like')
    expect(item).toHaveTextContent('25.0 a week, sd 5.0')
    expect(item).toHaveTextContent('3.4σ, threshold 3.0σ')
    expect(item).toHaveTextContent('28 Sep, 09:30 to 28 Sep, 11:30')
    expect(within(item).getByText('2 h ago')).toBeInTheDocument()
  })

  it('states whether an alert is open in words, not by colour alone', async () => {
    renderList(
      Promise.resolve([
        alert({ code: 'A-1003' }),
        alert({ code: 'A-1002', open: false }),
        alert({ code: 'A-1001', open: false, status: 'CLOSED' }),
      ]),
    )

    expect(await screen.findByRole('article', { name: 'A-1003' })).toHaveTextContent(/open · new/i)
    expect(screen.getByRole('article', { name: 'A-1002' })).toHaveTextContent(/ended · new/i)
    expect(screen.getByRole('article', { name: 'A-1001' })).toHaveTextContent(/closed/i)
  })

  it('links each alert to its district on the national view', async () => {
    renderList(Promise.resolve([alert()]))

    expect(await screen.findByRole('link', { name: 'Kandy' })).toHaveAttribute(
      'href',
      '/app/districts/KDY',
    )
  })

  it('does not link to the district already in view', async () => {
    renderList(Promise.resolve([alert()]), 'Kandy')

    await screen.findByRole('article', { name: 'A-1001' })
    expect(screen.queryByRole('link', { name: 'Kandy' })).not.toBeInTheDocument()
  })

  it('explains the detector when there are no alerts', async () => {
    renderList(Promise.resolve([]), 'Kandy')

    expect(await screen.findByText('No alerts for Kandy.')).toBeInTheDocument()
    expect(screen.getByText(/checks every hour/i)).toBeInTheDocument()
  })

  it('shows a loading state before the first response', () => {
    renderList(new Promise(() => {}))
    expect(screen.getByRole('status')).toHaveTextContent('Loading alerts')
  })

  it('shows why the alerts could not be loaded', async () => {
    renderList(Promise.reject(new Error('The API could not be reached. Check that it is running.')))

    expect(await screen.findByRole('alert')).toHaveTextContent('Could not load alerts.')
  })
})
