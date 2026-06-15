import { config } from './config.js'
import { logger } from './logger.js'
import { TransferX } from './transferX.js'

const listener = new TransferX()
await listener.start()

logger.warn(`Will restart in ${(config.restartDelayMs / 60_000).toFixed(1)} min`)
setTimeout(() => {
  logger.warn('Scheduled restart, exiting cleanly')
  listener.stop()
  process.exit(0)
}, config.restartDelayMs)
