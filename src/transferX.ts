import { realmApiFactory, type RealmApi } from './externals.js'
import { config, detectorAuthflow, portalAuthflow } from './config.js'
import { logger } from './logger.js'
import { XboxProfile } from './xboxProfile.js'
import { DiscordWebhook } from './discordWebhook.js'
import { InviteManager } from './inviteManager.js'
import { InGameDetector } from './inGameDetector.js'
import { RestFallback } from './restFallback.js'

export class TransferX {
  private readonly realmApi: RealmApi
  private readonly webhook: DiscordWebhook
  private invites: InviteManager | null = null
  private detector: InGameDetector | null = null
  private fallback: RestFallback | null = null

  constructor() {
    this.realmApi = realmApiFactory.from(detectorAuthflow, 'bedrock', { minecraftVersion: config.minecraftVersion })
    this.webhook = new DiscordWebhook(config.discordWebhookUrl)
  }

  async start(): Promise<void> {
    logger.info('Authenticating')
    const detectorXuid = String((await detectorAuthflow.getXboxToken('http://xboxlive.com')).userXUID)
    const portalXuid = String((await portalAuthflow.getXboxToken('http://xboxlive.com')).userXUID)
    logger.success(`In-game detector account XUID ${detectorXuid}${config.dryRun ? ' (dry run)' : ''}`)

    const invites = new InviteManager(
      new XboxProfile(portalAuthflow),
      this.webhook,
      new Set([detectorXuid, portalXuid]),
    )
    this.invites = invites
    await invites.start()
    if (!config.dryRun) void this.webhook.announceStartup()

    const fallback = new RestFallback(this.realmApi, detectorXuid, invites)
    this.fallback = fallback
    this.detector = new InGameDetector(this.realmApi, detectorAuthflow, detectorXuid, invites, {
      onLive: () => fallback.stop(),
      onDown: () => fallback.start(),
    })

    await this.detector.connect()
  }

  async stop(): Promise<void> {
    this.detector?.stop()
    this.fallback?.stop()
    await this.invites?.stop()
  }
}
