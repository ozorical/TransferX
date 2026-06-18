import { BedrockPortal, joinability, type BedrockPortalInstance } from './externals.js'
import { config, portalAuthflow } from './config.js'
import { logger } from './logger.js'
import { describeError } from './util.js'
import type { XboxProfile } from './xboxProfile.js'
import type { DiscordWebhook } from './discordWebhook.js'

export class InviteManager {
  private portal: BedrockPortalInstance | null = null
  private readonly invited = new Set<string>()

  constructor(
    private readonly profile: XboxProfile,
    private readonly webhook: DiscordWebhook,
    private readonly blocked: Set<string>,
  ) {}

  async start(): Promise<void> {
    if (config.dryRun) {
      logger.warn('Dry run: portal disabled, invites are logged only')
      return
    }

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
    })

    try {
      await portal.start()
    } catch (error) {
      logger.error(`Failed to start portal: ${describeError(error)}`)
      throw error
    }
    this.portal = portal
    logger.success(`Portal live: routing to ${config.serverHost}:${config.serverPort}`)
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
      return
    }

    try {
      await this.portal.invitePlayer(xuid)
      logger.success(`Invited ${gamertag} -> ${config.serverHost}:${config.serverPort}`)
    } catch (error) {
      this.invited.delete(xuid)
      logger.error(`Failed to invite ${gamertag}: ${describeError(error)}`)
    }
  }
}
