import chalk from 'chalk'

const label = chalk.bold.cyan('[TransferX]')

const timestamp = (): string => chalk.dim(new Date().toLocaleTimeString())

const write = (message: string): void => {
  console.log(`${timestamp()} ${label} ${message}`)
}

export const logger = {
  info: (message: string): void => write(message),
  success: (message: string): void => write(chalk.green(message)),
  warn: (message: string): void => write(chalk.yellow(message)),
  error: (message: string): void => write(chalk.red(message)),
  muted: (message: string): void => write(chalk.gray(message)),
}
