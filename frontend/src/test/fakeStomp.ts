import type { IMessage, StompConfig } from '@stomp/stompjs'
import { vi } from 'vitest'

/*
 * A stand-in for @stomp/stompjs's Client, which every test gets in its place
 * (see setup.ts), so no test ever opens a real socket. A test drives it as the
 * API would: opening the connection, pushing a message, dropping it.
 */
export class FakeStompClient {
  static instances: FakeStompClient[] = []

  /** The newest client made. */
  static latest(): FakeStompClient {
    const client = FakeStompClient.instances.at(-1)
    if (!client) {
      throw new Error('No STOMP client has been made')
    }
    return client
  }

  readonly config: StompConfig
  connectHeaders: Record<string, string> = {}
  active = false
  readonly subscriptions = new Map<string, (message: IMessage) => void>()

  readonly activate = vi.fn(() => {
    this.active = true
  })

  readonly deactivate = vi.fn(() => {
    const wasActive = this.active
    this.active = false
    if (wasActive) {
      this.config.onWebSocketClose?.(new CloseEvent('close'))
    }
    return Promise.resolve()
  })

  constructor(config: StompConfig) {
    this.config = config
    FakeStompClient.instances.push(this)
  }

  subscribe(destination: string, callback: (message: IMessage) => void) {
    this.subscriptions.set(destination, callback)
    return { id: destination, unsubscribe: () => this.subscriptions.delete(destination) }
  }

  /** Connects as the client would: its beforeConnect, then, if still active, the broker's reply. */
  async open() {
    await this.config.beforeConnect?.(this as never)
    if (this.active) {
      this.config.onConnect?.({} as never)
    }
  }

  /** The API pushing a message to a destination the client subscribed to. */
  push(destination: string, body: string) {
    this.subscriptions.get(destination)?.({ body } as IMessage)
  }

  /** The socket dropping, as a network or the API would drop it. */
  drop() {
    this.config.onWebSocketClose?.(new CloseEvent('close'))
  }
}
