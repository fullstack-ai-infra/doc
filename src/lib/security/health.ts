/**
 * Health and readiness check utilities.
 *
 * - /health (liveness): process is running and can accept connections.
 * - /ready (readiness): process AND dependencies (database, storage) are operational.
 */

export interface HealthCheck {
  name: string
  check: () => Promise<'ok' | 'degraded' | 'unavailable'>
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unavailable'
  checks: Record<string, 'ok' | 'degraded' | 'unavailable'>
  uptime: number
}

const startTime = Date.now()

/**
 * Perform a liveness check. Always returns healthy if the process is running.
 */
export function livenessCheck(): { status: 'healthy'; uptime: number } {
  return {
    status: 'healthy',
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }
}

/**
 * Perform a readiness check against registered dependency checks.
 */
export async function readinessCheck(checks: HealthCheck[]): Promise<HealthStatus> {
  const results: Record<string, 'ok' | 'degraded' | 'unavailable'> = {}

  await Promise.all(
    checks.map(async (check) => {
      try {
        results[check.name] = await check.check()
      } catch {
        results[check.name] = 'unavailable'
      }
    })
  )

  const statuses = Object.values(results)
  const status: HealthStatus['status'] = statuses.includes('unavailable')
    ? 'unavailable'
    : statuses.includes('degraded')
      ? 'degraded'
      : 'healthy'

  return {
    status,
    checks: results,
    uptime: Math.floor((Date.now() - startTime) / 1000),
  }
}

/**
 * Create a database health check.
 */
export function createDatabaseCheck(queryFn: () => Promise<unknown>): HealthCheck {
  return {
    name: 'database',
    check: async () => {
      try {
        await queryFn()
        return 'ok'
      } catch {
        return 'unavailable'
      }
    },
  }
}

/**
 * Create a storage health check.
 */
export function createStorageCheck(existsFn: () => Promise<boolean>): HealthCheck {
  return {
    name: 'storage',
    check: async () => {
      try {
        await existsFn()
        return 'ok'
      } catch {
        return 'unavailable'
      }
    },
  }
}
