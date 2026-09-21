import { describe, expect, it } from 'vitest'

describe('test harness', () => {
  it('runs with jsdom available', () => {
    expect(typeof document).toBe('object')
  })
})
