import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { FakeStompClient } from './fakeStomp'

// The first render in a file can take over a second while the whole suite runs in
// parallel on a busy machine; a wait that gives up at Testing Library's default of
// one second failed ActivatePage's first test now and then for no other reason.
configure({ asyncUtilTimeout: 3000 })

// No test opens a real socket: the alert stream talks to a fake the test can drive.
vi.mock('@stomp/stompjs', async () => ({ Client: (await import('./fakeStomp')).FakeStompClient }))

afterEach(() => {
  cleanup()
  FakeStompClient.instances = []
})
