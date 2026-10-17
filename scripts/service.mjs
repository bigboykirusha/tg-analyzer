// One repository, three processes (api, worker, web). Hosts that build the
// whole repository, such as Railway, run this script for every service:
//
//   node scripts/service.mjs build     # builds only what the service needs
//   node scripts/service.mjs migrate   # applies migrations (api, or any unknown service)
//   node scripts/service.mjs start     # starts the process
//
// The service is START_SERVICE if set, otherwise it is inferred from the
// Railway service name ("tga-api", "backend", "tg-analyzer-worker", "web", ...).
import { spawn } from 'node:child_process'
import process from 'node:process'

const SERVICES = ['api', 'worker', 'web']

function resolveService() {
  const explicit = (process.env.START_SERVICE || process.env.RAILWAY_SERVICE || '').trim().toLowerCase()
  if (explicit) return SERVICES.includes(explicit) ? explicit : null
  const name = (process.env.RAILWAY_SERVICE_NAME || '').toLowerCase()
  if (/worker|queue|job/.test(name)) return 'worker'
  if (/web|front|nuxt|site|app$/.test(name)) return 'web'
  if (/api|back|server/.test(name)) return 'api'
  return null
}

const COMMANDS = {
  build: {
    api: ['pnpm', '--filter', '@tg-analyzer/api', 'build'],
    worker: ['pnpm', '--filter', '@tg-analyzer/api', 'build'],
    web: ['pnpm', '--filter', '@tg-analyzer/web', 'build'],
  },
  migrate: {
    api: ['pnpm', '--filter', '@tg-analyzer/api', 'migrate'],
    worker: null,
    web: null,
  },
  start: {
    api: ['pnpm', '--filter', '@tg-analyzer/api', 'start'],
    worker: ['pnpm', '--filter', '@tg-analyzer/api', 'worker'],
    web: ['pnpm', '--filter', '@tg-analyzer/web', 'start'],
  },
}

const action = process.argv[2] ?? 'start'
if (!(action in COMMANDS)) {
  console.error(`[service] Unknown action "${action}". Use build | migrate | start.`)
  process.exit(2)
}

const service = resolveService()
if (!service && action === 'build') {
  // Build-time variables can differ per host; building everything is slower but always correct.
  console.log('[service] build: service unknown, building api and web')
  run(['pnpm', '-r', '--filter', '@tg-analyzer/api', '--filter', '@tg-analyzer/web', 'build'])
} else if (!service && action === 'migrate') {
  // Migrating is safe from any service; a wrong guess must not fail the deploy.
  console.log('[service] migrate: service unknown, applying migrations')
  run(['pnpm', '--filter', '@tg-analyzer/api', 'migrate'])
} else if (!service) {
  console.error('[service] Cannot tell which service to run.')
  console.error(`  START_SERVICE=${process.env.START_SERVICE ?? '(unset)'}`)
  console.error(`  RAILWAY_SERVICE_NAME=${process.env.RAILWAY_SERVICE_NAME ?? '(unset)'}`)
  console.error('Set START_SERVICE to api, worker or web in the service variables.')
  process.exit(2)
} else {
  const args = COMMANDS[action][service]
  if (!args) {
    console.log(`[service] ${action}: nothing to do for ${service}`)
    process.exit(0)
  }
  console.log(`[service] ${action} ${service}`)
  run(args)
}

function run(args) {
  const isWindows = process.platform === 'win32'
  const child = spawn(isWindows ? 'corepack.cmd' : 'corepack', args, { stdio: 'inherit', shell: isWindows })
  child.on('exit', (code, signal) => {
    if (signal) process.kill(process.pid, signal)
    else process.exit(code ?? 1)
  })
  child.on('error', (error) => {
    console.error('[service] failed to spawn:', error)
    process.exit(1)
  })
}
