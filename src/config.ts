import { Authflow, titles } from './externals.js'

const loadDotEnv = (): void => {
  const runtime = process as typeof process & { loadEnvFile?: (path?: string) => void }
  try {
    runtime.loadEnvFile?.()
  } catch {}
}

loadDotEnv()

const authflowOptions: Record<string, unknown> = {
  authTitle: titles.MinecraftNintendoSwitch,
  deviceType: 'Nintendo',
  flow: 'live',
}

export const config = {
  realmId: process.env.REALM_ID ?? '32568184',
  serverHost: process.env.SERVER_HOST ?? 'play.crabsmp.net',
  serverPort: Number(process.env.SERVER_PORT ?? '19132'),
  minecraftVersion: '1.26.20',
  protocolVersion: 975,
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL ?? '',
  portalWorldName: process.env.PORTAL_WORLD_NAME ?? 'CrabSMP',
  fallbackPollIntervalMs: 8_000,
  reconnectDelayMs: 10_000,
  restartDelayMs: (12 + Math.random() * 6) * 60 * 1000,
  dryRun: process.env.DRY_RUN === '1',
}

export const detectorAuthflow = new Authflow('RealmOwner', './auth-cache-realm', authflowOptions)
export const portalAuthflow = new Authflow('JoinCrab', './auth-cache', authflowOptions)
