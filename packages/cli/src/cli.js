import { createRequire } from 'node:module'
import { relative } from 'node:path'
import { capabilityGroups, capabilitySchemaVersion, capabilitySummary } from './capabilities.js'
import {
  composeArgs,
  composeProjectName,
  controlComposeArgs,
  normalizeComposeServices,
  parseComposePs,
} from './compose.js'
import { runDoctor } from './doctor.js'
import { createProcessRunner } from './process.js'
import {
  exists,
  initializeEnvironment,
  isConfiguredSecret,
  ProjectConfigurationError,
  readEnv,
  resolveEnvPath,
  resolveProjectRoot,
} from './project.js'

const require = createRequire(import.meta.url)
const { version: CLI_VERSION } = require('../package.json')

const EXIT = {
  success: 0,
  failure: 1,
  usage: 2,
  dependency: 5,
}

const COMPOSE_SERVICES = new Set(['postgres', 'migrate', 'collaboration', 'web'])
const JSON_COMMANDS = new Set(['capabilities', 'init', 'doctor', 'status', 'version'])
const CONTROL_COMPOSE_ENV = {
  AUTH_SECRET: 'doc-control-command-only',
  COLLABORATE_API_AUTH_KEY: 'doc-control-collaboration-only',
  COLLABORATE_INTERNAL_API_KEY: 'doc-control-internal-only',
}

class UsageError extends Error {}

function write(stream, value = '') {
  stream.write(`${value}\n`)
}

function optionName(value) {
  return value.slice(2).split('=', 1)[0]
}

function extractGlobalOptions(argv) {
  const args = [...argv]
  const options = { json: false }
  const remaining = []

  for (let index = 0; index < args.length; index += 1) {
    const value = args[index]
    if (value === '--json') {
      options.json = true
      continue
    }
    if (value === '--root' || value === '--env-file') {
      const next = args[index + 1]
      if (!next || next.startsWith('-')) throw new UsageError(`${value} requires a value`)
      options[value.slice(2).replace('-', '_')] = next
      index += 1
      continue
    }
    if (value.startsWith('--root=') || value.startsWith('--env-file=')) {
      const [name, ...parts] = value.slice(2).split('=')
      const optionValue = parts.join('=')
      if (!optionValue) throw new UsageError(`--${name} requires a value`)
      options[name.replace('-', '_')] = optionValue
      continue
    }
    remaining.push(value)
  }

  return { options, remaining }
}

function parseCommandOptions(args, definition = {}) {
  const flags = {}
  const positionals = []
  const aliases = definition.aliases || {}

  for (let index = 0; index < args.length; index += 1) {
    let value = args[index]
    if (aliases[value]) value = aliases[value]

    if (!value.startsWith('--')) {
      if (value.startsWith('-')) throw new UsageError(`Unknown option: ${value}`)
      positionals.push(value)
      continue
    }

    const name = optionName(value)
    const type = definition[name]
    if (!type) throw new UsageError(`Unknown option: --${name}`)

    if (type === 'boolean') {
      if (value.includes('=')) throw new UsageError(`--${name} does not accept a value`)
      flags[name] = true
      continue
    }

    const inlineValue = value.includes('=') ? value.slice(value.indexOf('=') + 1) : undefined
    const next = inlineValue ?? args[index + 1]
    if (!next || (inlineValue === undefined && next.startsWith('-'))) {
      throw new UsageError(`--${name} requires a value`)
    }
    flags[name] = next
    if (inlineValue === undefined) index += 1
  }

  return { flags, positionals }
}

function globalHelp() {
  return `doc ${CLI_VERSION} — local operations for doc

Usage:
  doc [--root <path>] [--env-file <path>] [--json] <command> [options]

Commands:
  capabilities          List delivered and experimental product capabilities
  init                  Create private environment files with generated secrets
  doctor                Check local dependencies, configuration, and optional live services
  up [service...]       Build and start the container stack
  down                  Stop the container stack without deleting data
  status                Show container service status
  logs [service]        Read container logs
  dev                   Start dependencies and run the Web app in development mode
  db <generate|push>    Run explicit local Prisma tasks
  check                 Run the repository quality gate
  config path           Print the active environment file path
  version               Print CLI, project, and Node versions
  help [command]        Show command help

Global options:
  --root <path>         doc checkout to operate on (default: discover from cwd)
  --env-file <path>     Environment file relative to the project root (default: .env)
  --json                Emit machine-readable output when supported
  -h, --help            Show help
  -v, --version         Show version

Exit codes:
  0 success · 1 operation/check failed · 2 usage/configuration error · 5 dependency unavailable`
}

const commandHelp = {
  capabilities: `Usage: doc capabilities [--json]

List the current product capability inventory. Experimental surfaces are labeled explicitly.`,
  init: `Usage: doc init [--force --yes] [--dry-run]

Create .env and services/collaboration/.env with three independent random secrets.
Existing files are never overwritten unless both --force and --yes are provided.
Forced initialization preserves non-secret values and rotates all generated secrets.`,
  doctor: `Usage: doc doctor [--live] [--json]

Check Node.js, Docker, Compose, environment values, and Compose configuration.
Use --live to also probe the Web and collaboration health endpoints.`,
  up: `Usage: doc up [postgres|migrate|collaboration|web ...] [--build] [--foreground]

Start the full stack by default. In detached mode Compose waits for healthy services.`,
  down: `Usage: doc down

Stop the stack. This command never deletes the PostgreSQL volume.`,
  status: `Usage: doc status [--json]

Show status for this checkout's isolated Compose project.`,
  logs: `Usage: doc logs [postgres|migrate|collaboration|web] [--follow] [--tail <lines>]

Read service logs. --follow can be shortened to -f.`,
  dev: `Usage: doc dev [--skip-infra]

Start PostgreSQL and collaboration in containers, push the local schema, then run Next.js.`,
  db: `Usage: doc db <generate|push>

Run Prisma generation or an explicit local schema push. db push refuses non-local database hosts.`,
  check: `Usage: doc check

Run formatting, lint, tests, collaboration checks, and the production build.`,
  config: `Usage: doc config path

Print the resolved environment file path without reading secret values.`,
  version: `Usage: doc version [--json]

Print CLI and project versions.`,
}

function ensureNoPositionals(positionals, command) {
  if (positionals.length > 0) throw new UsageError(`${command} does not accept positional arguments`)
}

async function requireRuntimeEnv(envPath, processEnv) {
  if (!(await exists(envPath))) throw new UsageError(`Missing ${envPath}. Run "doc init" first.`)
  const env = { ...(await readEnv(envPath)), ...processEnv }
  const missing = ['AUTH_SECRET', 'DATABASE_URL', 'COLLABORATE_API_AUTH_KEY', 'COLLABORATE_INTERNAL_API_KEY'].filter(
    (key) => (key.includes('SECRET') || key.includes('KEY') ? !isConfiguredSecret(env[key]) : !env[key])
  )
  if (missing.length > 0) throw new UsageError(`Missing or placeholder configuration: ${missing.join(', ')}`)
  const secrets = [env.AUTH_SECRET, env.COLLABORATE_API_AUTH_KEY, env.COLLABORATE_INTERNAL_API_KEY]
  if (new Set(secrets).size !== secrets.length) {
    throw new UsageError('AUTH_SECRET and both collaboration keys must all be different')
  }
  return env
}

function assertLocalDatabase(env) {
  if (!databaseIsLocal(env.DATABASE_URL)) {
    throw new UsageError('Local schema operations only accept localhost or loopback DATABASE_URL values')
  }
}

function normalizedProcessExit(result) {
  if (result.code === 0) return EXIT.success
  if (result.code === 127) return EXIT.dependency
  return EXIT.failure
}

function formatCapabilitiesText() {
  const lines = []
  for (const group of capabilityGroups) {
    lines.push(group.title)
    for (const item of group.capabilities) {
      lines.push(`  ${item.status === 'available' ? '✓' : '△'} ${item.name} [${item.status}]`)
      lines.push(`    ${item.detail}`)
    }
    lines.push('')
  }
  const summary = capabilitySummary()
  lines.push(`${summary.available} available · ${summary.experimental} experimental`)
  return lines.join('\n')
}

function formatDoctorText(result) {
  const lines = result.checks.map((item) => {
    const marker = item.status === 'pass' ? '✓' : item.status === 'warn' ? '!' : '✗'
    return `${marker} ${item.label}: ${item.detail}`
  })
  lines.push(result.ok ? 'doctor: healthy' : 'doctor: action required')
  return lines.join('\n')
}

function npmCommand(platform) {
  return platform === 'win32' ? 'npm.cmd' : 'npm'
}

function validateServices(services) {
  for (const service of services) {
    if (!COMPOSE_SERVICES.has(service)) throw new UsageError(`Unknown service: ${service}`)
  }
}

function databaseIsLocal(databaseUrl) {
  try {
    const hostname = new URL(databaseUrl).hostname
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
  } catch {
    return false
  }
}

async function projectVersion(root) {
  const project = require(`${root}/package.json`)
  return project.version
}

export async function runCli(argv, overrides = {}) {
  const stdout = overrides.stdout || process.stdout
  const stderr = overrides.stderr || process.stderr
  const cwd = overrides.cwd || process.cwd()
  const platform = overrides.platform || process.platform
  const processEnv = overrides.env || process.env
  const runner = overrides.runner || createProcessRunner(processEnv)
  const fetchImpl = overrides.fetch || fetch

  try {
    const { options: globalOptions, remaining } = extractGlobalOptions(argv)
    if (remaining.length === 0 || remaining[0] === '--help' || remaining[0] === '-h') {
      write(stdout, globalHelp())
      return EXIT.success
    }
    if (remaining[0] === '--version' || remaining[0] === '-v') {
      write(stdout, CLI_VERSION)
      return EXIT.success
    }

    let command = remaining[0]
    let commandArgs = remaining.slice(1)
    if (command === 'help') {
      command = commandArgs[0]
      if (!command) {
        write(stdout, globalHelp())
        return EXIT.success
      }
      if (!commandHelp[command]) throw new UsageError(`Unknown command: ${command}`)
      write(stdout, commandHelp[command])
      return EXIT.success
    }
    if (!commandHelp[command] && command !== 'capabilities') throw new UsageError(`Unknown command: ${command}`)
    if (commandArgs.includes('--help') || commandArgs.includes('-h')) {
      write(stdout, commandHelp[command])
      return EXIT.success
    }

    if (command === 'capabilities') {
      const { positionals } = parseCommandOptions(commandArgs)
      ensureNoPositionals(positionals, command)
      if (globalOptions.json) {
        write(
          stdout,
          JSON.stringify(
            {
              schemaVersion: capabilitySchemaVersion,
              product: 'doc',
              summary: capabilitySummary(),
              groups: capabilityGroups,
            },
            null,
            2
          )
        )
      } else {
        write(stdout, formatCapabilitiesText())
      }
      return EXIT.success
    }
    if (globalOptions.json && !JSON_COMMANDS.has(command)) {
      throw new UsageError(`--json is not supported by ${command}`)
    }

    const root = await resolveProjectRoot(cwd, globalOptions.root)
    const envPath = resolveEnvPath(root, globalOptions.env_file)
    const compose = composeArgs(root, (await exists(envPath)) ? envPath : undefined)
    const controlCompose = controlComposeArgs(root)

    if (command === 'init') {
      const { flags, positionals } = parseCommandOptions(commandArgs, {
        force: 'boolean',
        yes: 'boolean',
        'dry-run': 'boolean',
      })
      ensureNoPositionals(positionals, command)
      if (flags.force && !flags.yes) throw new UsageError('--force requires --yes')
      const result = await initializeEnvironment(root, {
        envFile: globalOptions.env_file,
        force: flags.force,
        dryRun: flags['dry-run'],
      })
      if (globalOptions.json) {
        write(stdout, JSON.stringify(result, null, 2))
      } else {
        for (const path of result.created)
          write(stdout, `${result.dryRun ? 'would create' : 'created'} ${relative(root, path)}`)
        for (const path of result.overwritten) {
          write(stdout, `${result.dryRun ? 'would overwrite' : 'overwrote'} ${relative(root, path)}`)
        }
        for (const path of result.skipped) write(stdout, `kept ${relative(root, path)} (already exists)`)
        write(stdout, result.dryRun ? 'init: dry run complete' : 'init: configuration ready')
      }
      return EXIT.success
    }

    if (command === 'doctor') {
      const { flags, positionals } = parseCommandOptions(commandArgs, { live: 'boolean' })
      ensureNoPositionals(positionals, command)
      const result = await runDoctor({
        root,
        envPath,
        runner,
        live: flags.live,
        npmExecutable: npmCommand(platform),
        fetchImpl,
        platform,
        processEnv,
      })
      write(stdout, globalOptions.json ? JSON.stringify(result, null, 2) : formatDoctorText(result))
      return result.ok ? EXIT.success : EXIT.failure
    }

    if (command === 'up') {
      const { flags, positionals: services } = parseCommandOptions(commandArgs, {
        build: 'boolean',
        foreground: 'boolean',
      })
      validateServices(services)
      const env = await requireRuntimeEnv(envPath, processEnv)
      const args = [...compose, 'up']
      if (!flags.foreground) args.push('-d', '--wait', '--wait-timeout', '90')
      if (flags.build) args.push('--build')
      args.push(...services)
      const result = await runner.run('docker', args, { cwd: root, env })
      return normalizedProcessExit(result)
    }

    if (command === 'down') {
      const { positionals } = parseCommandOptions(commandArgs)
      ensureNoPositionals(positionals, command)
      const result = await runner.run('docker', [...controlCompose, 'down', '--remove-orphans'], {
        cwd: root,
        env: CONTROL_COMPOSE_ENV,
      })
      return normalizedProcessExit(result)
    }

    if (command === 'status') {
      const { positionals } = parseCommandOptions(commandArgs)
      ensureNoPositionals(positionals, command)
      if (globalOptions.json) {
        const result = await runner.capture('docker', [...controlCompose, 'ps', '--format', 'json'], {
          cwd: root,
          env: CONTROL_COMPOSE_ENV,
        })
        if (result.code !== 0) {
          const exitCode = normalizedProcessExit(result)
          write(
            stderr,
            JSON.stringify({
              error: result.stderr.trim() || 'Unable to read Compose status',
              exitCode,
            })
          )
          return exitCode
        }
        write(
          stdout,
          JSON.stringify(
            {
              project: composeProjectName(root),
              services: normalizeComposeServices(parseComposePs(result.stdout)),
            },
            null,
            2
          )
        )
        return EXIT.success
      }
      const result = await runner.run('docker', [...controlCompose, 'ps'], {
        cwd: root,
        env: CONTROL_COMPOSE_ENV,
      })
      return normalizedProcessExit(result)
    }

    if (command === 'logs') {
      const { flags, positionals } = parseCommandOptions(commandArgs, {
        follow: 'boolean',
        tail: 'value',
        aliases: { '-f': '--follow' },
      })
      if (positionals.length > 1) throw new UsageError('logs accepts at most one service')
      validateServices(positionals)
      if (flags.tail && (!/^\d+$/.test(flags.tail) || Number(flags.tail) < 1 || Number(flags.tail) > 10000)) {
        throw new UsageError('--tail must be an integer between 1 and 10000')
      }
      const args = [...controlCompose, 'logs']
      if (flags.follow) args.push('--follow')
      if (flags.tail) args.push('--tail', flags.tail)
      args.push(...positionals)
      const result = await runner.run('docker', args, { cwd: root, env: CONTROL_COMPOSE_ENV })
      return normalizedProcessExit(result)
    }

    if (command === 'dev') {
      const { flags, positionals } = parseCommandOptions(commandArgs, { 'skip-infra': 'boolean' })
      ensureNoPositionals(positionals, command)
      const env = await requireRuntimeEnv(envPath, processEnv)
      assertLocalDatabase(env)
      if (!flags['skip-infra']) {
        const infrastructure = await runner.run(
          'docker',
          [...compose, 'up', '-d', '--wait', '--wait-timeout', '60', 'postgres', 'collaboration'],
          { cwd: root, env }
        )
        if (infrastructure.code !== 0) {
          return normalizedProcessExit(infrastructure)
        }
        const schema = await runner.run(npmCommand(platform), ['run', 'db:push'], { cwd: root, env })
        if (schema.code !== 0) return normalizedProcessExit(schema)
      }
      const result = await runner.run(npmCommand(platform), ['run', 'dev'], { cwd: root, env })
      return normalizedProcessExit(result)
    }

    if (command === 'db') {
      const { positionals } = parseCommandOptions(commandArgs)
      if (positionals.length !== 1 || !['generate', 'push'].includes(positionals[0])) {
        throw new UsageError('db requires exactly one subcommand: generate or push')
      }
      let env
      if (positionals[0] === 'push') {
        env = await requireRuntimeEnv(envPath, processEnv)
        assertLocalDatabase(env)
      }
      const args = positionals[0] === 'generate' ? ['exec', '--', 'prisma', 'generate'] : ['run', 'db:push']
      const result = await runner.run(npmCommand(platform), args, { cwd: root, env })
      return normalizedProcessExit(result)
    }

    if (command === 'check') {
      const { positionals } = parseCommandOptions(commandArgs)
      ensureNoPositionals(positionals, command)
      const result = await runner.run(npmCommand(platform), ['run', 'check'], { cwd: root })
      return normalizedProcessExit(result)
    }

    if (command === 'config') {
      const { positionals } = parseCommandOptions(commandArgs)
      if (positionals.length !== 1 || positionals[0] !== 'path') {
        throw new UsageError('config currently supports exactly one subcommand: path')
      }
      write(stdout, envPath)
      return EXIT.success
    }

    if (command === 'version') {
      const { positionals } = parseCommandOptions(commandArgs)
      ensureNoPositionals(positionals, command)
      const versions = { cli: CLI_VERSION, project: await projectVersion(root), node: process.version }
      write(
        stdout,
        globalOptions.json
          ? JSON.stringify(versions, null, 2)
          : `doc CLI ${versions.cli} · project ${versions.project} · Node ${versions.node}`
      )
      return EXIT.success
    }

    throw new UsageError(`Unknown command: ${command}`)
  } catch (error) {
    if (
      error instanceof UsageError ||
      error instanceof ProjectConfigurationError ||
      /No doc project found|Not a doc project/.test(error.message)
    ) {
      if (argv.includes('--json')) write(stderr, JSON.stringify({ error: error.message, exitCode: EXIT.usage }))
      else write(stderr, `error: ${error.message}`)
      return EXIT.usage
    }
    if (argv.includes('--json')) write(stderr, JSON.stringify({ error: error.message, exitCode: EXIT.failure }))
    else write(stderr, `error: ${error.message}`)
    return EXIT.failure
  }
}
