import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { FakeStompClient } from './fakeStomp'

// No test opens a real socket: the alert stream talks to a fake the test can drive.
vi.mock('@stomp/stompjs', async () => ({ Client: (await import('./fakeStomp')).FakeStompClient }))

afterEach(() => {
  cleanup()
  FakeStompClient.instances = []
})
