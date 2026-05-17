import { existsSync } from 'node:fs'
import { spawn, spawnSync } from 'node:child_process'
import process from 'node:process'

const isWindows = process.platform === 'win32'
const corepackCommand = isWindows ? 'corepack.cmd' : 'corepack'
const dockerCommand = isWindows ? 'docker.exe' : 'docker'
const composeFile = 'docker-compose.yml'
const services = [
  {
    name: 'api',
    color: '\x1b[36m',
    args: ['pnpm', '--filter', '@tg-analyzer/api', 'dev'],
  },
  {
    name: 'worker',
    color: '\x1b[35m',
    args: ['pnpm', '--filter', '@tg-analyzer/api', 'dev:worker'],
  },
  {
    name: 'web',
    color: '\x1b[32m',
    args: ['pnpm', '--filter', '@tg-analyzer/web', 'dev'],
  },
]

const reset = '\x1b[0m'
const children = []
let shuttingDown = false

function prefixLine(name, color, line) {
  const label = `${color}[${name}]${reset}`
  return `${label} ${line}`
}

function relayStream(stream, name, color, target) {
  let buffer = ''

  stream.on('data', (chunk) => {
    buffer += chunk.toString()
    const lines = buffer.split(/\r?\n/)
    buffer = lines.pop() ?? ''

    for (const line of lines) {
      target.write(prefixLine(name, color, line) + '\n')
    }
  })

  stream.on('end', () => {
    if (buffer) {
      target.write(prefixLine(name, color, buffer) + '\n')
      buffer = ''
    }
  })
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true

  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT')
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGTERM')
      }
    }
  }, 1500).unref()

  setTimeout(() => process.exit(exitCode), 2000).unref()
}

function startInfrastructure() {
  if (!existsSync(composeFile) || process.env.SKIP_DOCKER_INFRA === '1') {
    return
  }

  const result = spawnSync(dockerCommand, ['compose', 'up', '-d', 'postgres', 'redis'], {
    stdio: 'inherit',
  })

  if (result.error) {
    process.stderr.write(prefixLine('infra', '\x1b[33m', 'Docker is unavailable, continuing without auto-starting postgres/redis.') + '\n')
    return
  }

  if (result.status !== 0) {
    process.stderr.write(prefixLine('infra', '\x1b[33m', 'docker compose up returned a non-zero exit code, continuing anyway.') + '\n')
  }
}

function startService(service) {
  const child = spawn(corepackCommand, service.args, {
    cwd: process.cwd(),
    env: process.env,
    shell: isWindows,
    stdio: ['inherit', 'pipe', 'pipe'],
  })

  children.push(child)
  relayStream(child.stdout, service.name, service.color, process.stdout)
  relayStream(child.stderr, service.name, service.color, process.stderr)

  child.on('exit', (code, signal) => {
    if (shuttingDown) {
      return
    }

    const detail = signal ? `signal ${signal}` : `code ${code ?? 0}`
    process.stderr.write(prefixLine(service.name, service.color, `stopped with ${detail}`) + '\n')
    shutdown(typeof code === 'number' ? code : 1)
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

startInfrastructure()
for (const service of services) {
  startService(service)
}
