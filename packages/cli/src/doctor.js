import { stat } from 'node:fs/promises'
import { join } from 'node:path'
import { composeArgs } from './compose.js'
import { exists, isConfiguredSecret, readEnv } from './project.js'

const REQUIRED_SECRETS = ['AUTH_SECRET', 'COLLABORATE_API_AUTH_KEY', 'COLLABORATE_INTERNAL_API_KEY']

function check(id, label, status, detail) {
  return { id, label, status, detail }
}

function versionAtLeast(version, minimum) {
  const match = version.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) return false
  const current = match.slice(1).map(Number)
  const required = minimum.split('.').map(Number)
  for (let index = 0; index < required.length; index += 1) {
    if ((current[index] || 0) > required[index]) return true
    if ((current[index] || 0) < required[index]) return false
  }
  return true
}

function redact(value, secrets) {
  let redacted = value
  for (const secret of secrets) {
    if (isConfiguredSecret(secret)) redacted = redacted.split(secret).join('[redacted]')
  }
  return redacted
}

async function liveCheck(fetchImpl, id, label, url, expectedService) {
  try {
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(3000) })
    if (!response.ok) return check(id, label, 'fail', `${response.status} ${url}`)
    const payload = await response.json()
    const healthy =
      payload?.service === expectedService && payload?.status === 'ok' && payload?.checks?.database === 'ok'
    return check(
      id,
      label,
      healthy ? 'pass' : 'fail',
      healthy ? `${response.status} ${url}` : `${url}: unexpected health payload`
    )
  } catch (error) {
    return check(id, label, 'fail', `${url}: ${error.message}`)
  }
}

async function privateFileCheck(path, id, label, platform) {
  if (platform === 'win32') {
    return check(id, label, 'warn', 'POSIX mode check is unavailable on Windows; verify the file ACL')
  }
  try {
    const mode = (await stat(path)).mode & 0o777
    const privateMode = (mode & 0o177) === 0
    return check(
      id,
      label,
      privateMode ? 'pass' : 'fail',
      privateMode
        ? `private (${mode.toString(8).padStart(3, '0')})`
        : `expected 600 or stricter; found ${mode.toString(8)}`
    )
  } catch (error) {
    return check(id, label, 'fail', error.message)
  }
}

export async function runDoctor({
  root,
  envPath,
  runner,
  live,
  npmExecutable = 'npm',
  fetchImpl = fetch,
  platform = process.platform,
  processEnv = process.env,
}) {
  const checks = []
  checks.push(check('project', 'doc project', 'pass', root))
  checks.push(
    check(
      'node',
      'Node.js',
      versionAtLeast(process.version, '24.0.0') ? 'pass' : 'fail',
      `${process.version}; required >=24.0.0`
    )
  )

  const npm = await runner.capture(npmExecutable, ['--version'], { cwd: root })
  const npmVersion = npm.stdout.trim()
  checks.push(
    check(
      'npm',
      'npm',
      npm.code === 0 && versionAtLeast(npmVersion, '11.0.0') ? 'pass' : 'fail',
      npm.code === 0 ? `${npmVersion}; required >=11.0.0` : 'npm executable not available'
    )
  )

  let fileEnv = {}
  if (await exists(envPath)) {
    fileEnv = await readEnv(envPath)
    checks.push(check('env', 'Environment file', 'pass', envPath))
    checks.push(await privateFileCheck(envPath, 'env:permissions', 'Environment permissions', platform))
  } else {
    checks.push(check('env', 'Environment file', 'fail', `${envPath} is missing; run doc init`))
  }
  const env = { ...fileEnv, ...processEnv }

  for (const key of REQUIRED_SECRETS) {
    const configured = isConfiguredSecret(env[key])
    const source = processEnv[key] !== undefined ? 'shell environment' : 'environment file'
    checks.push(
      check(
        `env:${key}`,
        key,
        configured ? 'pass' : 'fail',
        configured ? `configured (${source})` : `missing or still a placeholder (${source})`
      )
    )
  }

  const secrets = [env.AUTH_SECRET, env.COLLABORATE_API_AUTH_KEY, env.COLLABORATE_INTERNAL_API_KEY]
  const collaborationKeysAreDistinct = secrets.every(isConfiguredSecret) && new Set(secrets).size === secrets.length
  checks.push(
    check(
      'env:collaboration-keys',
      'Secret separation',
      collaborationKeysAreDistinct ? 'pass' : 'fail',
      collaborationKeysAreDistinct
        ? 'all three generated secrets are distinct'
        : 'all secrets must be configured and different'
    )
  )

  const collaborationEnvPath = join(root, 'services', 'collaboration', '.env')
  if (await exists(collaborationEnvPath)) {
    const collaborationEnv = await readEnv(collaborationEnvPath)
    const keysMatch =
      collaborationEnv.API_AUTH_KEY === fileEnv.COLLABORATE_API_AUTH_KEY &&
      collaborationEnv.INTERNAL_API_KEY === fileEnv.COLLABORATE_INTERNAL_API_KEY
    checks.push(
      check(
        'env:collaboration-file',
        'Host collaboration environment',
        keysMatch ? 'pass' : 'fail',
        keysMatch ? 'keys match the root environment' : 'keys differ; rerun doc init --force --yes'
      )
    )
    checks.push(
      await privateFileCheck(
        collaborationEnvPath,
        'env:collaboration-permissions',
        'Collaboration environment permissions',
        platform
      )
    )
  } else {
    checks.push(
      check(
        'env:collaboration-file',
        'Host collaboration environment',
        'fail',
        `${collaborationEnvPath} is missing; run doc init`
      )
    )
  }

  const databaseSource = processEnv.DATABASE_URL !== undefined ? 'shell environment' : 'environment file'
  checks.push(
    check(
      'env:DATABASE_URL',
      'DATABASE_URL',
      env.DATABASE_URL ? 'pass' : 'fail',
      env.DATABASE_URL ? `configured (${databaseSource})` : `missing (${databaseSource})`
    )
  )

  const docker = await runner.capture('docker', ['--version'], { cwd: root })
  checks.push(
    check(
      'docker',
      'Docker',
      docker.code === 0 ? 'pass' : 'fail',
      docker.code === 0 ? docker.stdout.trim() : 'docker executable not available'
    )
  )

  const daemon = await runner.capture('docker', ['info', '--format', '{{.ServerVersion}}'], { cwd: root })
  checks.push(
    check(
      'docker-daemon',
      'Docker daemon',
      daemon.code === 0 ? 'pass' : 'fail',
      daemon.code === 0 ? `reachable (${daemon.stdout.trim()})` : 'daemon is not reachable'
    )
  )

  const compose = await runner.capture('docker', ['compose', 'version'], { cwd: root })
  const composeSupported = compose.code === 0 && versionAtLeast(compose.stdout, '2.20.0')
  checks.push(
    check(
      'compose',
      'Docker Compose',
      composeSupported ? 'pass' : 'fail',
      compose.code === 0 ? `${compose.stdout.trim()}; required >=2.20.0` : 'docker compose is not available'
    )
  )

  if (composeSupported && (await exists(envPath))) {
    const config = await runner.capture('docker', [...composeArgs(root, envPath), 'config', '--quiet'], {
      cwd: root,
      env,
    })
    const safeError = redact(config.stderr.trim(), secrets)
    checks.push(
      check(
        'compose-config',
        'Compose configuration',
        config.code === 0 ? 'pass' : 'fail',
        config.code === 0 ? 'valid' : safeError || 'invalid'
      )
    )
  }

  if (live) {
    const webBase = (env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '')
    const collaborationBase = (env.COLLABORATE_EDIT_HTTP_URL || 'http://localhost:1234').replace(/\/$/, '')
    checks.push(await liveCheck(fetchImpl, 'live:web', 'Web health', `${webBase}/api/health`, 'doc-web'))
    checks.push(
      await liveCheck(
        fetchImpl,
        'live:collaboration',
        'Collaboration readiness',
        `${collaborationBase}/ready`,
        'doc-collaboration'
      )
    )
  }

  return {
    ok: checks.every((item) => item.status !== 'fail'),
    root,
    checks,
  }
}
