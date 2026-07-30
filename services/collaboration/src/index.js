const Koa = require('koa')
const websocket = require('koa-easy-ws')
const bodyParser = require('koa-bodyparser')
const Router = require('@koa/router')
const { hocuspocusServer } = require('./hocuspocus')
const { connect } = require('./db/client')
const { selectOneDocForMonitor } = require('./db/doc')
const { createCollabRouter } = require('./http/collab-routes')
require('dotenv').config()

const app = new Koa()

// Setup your koa instance using the koa-easy-ws extension
app.use(websocket())
app.use(bodyParser())

const router = new Router()
const collabRouter = createCollabRouter()
router.get('/', async (ctx) => {
  ctx.body = {
    service: 'doc-collaboration',
    status: 'ok',
  }
})

//【注意】心跳检测 monitor 会检测，不要随意修改！
router.get('/selectOneDoc', async (ctx) => {
  const doc = await selectOneDocForMonitor()
  ctx.body = doc // 格式如 {"id":"xxxx"}
})

router.get('/collaborate', async (ctx) => {
  if (ctx.ws) {
    const ws = await ctx.ws()

    hocuspocusServer.handleConnection(
      ws,
      ctx.request

      // // additional data (optional)
      // { user_id: 1234 }
    )
  } else {
    ctx.body = 'collaborate route'
  }
})
app.use(router.routes()).use(router.allowedMethods())
app.use(collabRouter.routes()).use(collabRouter.allowedMethods())

// Start the server
const port = parseInt(process.env.PORT, 10) || 1234
app.listen(port)

// Connect to the database
connect()
