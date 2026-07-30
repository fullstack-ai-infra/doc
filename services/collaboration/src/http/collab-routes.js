const Router = require('@koa/router')
const { createHash, timingSafeEqual } = require('node:crypto')
const { hasActiveDocument } = require('../hocuspocus/active-docs')
const { restoreActiveDocument } = require('../hocuspocus/restore')

function hasValidInternalKey(ctx) {
  const internalKey = process.env.INTERNAL_API_KEY || ''
  const providedKey = ctx.get('x-doc-internal-key')
  if (!internalKey || !providedKey) return false
  const expectedDigest = createHash('sha256').update(internalKey, 'utf8').digest()
  const providedDigest = createHash('sha256').update(providedKey, 'utf8').digest()
  return timingSafeEqual(expectedDigest, providedDigest)
}

// 创建协同文档恢复路由。
function createCollabRouter() {
  const router = new Router()

  router.post('/collab/documents/:docId/restore', async (ctx) => {
    const { docId } = ctx.params

    try {
      if (!hasValidInternalKey(ctx)) {
        ctx.status = 401
        ctx.body = {
          success: false,
          msg: 'unauthorized',
        }
        return
      }

      const body = ctx.request.body || {}
      const { contentBinaryBase64 } = body

      if (!docId) {
        throw new Error('docId is required')
      }

      if (!contentBinaryBase64) {
        throw new Error('contentBinaryBase64 is required')
      }

      if (!hasActiveDocument(docId)) {
        throw new Error('Active document not found')
      }

      await restoreActiveDocument(docId, contentBinaryBase64)

      ctx.body = {
        success: true,
        data: {
          docId,
        },
      }
    } catch (err) {
      ctx.status = 400
      ctx.body = {
        success: false,
        msg: err.message || 'restore failed',
      }
    }
  })

  return router
}

module.exports = {
  createCollabRouter,
  hasValidInternalKey,
}
