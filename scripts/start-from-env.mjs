import { spawn } from 'node:child_process'
import process from 'node:process'

// One repository, three processes. Hosts that build the whole repo (e.g. Railway)
// pick the process with START_SERVICE (or the Railway service name).
const service = (process.env.START_SERVICE || process.env.RAILWAY_SERVICE_NAME || process.env.RAILWAY_SERVICE || '')
  .trim()
  .toLowerCase()
  .replace(/^tga-/, '')
const isWindows = process.platform === 'win32'
const corepack = isWindows ? 'corepack.cmd' : 'corepack'

function run(args) {
  const child = spawn(corepack, args, {
    cwd: process.cwd(),
    env: process.env,
    stdio: 'inherit',
    shell: isWindows,
  })
  child.on('exit', (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal)
      return
    }
    process.exit(typeof code === 'number' ? code : 1)
  })
  child.on('error', (err) => {
    console.error('[start-from-env] failed to spawn:', err)
    process.exit(1)
  })
}

switch (service) {
  case 'api':
    run(['pnpm', '--filter', '@tg-analyzer/api', 'start'])
    break
  case 'web':
    run(['pnpm', '--filter', '@tg-analyzer/web', 'start'])
    break
  case 'worker':
    run(['pnpm', '--filter', '@tg-analyzer/api', 'worker'])
    break
  default:
    console.error(`[start-from-env] Missing service selection.`)
    console.error(`Set env RAILWAY_SERVICE or START_SERVICE to one of: api | web | worker`)
    console.error(`Examples:`)
    console.error(`  RAILWAY_SERVICE=api    -> pnpm --filter @tg-analyzer/api start`)
    console.error(`  RAILWAY_SERVICE=web    -> pnpm --filter @tg-analyzer/web start`)
    console.error(`  RAILWAY_SERVICE=worker -> pnpm --filter @tg-analyzer/api worker`)
    process.exit(2)
}
