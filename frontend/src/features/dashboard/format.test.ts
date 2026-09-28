import { describe, expect, it } from 'vitest'
import {
  formatAgo,
  formatClock,
  formatCount,
  formatDateTime,
  formatDay,
  formatDecimal,
  formatSigma,
} from './format'

const NOW = Date.parse('2026-09-28T08:30:00Z')

describe('format', () => {
  it('groups thousands', () => {
    expect(formatCount(1142)).toBe('1,142')
  })

  it('keeps one decimal place', () => {
    expect(formatDecimal(25)).toBe('25.0')
    expect(formatDecimal(4.96)).toBe('5.0')
  })

  it('writes sigma values with a lower-case sigma', () => {
    expect(formatSigma(3.24)).toBe('3.2σ')
  })

  it('shows times in Sri Lanka time, five and a half hours ahead of UTC', () => {
    expect(formatDateTime('2026-09-28T08:30:00Z')).toBe('28 Sep, 14:00')
    expect(formatClock(Date.parse('2026-09-28T08:30:05Z'))).toBe('14:00:05')
    expect(formatDay('2026-09-27T20:00:00Z')).toBe('28 Sep')
  })

  it('says how long ago something happened', () => {
    expect(formatAgo('2026-09-28T08:29:40Z', NOW)).toBe('just now')
    expect(formatAgo('2026-09-28T08:18:00Z', NOW)).toBe('12 min ago')
    expect(formatAgo('2026-09-28T03:30:00Z', NOW)).toBe('5 h ago')
    expect(formatAgo('2026-09-25T08:30:00Z', NOW)).toBe('3 d ago')
  })
})
