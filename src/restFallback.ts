import { config } from './config.js'
import { logger } from './logger.js'
import { delay, describeError } from './util.js'
import type { RealmApi } from './externals.js'
import type { InviteManager } from './inviteManager.js'

interface RealmPlayer {
  uuid: string
  online: boolean
}

export class RestFallback {
  private timer: NodeJS.Timeout | null = null

  constructor(
    private readonly realmApi: RealmApi,
    private readonly selfXuid: string,
    private readonly invites: InviteManager,
  ) {}

  start(): void {
    if (this.timer) return
    logger.warn(`REST fallback engaged (polling every ${config.fallbackPollIntervalMs / 1000}s)`)
    this.timer = setInterval(() => {
      void this.poll().catch((error) => logger.error(`Fallback tick error: ${describeError(error)}`))
    }, config.fallbackPollIntervalMs)
    void this.poll().catch(() => {})
  }

  stop(): void {
    if (!this.timer) return
    clearInterval(this.timer)
    this.timer = null
    logger.success('In-game live, REST fallback disengaged')
  }

  private async poll(attempt = 0): Promise<void> {
    let players: RealmPlayer[]
    try {
      const realm = await this.realmApi.getRealm(config.realmId)
      players = realm.players ?? []
    } catch (error) {
      if (attempt < 3) {
        await delay(2000)
        return this.poll(attempt + 1)
      }
      throw error
    }

    const online = new Set<string>()
    for (const player of players) {
      if (!player.online) continue
      const xuid = String(player.uuid)
      if (xuid === this.selfXuid) continue
      online.add(xuid)
      if (!this.invites.has(xuid)) void this.invites.invite(xuid)
    }
    this.invites.dropAbsent(online)
  }
}
