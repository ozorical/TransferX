import { BedrockPortal, joinability, type BedrockPortalInstance } from './externals.js'
import { config, portalAuthflow } from './config.js'
import { logger } from './logger.js'
import { delay, describeError } from './util.js'
import type { XboxProfile } from './xboxProfile.js'
import type { DiscordWebhook } from './discordWebhook.js'

export class InviteManager {
  private portal: BedrockPortalInstance | null = null
  private readonly invited = new Set<string>()
  private starting = false
  private stopped = false
  private restartTimer: NodeJS.Timeout | null = null
  private everLive = false

  constructor(
    private readonly profile: XboxProfile,
    private readonly webhook: DiscordWebhook,
    private readonly blocked: Set<string>,
    private readonly silent = false,
  ) {}

  async start(): Promise<void> {
    if (config.dryRun) {
      logger.warn('Dry run: portal disabled, invites are logged only')
      return
    }
    this.stopped = false
    await this.ensurePortal()
  }

  async stop(): Promise<void> {
    this.stopped = true
    if (this.restartTimer) {
      clearTimeout(this.restartTimer)
      this.restartTimer = null
    }
    await this.teardownPortal()
  }

  has(xuid: string): boolean {
    return this.invited.has(xuid)
  }

  forget(xuid: string): void {
    this.invited.delete(xuid)
  }

  dropAbsent(online: Set<string>): void {
    for (const xuid of this.invited) {
      if (!online.has(xuid)) this.invited.delete(xuid)
    }
  }

  async invite(xuid: string, gamertagHint?: string): Promise<void> {
    if (this.blocked.has(xuid) || this.invited.has(xuid)) return
    this.invited.add(xuid)

    const gamertag = gamertagHint ?? (await this.profile.gamertagFor(xuid))

    if (config.dryRun) {
      logger.muted(`[dry run] would invite ${gamertag} -> ${config.serverHost}:${config.serverPort}`)
      return
    }

    if (!this.portal) {
      this.invited.delete(xuid)
      void this.schedulePortalRestart()
      return
    }

    try {
      await this.portal.invitePlayer(xuid)
      logger.success(`Invited ${gamertag} -> ${config.serverHost}:${config.serverPort}`)
    } catch (error) {
      this.invited.delete(xuid)
      logger.error(`Failed to invite ${gamertag}: ${describeError(error)}`)
      void this.schedulePortalRestart()
    }
  }

  private createPortal(): BedrockPortalInstance {
    const portal = new BedrockPortal({
      host: portalAuthflow,
      ip: config.serverHost,
      port: config.serverPort,
      joinability: joinability.InviteOnly,
      world: {
        hostName: config.portalWorldName,
        name: `Join ${config.serverHost}`,
        version: config.minecraftVersion,
      },
    })

    portal.on('playerJoin', (player) => {
      const gamertag = player.profile?.gamertag ?? player.xuid ?? 'unknown'
      const xuid = player.profile?.xuid ?? player.xuid ?? 'unknown'
      logger.success(`Session join: ${gamertag}`)
      void this.webhook.announcePlayerJoin(gamertag, xuid)
    })

    ;(portal as any).on('error', (error: Error) => {
      logger.error(`Portal error: ${describeError(error)}`)
      void this.schedulePortalRestart()
    })

    return portal
  }

  private async ensurePortal(attempt = 0): Promise<void> {
    if (config.dryRun || this.stopped) return
    if (this.starting) return
    this.starting = true

    try {
      await this.teardownPortal()
      const portal = this.createPortal()
      await portal.start()
      this.portal = portal
      const shouldLog = !this.everLive && !this.silent
      this.everLive = true
      if (shouldLog) logger.success(`Portal live: routing to ${config.serverHost}:${config.serverPort}`)
    } catch (error) {
      logger.error(`Failed to start portal: ${describeError(error)}`)
      const wait = Math.min(config.reconnectDelayMs * Math.max(1, attempt + 1), 60_000)
      await delay(wait)
      this.starting = false
      return this.ensurePortal(attempt + 1)
    }

    this.starting = false
  }

  private schedulePortalRestart(): void {
    if (this.stopped || this.restartTimer || config.dryRun) return
    this.restartTimer = setTimeout(() => {
      this.restartTimer = null
      void this.ensurePortal().catch((error) => {
        logger.error(`Portal restart error: ${describeError(error)}`)
      })
    }, config.reconnectDelayMs)
  }

  private async teardownPortal(): Promise<void> {
    const portal = this.portal
    this.portal = null
    if (!portal) return
    try {
      await (portal as any).end?.()
    } catch {}
  }
}
