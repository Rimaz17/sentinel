import { useQuery } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { district, DISTRICTS } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import type { DistrictSummary } from './api/types'
import { DistrictList, DistrictPicker } from './DistrictList'

function Harness({
  districts,
  selected,
  showTotal,
}: {
  districts: Promise<DistrictSummary[]>
  selected: string | null
  showTotal: boolean
}) {
  const query = useQuery({ queryKey: ['districts'], queryFn: () => districts })
  return (
    <nav aria-label="Districts">
      <DistrictList query={query} selected={selected} showTotal={showTotal} />
    </nav>
  )
}

function renderList(
  selected: string | null,
  districts = Promise.resolve(DISTRICTS),
  showTotal = true,
) {
  return render(
    <MemoryRouter>
      <QueryWrapper>
        <Harness districts={districts} selected={selected} showTotal={showTotal} />
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

  it('leaves out the total row for an inspector who covers one district', async () => {
    renderList('KDY', Promise.resolve([district()]), false)

    const links = await screen.findAllByRole('link')
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/app/districts/KDY'])
  })

  it('offers no search for a short list', async () => {
    renderList(null)
    await screen.findAllByRole('link')
    expect(screen.queryByRole('searchbox')).not.toBeInTheDocument()
  })

  it('narrows a national list by name, keeping the whole-country row', async () => {
    const many = [
      ...DISTRICTS,
      district({ code: 'GAL', name: 'Galle', openAlerts: 0 }),
      district({ code: 'GMP', name: 'Gampaha', openAlerts: 0 }),
      district({ code: 'JAF', name: 'Jaffna', openAlerts: 0 }),
    ]
    renderList(null, Promise.resolve(many))

    await userEvent.type(await screen.findByRole('searchbox', { name: 'Find a district' }), 'ga')

    expect(screen.getAllByRole('link').map((link) => link.getAttribute('href'))).toEqual([
      '/app',
      '/app/districts/GAL',
      '/app/districts/GMP',
    ])

    await userEvent.clear(screen.getByRole('searchbox'))
    await userEvent.type(screen.getByRole('searchbox'), 'zzz')
    expect(screen.getByText('No district matches “zzz”.')).toBeInTheDocument()
  })

  it("draws each district's week against the busiest district's", async () => {
    renderList(null)
    const colombo = await screen.findByRole('link', { name: /colombo/i })
    const kandy = screen.getByRole('link', { name: /kandy/i })

    const bar = (link: HTMLElement) =>
      link.querySelector<HTMLElement>('[aria-hidden="true"] > span')?.style.width
    expect(bar(colombo)).toBe('100%')
    expect(bar(kandy)).toBe('19%')
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
