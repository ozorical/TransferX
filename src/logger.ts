import chalk from 'chalk'

const rawLog = console.log.bind(console)
const rawError = console.error.bind(console)
const rawWarn = console.warn.bind(console)

const label = chalk.bold.cyan('[TransferX]')

const timestamp = (): string => chalk.dim(new Date().toLocaleTimeString())

const write = (level: string, color: (s: string) => string, message: string, out: (...args: any[]) => void = rawLog): void => {
  const levelTag = color(`[${level}]`)
  out(`${timestamp()} ${label} ${levelTag} ${message}`)
}

export const logger = {
  info: (message: string): void => write('INFO', chalk.blue, message, rawLog),
  success: (message: string): void => write('OK', chalk.green, message, rawLog),
  warn: (message: string): void => write('WARN', chalk.yellow, message, rawWarn),
  error: (message: string): void => write('ERR', chalk.red, message, rawError),
  muted: (message: string): void => write('MUTED', chalk.gray, message, rawLog),
  banner: (lines: string[]): void => {
    rawLog('')
    for (const l of lines) rawLog(`${timestamp()} ${label} ${chalk.magenta(l)}`)
    rawLog(`${timestamp()} ${label} ${chalk.gray('— made by ozz')}`)
  },
}
