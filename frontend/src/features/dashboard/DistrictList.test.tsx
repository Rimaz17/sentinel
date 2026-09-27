import { useQuery } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { DISTRICTS } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import type { DistrictSummary } from './api/types'
import { DistrictList, DistrictPicker } from './DistrictList'

function Harness({
  districts,
  selected,
}: {
  districts: Promise<DistrictSummary[]>
  selected: string | null
}) {
  const query = useQuery({ queryKey: ['districts'], queryFn: () => districts })
  return (
    <nav aria-label="Districts">
      <DistrictList query={query} selected={selected} />
    </nav>
  )
}

function renderList(selected: string | null, districts = Promise.resolve(DISTRICTS)) {
  return render(
    <MemoryRouter>
      <QueryWrapper>
        <Harness districts={districts} selected={selected} />
      </QueryWrapper>
    </MemoryRouter>,
  )
}

describe('DistrictList', () => {
  it('lists the whole country first, then every district', async () => {
    renderList(null)

    const links = await screen.findAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/app',
      '/app/districts/AMP',
      '/app/districts/CMB',
      '/app/districts/KDY',
      '/app/districts/NEL',
    ])
  })

  it("reads each district's week of reports aloud with its unit", async () => {
    renderList(null)

    expect(await screen.findByRole('link', { name: /colombo/i })).toHaveAccessibleName(
      'Colombo, 212 reports in the last 7 days',
    )
  })

  it('totals the whole country', async () => {
    renderList(null)

    expect(await screen.findByRole('link', { name: /all of sri lanka/i })).toHaveTextContent('292')
  })

  it('names open alerts in words', async () => {
    renderList(null)

    expect(await screen.findByRole('link', { name: /kandy/i })).toHaveAccessibleName(
      'Kandy, 41 reports in the last 7 days, 1 open alert',
    )
    expect(screen.getByRole('link', { name: /kandy/i })).toHaveTextContent('1 open alert')
    expect(screen.getByRole('link', { name: /colombo/i })).not.toHaveTextContent(/alert/)
  })

  it('marks the district in view as the current page', async () => {
    renderList('KDY')

    expect(await screen.findByRole('link', { name: /kandy/i })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('link', { name: /all of sri lanka/i })).not.toHaveAttribute(
      'aria-current',
    )
  })

  it('shows a loading state before the first response', () => {
    renderList(null, new Promise(() => {}))
    expect(screen.getByRole('status')).toHaveTextContent('Loading districts')
  })
})

function ShowPath() {
  return <p data-testid="path">{useLocation().pathname}</p>
}

describe('DistrictPicker', () => {
  it('goes to the district chosen, and back to the whole country', async () => {
    render(
      <MemoryRouter initialEntries={['/app']}>
        <Routes>
          <Route
            path="*"
            element={
              <>
                <DistrictPicker districts={DISTRICTS} selected={null} />
                <ShowPath />
              </>
            }
          />
        </Routes>
      </MemoryRouter>,
    )

    await userEvent.selectOptions(screen.getByLabelText('District'), 'Kandy (1 open)')
    expect(screen.getByTestId('path')).toHaveTextContent('/app/districts/KDY')

    await userEvent.selectOptions(screen.getByLabelText('District'), 'All of Sri Lanka')
    expect(screen.getByTestId('path')).toHaveTextContent('/app')
  })
})
