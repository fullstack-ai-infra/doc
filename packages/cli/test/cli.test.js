import assert from 'node:assert/strict'
import { chmod, mkdtemp, mkdir, readFile, realpath, stat, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { runCli } from '../src/cli.js'
import { parseEnv } from '../src/project.js'

function outputStream() {
  let content = ''
  return {
    write(chunk) {
      content += chunk
    },
    read() {
      return content
    },
  }
}

function fakeRunner(overrides = {}) {
  const calls = []
  return {
    calls,
    async run(command, args, options) {
      calls.push({ type: 'run', command, args, options })
      return overrides.run?.(command, args, options) || { code: 0 }
    },
    async capture(command, args, options) {
      calls.push({ type: 'capture', command, args, options })
      return (
        overrides.capture?.(command, args, options) || {
          code: 0,
          stdout:
            command === 'docker'
              ? args[0] === '--version'
                ? 'Docker version 28.0.0\n'
                : 'Docker Compose v2.35.0\n'
              : '11.8.0\n',
          stderr: '',
        }
      )
    },
  }
}

async function createProject() {
  const root = await mkdtemp(join(tmpdir(), 'doc-cli-'))
  await mkdir(join(root, 'prisma'), { recursive: true })
  await mkdir(join(root, 'services', 'collaboration'), { recursive: true })
  await writeFile(join(root, 'package.json'), JSON.stringify({ name: '@fullstack-ai-infra/doc', version: '0.1.0' }))
  await writeFile(join(root, 'docker-compose.yml'), 'services: {}\n')
  await writeFile(join(root, 'prisma', 'schema.prisma'), 'generator client { provider = "prisma-client-js" }\n')
  await writeFile(
    join(root, '.env.example'),
    [
      'NEXT_PUBLIC_APP_URL=http://localhost:3000',
      'AUTH_SECRET=replace-with-a-random-secret',
      'DATABASE_URL=postgresql://doc:doc@localhost:5432/doc?schema=public',
      'COLLABORATE_EDIT_HTTP_URL=http://localhost:1234',
      'COLLABORATE_API_AUTH_KEY=replace-with-a-shared-token-key',
      'COLLABORATE_INTERNAL_API_KEY=replace-with-an-internal-service-key',
      '',
    ].join('\n')
  )
  await writeFile(
    join(root, 'services', 'collaboration', '.env.example'),
    [
      'PORT=1234',
      'DATABASE_URL=postgresql://doc:doc@localhost:5432/doc?schema=public',
      'API_AUTH_KEY=replace-with-a-shared-token-key',
      'INTERNAL_API_KEY=replace-with-an-internal-service-key',
      '',
    ].join('\n')
  )
  return realpath(root)
}

async function invoke(args, options = {}) {
  const stdout = outputStream()
  const stderr = outputStream()
  const code = await runCli(args, {
    cwd: options.cwd,
    runner: options.runner,
    fetch: options.fetch,
    env: options.env,
    platform: options.platform,
    stdout,
    stderr,
  })
  return { code, stdout: stdout.read(), stderr: stderr.read() }
}

test('help exposes the operator command surface', async () => {
  const result = await invoke(['--help'])
  assert.equal(result.code, 0)
  assert.match(result.stdout, /\n  init\s/)
  assert.match(result.stdout, /\n  doctor\s/)
  assert.match(result.stdout, /\n  up \[service\.\.\.\]/)
})

test('capabilities emits structured JSON without a project checkout', async () => {
  const result = await invoke(['capabilities', '--json'], { cwd: tmpdir() })
  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.ok(payload.summary.available > 0)
  assert.ok(payload.groups.some((group) => group.id === 'collaboration'))
  assert.ok(payload.groups.some((group) => group.id === 'operations'))
})

test('init creates private files with distinct generated secrets', async () => {
  const root = await createProject()
  const result = await invoke(['init', '--root', root], { cwd: tmpdir() })
  assert.equal(result.code, 0)

  const rootEnv = parseEnv(await readFile(join(root, '.env'), 'utf8'))
  const collaborationEnv = parseEnv(await readFile(join(root, 'services', 'collaboration', '.env'), 'utf8'))
  assert.ok(rootEnv.AUTH_SECRET.length >= 32)
  assert.ok(rootEnv.COLLABORATE_API_AUTH_KEY.length >= 32)
  assert.ok(rootEnv.COLLABORATE_INTERNAL_API_KEY.length >= 32)
  assert.notEqual(rootEnv.AUTH_SECRET, rootEnv.COLLABORATE_API_AUTH_KEY)
  assert.notEqual(rootEnv.COLLABORATE_API_AUTH_KEY, rootEnv.COLLABORATE_INTERNAL_API_KEY)
  assert.equal(collaborationEnv.API_AUTH_KEY, rootEnv.COLLABORATE_API_AUTH_KEY)
  assert.equal(collaborationEnv.INTERNAL_API_KEY, rootEnv.COLLABORATE_INTERNAL_API_KEY)
  assert.equal((await stat(join(root, '.env'))).mode & 0o777, 0o600)
  assert.match(await readFile(join(root, '.doc', 'instance-id'), 'utf8'), /^[a-f0-9]{20}\n$/)
})

test('init is idempotent and does not overwrite by default', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const before = await readFile(join(root, '.env'), 'utf8')
  const result = await invoke(['init', '--root', root], { cwd: tmpdir() })
  const after = await readFile(join(root, '.env'), 'utf8')

  assert.equal(result.code, 0)
  assert.equal(after, before)
  assert.match(result.stdout, /kept \.env/)
})

test('init requires explicit confirmation before overwrite', async () => {
  const root = await createProject()
  const result = await invoke(['init', '--force', '--root', root], { cwd: tmpdir() })
  assert.equal(result.code, 2)
  assert.match(result.stderr, /--force requires --yes/)
})

test('init refuses a placeholder root file without creating a mismatched service file', async () => {
  const root = await createProject()
  await writeFile(join(root, '.env'), await readFile(join(root, '.env.example'), 'utf8'))

  const result = await invoke(['init', '--root', root], { cwd: tmpdir() })

  assert.equal(result.code, 2)
  assert.match(result.stderr, /incomplete or inconsistent/)
  await assert.rejects(readFile(join(root, 'services', 'collaboration', '.env'), 'utf8'), {
    code: 'ENOENT',
  })
})

test('init refuses a placeholder service file without creating a mismatched root file', async () => {
  const root = await createProject()
  await writeFile(
    join(root, 'services', 'collaboration', '.env'),
    await readFile(join(root, 'services', 'collaboration', '.env.example'), 'utf8')
  )

  const result = await invoke(['init', '--root', root], { cwd: tmpdir() })

  assert.equal(result.code, 2)
  assert.match(result.stderr, /incomplete or inconsistent/)
  await assert.rejects(readFile(join(root, '.env'), 'utf8'), { code: 'ENOENT' })
})

test('init refuses paths outside the checkout and symbolic-link targets', async () => {
  const root = await createProject()
  const absoluteResult = await invoke(['init', '--env-file', join(tmpdir(), '.env-doc'), '--root', root], {
    cwd: tmpdir(),
  })
  assert.equal(absoluteResult.code, 2)
  assert.match(absoluteResult.stderr, /relative to the project root/)

  const outside = join(await mkdtemp(join(tmpdir(), 'doc-cli-outside-')), 'target.env')
  await writeFile(outside, 'do-not-overwrite\n')
  await symlink(outside, join(root, '.env'))
  const symlinkResult = await invoke(['init', '--force', '--yes', '--root', root], { cwd: tmpdir() })
  assert.equal(symlinkResult.code, 2)
  assert.match(symlinkResult.stderr, /must not be a symbolic link/)
  assert.equal(await readFile(outside, 'utf8'), 'do-not-overwrite\n')
})

test('forced init rotates secrets without resetting optional configuration', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const envPath = join(root, '.env')
  const original = await readFile(envPath, 'utf8')
  const before = parseEnv(original)
  const customized = original
    .replace('http://localhost:3000', 'https://docs.example.com')
    .replace(`AUTH_SECRET=${before.AUTH_SECRET}`, `export AUTH_SECRET = ${before.AUTH_SECRET}`)
  await writeFile(envPath, customized)

  const result = await invoke(['init', '--force', '--yes', '--root', root], { cwd: tmpdir() })
  const after = parseEnv(await readFile(envPath, 'utf8'))

  assert.equal(result.code, 0)
  assert.equal(after.NEXT_PUBLIC_APP_URL, 'https://docs.example.com')
  assert.notEqual(after.AUTH_SECRET, before.AUTH_SECRET)
  assert.notEqual(after.COLLABORATE_API_AUTH_KEY, before.COLLABORATE_API_AUTH_KEY)
  const rotatedContent = await readFile(envPath, 'utf8')
  assert.equal(rotatedContent.match(/^AUTH_SECRET=/gm)?.length, 1)
  assert.equal(rotatedContent.includes(before.AUTH_SECRET), false)
})

test('doctor validates configuration without exposing secret values', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const runner = fakeRunner()
  const result = await invoke(['doctor', '--json', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.ok, true)
  assert.equal(payload.checks.find((item) => item.id === 'env:collaboration-keys').status, 'pass')
  assert.equal(payload.checks.find((item) => item.id === 'env:permissions').status, 'pass')
  const env = parseEnv(await readFile(join(root, '.env'), 'utf8'))
  assert.equal(result.stdout.includes(env.AUTH_SECRET), false)
  assert.equal(result.stdout.includes(env.COLLABORATE_API_AUTH_KEY), false)
})

test('doctor rejects environment files readable by other users', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  await chmod(join(root, '.env'), 0o644)

  const result = await invoke(['doctor', '--json', '--root', root], {
    cwd: tmpdir(),
    runner: fakeRunner(),
  })
  const payload = JSON.parse(result.stdout)

  assert.equal(result.code, 1)
  assert.equal(payload.checks.find((item) => item.id === 'env:permissions').status, 'fail')
})

test('live doctor checks database-aware readiness endpoints', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const urls = []
  const result = await invoke(['doctor', '--live', '--json', '--root', root], {
    cwd: tmpdir(),
    runner: fakeRunner(),
    fetch: async (url) => {
      urls.push(url)
      return {
        ok: true,
        status: 200,
        async json() {
          return url.endsWith('/ready')
            ? { service: 'doc-collaboration', status: 'ok', checks: { database: 'ok' } }
            : { service: 'doc-web', status: 'ok', checks: { database: 'ok' } }
        },
      }
    },
  })

  assert.equal(result.code, 0)
  assert.deepEqual(urls, ['http://localhost:3000/api/health', 'http://localhost:1234/ready'])
})

test('doctor fails when the environment has not been initialized', async () => {
  const root = await createProject()
  const result = await invoke(['doctor', '--json', '--root', root], {
    cwd: tmpdir(),
    runner: fakeRunner(),
  })

  assert.equal(result.code, 1)
  assert.equal(JSON.parse(result.stdout).ok, false)
})

test('up uses an isolated Compose project and waits for health', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const runner = fakeRunner()
  const result = await invoke(['up', '--build', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 0)
  const call = runner.calls.find((item) => item.type === 'run')
  assert.equal(call.command, 'docker')
  assert.ok(call.args.includes('--project-name'))
  assert.ok(call.args.includes('--project-directory'))
  assert.ok(call.args.includes('--build'))
  assert.ok(call.args.includes('--wait'))
  assert.equal(call.options.cwd, root)
  assert.ok(call.options.env.AUTH_SECRET)
})

test('down never deletes volumes and bypasses missing or malformed project environments', async () => {
  const root = await createProject()
  await writeFile(join(root, '.env'), 'BROKEN=${\n')
  const runner = fakeRunner()
  const result = await invoke(['down', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 0)
  const call = runner.calls.find((item) => item.type === 'run')
  assert.ok(call.args.includes('down'))
  assert.equal(call.args.includes('--volumes'), false)
  assert.equal(call.args.includes('-v'), false)
  const envFileIndex = call.args.indexOf('--env-file')
  assert.notEqual(envFileIndex, -1)
  assert.match(call.args[envFileIndex + 1], /packages[/\\]cli[/\\]assets[/\\]control\.env$/)
  assert.notEqual(call.args[envFileIndex + 1], join(root, '.env'))
  assert.equal(call.options.env.AUTH_SECRET, 'doc-control-command-only')
})

test('status parses newline-delimited Compose JSON', async () => {
  const root = await createProject()
  const runner = fakeRunner({
    capture() {
      return {
        code: 0,
        stdout: '{"Name":"doc-web","State":"running"}\n{"Name":"doc-postgres","State":"running"}\n',
        stderr: '',
      }
    },
  })
  const result = await invoke(['status', '--json', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 0)
  const payload = JSON.parse(result.stdout)
  assert.match(payload.project, /^doc-/)
  assert.equal(payload.services.length, 2)
  assert.deepEqual(payload.services[0], {
    name: 'doc-web',
    service: null,
    state: 'running',
    health: null,
    status: null,
  })
})

test('db push refuses non-local databases before spawning npm', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const envPath = join(root, '.env')
  const content = (await readFile(envPath, 'utf8')).replace(
    'postgresql://doc:doc@localhost:5432/doc?schema=public',
    'postgresql://doc:doc@database.example.com:5432/doc'
  )
  await writeFile(envPath, content)
  const runner = fakeRunner()
  const result = await invoke(['db', 'push', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 2)
  assert.match(result.stderr, /only accept.*localhost/)
  assert.equal(
    runner.calls.some((item) => item.type === 'run'),
    false
  )
})

test('db generate does not require a runtime environment file', async () => {
  const root = await createProject()
  const runner = fakeRunner()
  const result = await invoke(['db', 'generate', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 0)
  const call = runner.calls.find((item) => item.type === 'run')
  assert.equal(call.command, 'npm')
  assert.deepEqual(call.args, ['exec', '--', 'prisma', 'generate'])
})

test('dev passes the selected environment to local processes', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const runner = fakeRunner()
  const result = await invoke(['dev', '--skip-infra', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 0)
  const call = runner.calls.find((item) => item.type === 'run')
  assert.deepEqual(call.args, ['run', 'dev'])
  assert.ok(call.options.env.AUTH_SECRET)
  assert.equal(call.options.env.DATABASE_URL, 'postgresql://doc:doc@localhost:5432/doc?schema=public')
})

test('dev refuses a remote database before starting infrastructure', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const envPath = join(root, '.env')
  await writeFile(
    envPath,
    (await readFile(envPath, 'utf8')).replace(
      'postgresql://doc:doc@localhost:5432/doc?schema=public',
      'postgresql://doc:doc@database.example.com:5432/doc'
    )
  )
  const runner = fakeRunner()
  const result = await invoke(['dev', '--root', root], { cwd: tmpdir(), runner })

  assert.equal(result.code, 2)
  assert.match(result.stderr, /only accept.*localhost/)
  assert.equal(
    runner.calls.some((item) => item.type === 'run'),
    false
  )
})

test('shell configuration overrides the selected file consistently', async () => {
  const root = await createProject()
  await invoke(['init', '--root', root], { cwd: tmpdir() })
  const runner = fakeRunner()
  const shellEnv = {
    AUTH_SECRET: 'a'.repeat(32),
    COLLABORATE_API_AUTH_KEY: 'b'.repeat(32),
    COLLABORATE_INTERNAL_API_KEY: 'c'.repeat(32),
  }
  const result = await invoke(['up', '--root', root], {
    cwd: tmpdir(),
    runner,
    env: shellEnv,
  })

  assert.equal(result.code, 0)
  const call = runner.calls.find((item) => item.type === 'run')
  assert.equal(call.options.env.AUTH_SECRET, shellEnv.AUTH_SECRET)
  assert.equal(call.options.env.COLLABORATE_API_AUTH_KEY, shellEnv.COLLABORATE_API_AUTH_KEY)
})

test('child process failures are normalized to the public exit-code contract', async () => {
  const root = await createProject()
  const failed = await invoke(['check', '--root', root], {
    cwd: tmpdir(),
    runner: fakeRunner({ run: () => ({ code: 42 }) }),
  })
  const missing = await invoke(['check', '--root', root], {
    cwd: tmpdir(),
    runner: fakeRunner({ run: () => ({ code: 127 }) }),
  })

  assert.equal(failed.code, 1)
  assert.equal(missing.code, 5)
})
