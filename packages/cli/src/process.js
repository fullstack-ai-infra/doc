import { spawn } from 'node:child_process'

function spawnChild(command, args, options) {
  return spawn(command, args, {
    cwd: options.cwd,
    env: options.env,
    shell: false,
    stdio: options.stdio,
  })
}

function forwardSignals(child) {
  const handlers = new Map()
  for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
    const handler = () => {
      try {
        child.kill(signal)
      } catch {}
    }
    handlers.set(signal, handler)
    process.on(signal, handler)
  }

  return () => {
    for (const [signal, handler] of handlers) process.off(signal, handler)
  }
}

export function createProcessRunner(baseEnv = process.env) {
  return {
    run(command, args, options = {}) {
      return new Promise((resolve) => {
        const child = spawnChild(command, args, {
          cwd: options.cwd,
          env: { ...baseEnv, ...options.env },
          stdio: 'inherit',
        })
        const stopForwarding = forwardSignals(child)

        child.once('error', (error) => {
          stopForwarding()
          resolve({ code: error.code === 'ENOENT' ? 127 : 1, error })
        })
        child.once('close', (code, signal) => {
          stopForwarding()
          resolve({ code: code ?? (signal ? 1 : 0), signal })
        })
      })
    },

    capture(command, args, options = {}) {
      return new Promise((resolve) => {
        const child = spawnChild(command, args, {
          cwd: options.cwd,
          env: { ...baseEnv, ...options.env },
          stdio: ['ignore', 'pipe', 'pipe'],
        })
        let stdout = ''
        let stderr = ''

        child.stdout.setEncoding('utf8')
        child.stderr.setEncoding('utf8')
        child.stdout.on('data', (chunk) => {
          stdout += chunk
        })
        child.stderr.on('data', (chunk) => {
          stderr += chunk
        })
        child.once('error', (error) => {
          resolve({
            code: error.code === 'ENOENT' ? 127 : 1,
            stdout,
            stderr,
            error,
          })
        })
        child.once('close', (code, signal) => {
          resolve({ code: code ?? (signal ? 1 : 0), stdout, stderr, signal })
        })
      })
    },
  }
}
