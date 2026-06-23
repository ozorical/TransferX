import { existsSync, writeFileSync } from 'fs'
import { config } from './config.js'
import { logger } from './logger.js'
import { TransferX } from './transferX.js'
import { delay, describeError } from './util.js'
import readline from 'readline'

const MARKER = './session.marker'
const isRestart = existsSync(MARKER)
writeFileSync(MARKER, String(process.pid))

const suppressed = [
  'Received answer for closed connection, ignoring',
  'Received answer for closed connection',
]

console.log = (...args: any[]): void => {
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  for (const s of suppressed) if (msg.includes(s)) return
  logger.info(msg)
}
console.warn = (...args: any[]): void => {
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  for (const s of suppressed) if (msg.includes(s)) return
  logger.warn(msg)
}
console.error = (...args: any[]): void => {
  const msg = args.map((a) => (typeof a === 'string' ? a : JSON.stringify(a))).join(' ')
  for (const s of suppressed) if (msg.includes(s)) return
  logger.error(msg)
}

const suppressedExceptions = [
  'unexpected end of file',
  'Missing characters in string',
  'Read error',
  'Invalid promised segments',
]

let lastExceptionMsg = ''
let lastExceptionAt = 0

const handleException = (prefix: string, value: unknown): void => {
  const msg = String(value)
  if (suppressedExceptions.some((s) => msg.includes(s))) return
  const now = Date.now()
  if (msg === lastExceptionMsg && now - lastExceptionAt < 60_000) return
  lastExceptionMsg = msg
  lastExceptionAt = now
  logger.error(`${prefix}: ${msg}`)
}

process.on('unhandledRejection', (reason) => handleException('Unhandled rejection', reason))
process.on('uncaughtException', (error) => handleException('Uncaught exception', error))

const listener = new TransferX()
let running = false
let hasStarted = false
let startTimer: NodeJS.Timeout | null = null

async function doStart(): Promise<void> {
  if (running) {
    logger.warn('Already started')
    return
  }
  const silent = isRestart || hasStarted
  try {
    await listener.start(silent)
    running = true
    hasStarted = true
  } catch (error) {
    running = false
    logger.error(`Start failed: ${describeError(error)}`)
    if (!startTimer) {
      startTimer = setTimeout(() => {
        startTimer = null
        void doStart()
      }, config.reconnectDelayMs)
    }
  }
}

async function doStop(): Promise<void> {
  if (!running) {
    logger.warn('Not running')
    return
  }
  await listener.stop()
  running = false
}

async function doRestart(): Promise<void> {
  await doStop()
  await doStart()
}

await doStart()
if (isRestart) {
  logger.info('Session restarted')
} else {
  logger.banner([
    '  ______                      ____         _  __',
    ' /_  __/________ _____  _____/ __/__  ____| |/ /',
    '  / / / ___/ __ `/ __ \\/ ___/ /_/ _ \\/ ___/   / ',
    ' / / / /  / /_/ / / / (__  ) __/  __/ /  /   |  ',
    '/_/ /_/   \\__,_/_/ /_/____/_/  \\___/_/  /_/|_|  ',
  ])
}

setTimeout(() => {
  void (async () => {
    await doStop()
    await delay(3000)
    process.exit(0)
  })()
}, config.restartDelayMs)

const rl = readline.createInterface({ input: process.stdin, output: process.stdout, prompt: '> ' })

logger.info('Type "help" for commands')
rl.prompt()

rl.on('line', async (input: string) => {
  const cmd = String(input ?? '').trim().toLowerCase()
  try {
    if (!cmd || cmd === 'help' || cmd === '?') {
      logger.info('Commands: start, stop, restart, reconnect, help, exit')
    } else if (cmd === 'start') {
      await doStart()
    } else if (cmd === 'stop') {
      await doStop()
    } else if (cmd === 'restart') {
      await doRestart()
    } else if (cmd === 'reconnect') {
      await doRestart()
    } else if (cmd === 'exit' || cmd === 'quit') {
      await doStop()
      rl.close()
      process.exit(0)
    } else {
      logger.warn(`Unknown command: ${cmd}`)
    }
  } catch (error) {
    logger.error(String(error))
  }
  rl.prompt()
})
