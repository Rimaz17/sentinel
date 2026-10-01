import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { inspectorSession } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import { DashboardHeader } from './DashboardHeader'

function renderHeader(props: Partial<Parameters<typeof DashboardHeader>[0]> = {}) {
  const onRefresh = vi.fn()
  render(
    <MemoryRouter>
      <QueryWrapper>
        <DashboardHeader
          account={inspectorSession().account}
          updatedAt={Date.parse('2026-09-28T08:30:05Z')}
          live="live"
          refreshing={false}
          onRefresh={onRefresh}
          {...props}
        />
      </QueryWrapper>
    </MemoryRouter>,
  )
  return onRefresh
}

describe('DashboardHeader', () => {
  it('says when the figures were last updated, in Sri Lanka time, and how often', () => {
    renderHeader()
    expect(screen.getByText(/updated/i)).toHaveTextContent(
      'Updated 14:00:05 Sri Lanka time · refreshes every 30 s · alerts arrive live',
    )
  })

  it('says when live alerts are still connecting or have dropped', () => {
    renderHeader({ live: 'connecting' })
    expect(screen.getByText(/updated/i)).toHaveTextContent(/· connecting for live alerts$/)
    cleanup()

    renderHeader({ live: 'reconnecting' })
    expect(screen.getByText(/updated/i)).toHaveTextContent(/· live alerts reconnecting$/)
  })

  it('says it is loading before any figures arrive', () => {
    renderHeader({ updatedAt: null })
    expect(
      screen.getByText('Loading · refreshes every 30 s · alerts arrive live'),
    ).toBeInTheDocument()
  })

  it('refreshes on request', async () => {
    const onRefresh = renderHeader()
    await userEvent.click(screen.getByRole('button', { name: 'Refresh now' }))
    expect(onRefresh).toHaveBeenCalledOnce()
  })

  it('disables the refresh while one is running', () => {
    renderHeader({ refreshing: true })
    expect(screen.getByRole('button', { name: 'Refreshing' })).toBeDisabled()
  })

  it('states that all case data is simulated', () => {
    renderHeader()
    expect(screen.getByText('All case data simulated · demonstration system')).toBeInTheDocument()
  })

  it('names who is signed in and offers a way out', () => {
    renderHeader()
    expect(screen.getByText(/signed in as/i)).toHaveTextContent('Signed in as Nimal Silva')
    expect(screen.getByRole('button', { name: 'Sign out' })).toBeInTheDocument()
  })

  it('leads home from the wordmark', () => {
    renderHeader()
    expect(screen.getByRole('link', { name: 'Sentinel, home' })).toHaveAttribute('href', '/')
  })
})
