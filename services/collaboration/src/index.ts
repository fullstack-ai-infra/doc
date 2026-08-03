import 'dotenv/config'

import Router from '@koa/router'
import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import { createRequire } from 'node:module'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Server as HttpServer } from 'node:http'
import type WebSocket from 'ws'

import { connect, pgClient } from './db/client.js'
import { selectOneDocForMonitor } from './db/doc.js'
import { hocuspocusServer, revokeActiveAccess } from './hocuspocus/index.js'
import { createCollabRouter, hasValidInternalKey } from './http/collab-routes.js'

type WebsocketFactory = (typeof import('koa-easy-ws'))['default']
const require = createRequire(import.meta.url)
const websocket = require('koa-easy-ws') as WebsocketFactory

export interface CollaborationRuntimeDeps {
  connectDatabase: () => Promise<void>
  checkDatabase: () => Promise<void>
  selectMonitorDocument: typeof selectOneDocForMonitor
  handleConnection: (socket: WebSocket, request: Koa.Request['req']) => void
  revokeActiveAccess: (docId: string, userId: string) => number | Promise<number>
}

const defaultRuntimeDeps: CollaborationRuntimeDeps = {
  connectDatabase: connect,
  checkDatabase: async () => {
    await pgClient.query('select 1')
  },
  selectMonitorDocument: selectOneDocForMonitor,
  handleConnection: (socket, request) => hocuspocusServer.handleConnection(socket, request),
  revokeActiveAccess,
}

export function createCollaborationApp(deps: CollaborationRuntimeDeps = defaultRuntimeDeps): Koa {
  const app = new Koa()
  const defaultBodyParser = bodyParser()
  const accessRevocationBodyParser = bodyParser({
    jsonLimit: '4kb',
    formLimit: '4kb',
    textLimit: '4kb',
  })

  // Setup your koa instance using the koa-easy-ws extension
  app.use(websocket())
  app.use(async (ctx, next) => {
    if (/^\/collab\/documents\/[^/]+\/access\/revoke$/.test(ctx.path)) {
      await accessRevocationBodyParser(ctx, next)
      return
    }
    await defaultBodyParser(ctx, next)
  })

  const router = new Router()
  const collabRouter = createCollabRouter({ revokeActiveAccess: deps.revokeActiveAccess })
  router.get('/', async (ctx) => {
    ctx.body = {
      service: 'doc-collaboration',
      status: 'ok',
    }
  })

  router.get('/ready', async (ctx) => {
    try {
      await deps.checkDatabase()
      ctx.body = {
        service: 'doc-collaboration',
        status: 'ok',
        checks: {
          database: 'ok',
        },
      }
    } catch {
      ctx.status = 503
      ctx.body = {
        service: 'doc-collaboration',
        status: 'degraded',
        checks: {
          database: 'unavailable',
        },
      }
    }
  })

  //【注意】心跳检测 monitor 会检测，不要随意修改！
  router.get('/selectOneDoc', async (ctx) => {
    if (!hasValidInternalKey(ctx)) {
      ctx.status = 401
      ctx.body = {
        success: false,
        msg: 'unauthorized',
      }
      return
    }

    const doc = await deps.selectMonitorDocument()
    ctx.body = doc // 格式如 {"id":"xxxx"}
  })

  router.get('/collaborate', async (ctx) => {
    if (ctx.ws) {
      const ws = await ctx.ws()

      deps.handleConnection(
        ws,
        ctx.req

        // // additional data (optional)
        // { user_id: 1234 }
      )
    } else {
      ctx.body = 'collaborate route'
    }
  })
  app.use(router.routes()).use(router.allowedMethods())
  app.use(collabRouter.routes()).use(collabRouter.allowedMethods())

  return app
}

export async function startCollaborationService(
  port: number,
  deps: CollaborationRuntimeDeps = defaultRuntimeDeps
): Promise<HttpServer> {
  await deps.connectDatabase()
  const app = createCollaborationApp(deps)
  return app.listen(port)
}

const entryPath = process.argv[1]
const isMainModule = entryPath != null && import.meta.url === pathToFileURL(resolve(entryPath)).href

if (isMainModule) {
  const port = Number.parseInt(process.env.PORT || '', 10) || 1234
  void startCollaborationService(port).catch(() => {
    console.error('doc collaboration service failed to start')
    process.exitCode = 1
  })
}
