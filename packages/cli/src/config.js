import { randomBytes } from 'node:crypto'
import { chmod, lstat, mkdir, readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { homedir } from 'node:os'
import { isAbsolute, join, resolve } from 'node:path'

const CONFIG_SCHEMA_VERSION = 1
const CONFIG_FILE = 'config.json'

export class CliConfigurationError extends Error {}

function configuredPath(value) {
  return typeof value === 'string' && value.trim() !== ''
}

function absoluteConfigurationPath(value, variable) {
  if (!isAbsolute(value)) {
    throw new CliConfigurationError(`${variable} must be an absolute path`)
  }
  return resolve(value)
}

export function resolveConfigPaths(env = process.env, homeDirectory = homedir()) {
  const directory = configuredPath(env.DOC_CONFIG_HOME)
    ? absoluteConfigurationPath(env.DOC_CONFIG_HOME, 'DOC_CONFIG_HOME')
    : configuredPath(env.XDG_CONFIG_HOME)
      ? resolve(absoluteConfigurationPath(env.XDG_CONFIG_HOME, 'XDG_CONFIG_HOME'), 'doc')
      : resolve(homeDirectory, '.config', 'doc')

  return {
    directory,
    file: join(directory, CONFIG_FILE),
  }
}

async function optionalStat(path, label) {
  try {
    const result = await lstat(path)
    if (result.isSymbolicLink()) {
      throw new CliConfigurationError(`${label} must not be a symbolic link: ${path}`)
    }
    return result
  } catch (error) {
    if (error.code === 'ENOENT') return null
    throw error
  }
}

function assertPrivateMode(stat, expectedMode, label, path, platform) {
  if (platform === 'win32') return
  const actualMode = stat.mode & 0o777
  if (actualMode !== expectedMode) {
    throw new CliConfigurationError(
      `${label} must have mode ${expectedMode.toString(8).padStart(4, '0')}, found ${actualMode
        .toString(8)
        .padStart(4, '0')}: ${path}`
    )
  }
}

function validateConfig(value, path) {
  if (value == null || Array.isArray(value) || typeof value !== 'object') {
    throw new CliConfigurationError(`Invalid doc CLI configuration: ${path}`)
  }
  if (value.schemaVersion !== CONFIG_SCHEMA_VERSION) {
    throw new CliConfigurationError(`Unsupported doc CLI configuration version: ${path}`)
  }
  if (value.url !== undefined && (typeof value.url !== 'string' || value.url.trim() === '')) {
    throw new CliConfigurationError(`Invalid API URL in doc CLI configuration: ${path}`)
  }
  if (value.token !== undefined && (typeof value.token !== 'string' || value.token.trim() === '')) {
    throw new CliConfigurationError(`Invalid API token in doc CLI configuration: ${path}`)
  }

  return {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    ...(value.url === undefined ? {} : { url: value.url }),
    ...(value.token === undefined ? {} : { token: value.token }),
  }
}

export async function readCliConfig(paths, platform = process.platform) {
  const directoryStat = await optionalStat(paths.directory, 'Configuration directory')
  if (!directoryStat) return { schemaVersion: CONFIG_SCHEMA_VERSION }
  if (!directoryStat.isDirectory()) {
    throw new CliConfigurationError(`Configuration directory is not a directory: ${paths.directory}`)
  }
  assertPrivateMode(directoryStat, 0o700, 'Configuration directory', paths.directory, platform)

  const fileStat = await optionalStat(paths.file, 'Configuration file')
  if (!fileStat) return { schemaVersion: CONFIG_SCHEMA_VERSION }
  if (!fileStat.isFile()) {
    throw new CliConfigurationError(`Configuration file is not a regular file: ${paths.file}`)
  }
  assertPrivateMode(fileStat, 0o600, 'Configuration file', paths.file, platform)

  let value
  try {
    value = JSON.parse(await readFile(paths.file, 'utf8'))
  } catch (error) {
    if (error instanceof SyntaxError) {
      throw new CliConfigurationError(`Invalid JSON in doc CLI configuration: ${paths.file}`)
    }
    throw error
  }
  const config = validateConfig(value, paths.file)
  if (platform === 'win32' && config.token) {
    throw new CliConfigurationError(
      'Saved API tokens are not supported on Windows; use DOC_API_TOKEN from a protected credential source'
    )
  }
  return config
}

export async function writeCliConfig(paths, config, platform = process.platform) {
  const existingDirectory = await optionalStat(paths.directory, 'Configuration directory')
  if (existingDirectory && !existingDirectory.isDirectory()) {
    throw new CliConfigurationError(`Configuration directory is not a directory: ${paths.directory}`)
  }
  if (existingDirectory) {
    assertPrivateMode(existingDirectory, 0o700, 'Configuration directory', paths.directory, platform)
  }

  const existingFile = await optionalStat(paths.file, 'Configuration file')
  if (existingFile && !existingFile.isFile()) {
    throw new CliConfigurationError(`Configuration file is not a regular file: ${paths.file}`)
  }
  if (existingFile) {
    assertPrivateMode(existingFile, 0o600, 'Configuration file', paths.file, platform)
  }

  const normalized = validateConfig({ schemaVersion: CONFIG_SCHEMA_VERSION, ...config }, paths.file)
  if (platform === 'win32' && normalized.token) {
    throw new CliConfigurationError(
      'Saved API tokens are not supported on Windows; use DOC_API_TOKEN from a protected credential source'
    )
  }
  await mkdir(paths.directory, { recursive: true, mode: 0o700 })
  await chmod(paths.directory, 0o700)

  const temporaryPath = join(paths.directory, `.config-${process.pid}-${randomBytes(6).toString('hex')}.tmp`)
  try {
    await writeFile(temporaryPath, `${JSON.stringify(normalized, null, 2)}\n`, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    })
    await chmod(temporaryPath, 0o600)
    await rename(temporaryPath, paths.file)
    await chmod(paths.file, 0o600)
  } catch (error) {
    try {
      await unlink(temporaryPath)
    } catch {}
    throw error
  }
}

export function validateToken(token) {
  const normalized = typeof token === 'string' ? token.trim() : ''
  if (!normalized) throw new CliConfigurationError('API token is required')
  if (normalized.length > 4096 || /\s/.test(normalized)) {
    throw new CliConfigurationError('API token must be a single non-whitespace value')
  }
  return normalized
}

function sameOrigin(left, right) {
  try {
    return new URL(left).origin === new URL(right).origin
  } catch {
    return false
  }
}

export async function resolveApiCredentials({
  explicitUrl,
  env = process.env,
  paths,
  allowIncomplete = false,
  platform = process.platform,
}) {
  const environmentUrl = configuredPath(env.DOC_API_URL) ? env.DOC_API_URL.trim() : undefined
  const environmentToken = configuredPath(env.DOC_API_TOKEN) ? validateToken(env.DOC_API_TOKEN) : undefined
  const needsConfig = !explicitUrl && !environmentUrl ? true : !environmentToken
  const config = needsConfig ? await readCliConfig(paths, platform) : { schemaVersion: CONFIG_SCHEMA_VERSION }
  const url = explicitUrl || environmentUrl || config.url
  const savedTokenMatchesUrl =
    config.token && config.url && (!explicitUrl && !environmentUrl ? true : sameOrigin(url, config.url))
  const token = environmentToken || (savedTokenMatchesUrl && config.token ? validateToken(config.token) : undefined)

  if (!url && !allowIncomplete) {
    throw new CliConfigurationError(
      'API URL is not configured. Pass --url, set DOC_API_URL, or run "doc auth login --url <url>".'
    )
  }
  if (!token && !allowIncomplete) {
    const selectedUrlWithoutMatchingToken =
      Boolean(url) && Boolean(explicitUrl || environmentUrl) && Boolean(config.token)
    throw new CliConfigurationError(
      selectedUrlWithoutMatchingToken
        ? 'The saved API token belongs to a different origin. Set DOC_API_TOKEN or run "doc auth login --url <url>".'
        : 'API token is not configured. Set DOC_API_TOKEN or run "doc auth login --url <url>".'
    )
  }

  return {
    url,
    token,
    urlSource: explicitUrl ? 'argument' : environmentUrl ? 'environment' : 'config',
    tokenSource: environmentToken ? 'environment' : token ? 'config' : null,
  }
}
