import { useQuery } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { weeklyCounts } from '@/test/fixtures'
import { QueryWrapper } from '@/test/queryWrapper'
import type { WeeklyCounts } from '../api/types'
import { WeeklyChart } from './WeeklyChart'

function Harness({ weekly }: { weekly: Promise<WeeklyCounts> }) {
  const query = useQuery({ queryKey: ['weekly'], queryFn: () => weekly })
  return <WeeklyChart query={query} areaName="Kandy" />
}

function renderChart(weekly: Promise<WeeklyCounts> = Promise.resolve(weeklyCounts())) {
  return render(
    <QueryWrapper>
      <Harness weekly={weekly} />
    </QueryWrapper>,
  )
}

describe('WeeklyChart', () => {
  it('draws one named panel per symptom group', async () => {
    renderChart()

    const charts = await screen.findAllByRole('img')
    expect(charts).toHaveLength(4)
    expect(screen.getByRole('figure', { name: /dengue-like/i })).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: /leptospirosis-like/i })).toBeInTheDocument()
  })

  it('describes each panel in words: the last 7 days against the average before', async () => {
    renderChart()

    expect(
      await screen.findByRole('img', {
        name: 'Dengue-like reports per week, Kandy: 41 in the last 7 days, against an average of 25.0 over the 8 weeks before.',
      }),
    ).toBeInTheDocument()
    expect(screen.getByRole('figure', { name: /dengue-like/i })).toHaveTextContent(
      '41 in the last 7 days · average 25.0',
    )
  })

  it('offers every number as a table', async () => {
    renderChart()

    await userEvent.click(await screen.findByText('The numbers as a table'))
    const table = screen.getByRole('table', { name: /reports per week by symptom group, kandy/i })
    const rows = within(table).getAllByRole('row')
    // A header row, then nine weeks.
    expect(rows).toHaveLength(10)
    expect(rows[9]).toHaveTextContent('Last 7 days411280')
    expect(rows[1]).toHaveTextContent(/^\d+ \w+ to \d+ \w+221280$/)
  })

  it('shows a loading state before the first response', () => {
    renderChart(new Promise(() => {}))
    expect(screen.getByRole('status')).toHaveTextContent('Loading weekly counts')
  })
})
