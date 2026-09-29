import { describe, expect, it } from 'vitest'
import { alert } from '@/test/fixtures'
import { announce, parseAlertEvent, socketUrl } from './alertStream'

describe('socketUrl', () => {
  it('opens a plain socket from a plain page', () => {
    expect(socketUrl({ protocol: 'http:', host: 'localhost:5173' })).toBe(
      'ws://localhost:5173/api/ws',
    )
  })

  it('opens a secure socket from a secure page', () => {
    expect(socketUrl({ protocol: 'https:', host: 'sentinel.example.org' })).toBe(
      'wss://sentinel.example.org/api/ws',
    )
  })
})

describe('parseAlertEvent', () => {
  it('reads a raised alert', () => {
    expect(parseAlertEvent(JSON.stringify({ change: 'RAISED', alert: alert() }))).toEqual({
      change: 'RAISED',
      alert: alert(),
    })
  })

  it('reads a changed alert', () => {
    const acknowledged = alert({ status: 'ACKNOWLEDGED' })
    expect(parseAlertEvent(JSON.stringify({ change: 'UPDATED', alert: acknowledged }))).toEqual({
      change: 'UPDATED',
      alert: acknowledged,
    })
  })

  it('reads a request to read every alert again', () => {
    expect(parseAlertEvent('{"change":"RESYNC","alert":null}')).toEqual({
      change: 'RESYNC',
      alert: null,
    })
  })

  it('passes over anything else', () => {
    for (const body of [
      'not json',
      'null',
      '[]',
      '{}',
      '{"change":"DELETED","alert":null}',
      '{"change":"RAISED","alert":null}',
      '{"change":"UPDATED"}',
    ]) {
      expect(parseAlertEvent(body), body).toBeNull()
    }
  })
})

describe('announce', () => {
  it('names the alert, its district and its symptom group', () => {
    expect(announce(alert({ code: 'A-1003', districtName: 'Matale' }))).toBe(
      'New alert A-1003: Matale, dengue-like.',
    )
  })
})
