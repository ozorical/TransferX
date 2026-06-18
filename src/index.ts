import { config } from './config.js'
import { logger } from './logger.js'
import { TransferX } from './transferX.js'
import readline from 'readline'

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

process.on('unhandledRejection', (reason) => {
  logger.error(`Unhandled rejection: ${String(reason)}`)
})
process.on('uncaughtException', (error) => {
  logger.error(`Uncaught exception: ${String(error)}`)
})

const listener = new TransferX()
let running = false

async function doStart(): Promise<void> {
  if (running) {
    logger.warn('Already started')
    return
  }
  await listener.start()
  running = true
}

function doStop(): void {
  if (!running) {
    logger.warn('Not running')
    return
  }
  listener.stop()
  running = false
}

async function doRestart(): Promise<void> {
  doStop()
  await doStart()
}

let startedOnce = false
await doStart()
if (!startedOnce) {
  startedOnce = true
  logger.banner([
    '  ______                      ____         _  __',
    ' /_  __/________ _____  _____/ __/__  ____| |/ /',
    '  / / / ___/ __ `/ __ \\/ ___/ /_/ _ \\/ ___/   / ',
    ' / / / /  / /_/ / / / (__  ) __/  __/ /  /   |  ',
    '/_/ /_/   \\__,_/_/ /_/____/_/  \\___/_/  /_/|_|  ',
  ])
}

setTimeout(() => {
  listener.stop()
  process.exit(0)
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
      doStop()
    } else if (cmd === 'restart') {
      await doRestart()
    } else if (cmd === 'reconnect') {
      await doRestart()
    } else if (cmd === 'exit' || cmd === 'quit') {
      doStop()
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
