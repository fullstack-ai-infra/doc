import { startCollaborationService } from '../dist/index.js'

const server = await startCollaborationService(0, {
  connectDatabase: async () => {},
  checkDatabase: async () => {},
  selectMonitorDocument: async () => null,
  handleConnection: () => {},
  revokeActiveAccess: () => 0,
})

try {
  const address = server.address()
  if (address == null || typeof address === 'string') throw new Error('compiled service address unavailable')
  const response = await fetch(`http://127.0.0.1:${address.port}/ready`)
  const payload = await response.json()
  if (!response.ok || payload?.service !== 'doc-collaboration' || payload?.checks?.database !== 'ok') {
    throw new Error('compiled service readiness probe failed')
  }
} finally {
  await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())))
}
