import type WebSocket from 'ws'

declare module 'koa' {
  interface DefaultContext {
    ws?: () => Promise<WebSocket>
  }
}

export {}
