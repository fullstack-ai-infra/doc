import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { join } from 'node:path'

const CONTROL_ENV_FILE = fileURLToPath(new URL('../assets/control.env', import.meta.url))

export function composeProjectName(root) {
  try {
    const instanceId = readFileSync(join(root, '.doc', 'instance-id'), 'utf8').trim()
    if (/^[a-f0-9]{20}$/.test(instanceId)) return `doc-${instanceId}`
  } catch {}

  const suffix = createHash('sha256').update(root).digest('hex').slice(0, 10)
  return `doc-${suffix}`
}

export function composeArgs(root, envFile) {
  const args = ['compose', '--project-name', composeProjectName(root), '--project-directory', root]
  if (envFile) args.push('--env-file', envFile)
  args.push('-f', join(root, 'docker-compose.yml'))
  return args
}

export function controlComposeArgs(root) {
  return composeArgs(root, CONTROL_ENV_FILE)
}

export function parseComposePs(output) {
  const trimmed = output.trim()
  if (!trimmed) return []

  try {
    const parsed = JSON.parse(trimmed)
    return Array.isArray(parsed) ? parsed : [parsed]
  } catch {
    return trimmed
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => JSON.parse(line))
  }
}

export function normalizeComposeServices(services) {
  return services.map((service) => ({
    name: service.Name || service.name || null,
    service: service.Service || service.service || null,
    state: (service.State || service.state || 'unknown').toLowerCase(),
    health: service.Health || service.health || null,
    status: service.Status || service.status || null,
  }))
}
