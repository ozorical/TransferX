import {
  createDetectorClient,
  type Authflow,
  type DetectorClient,
  type RealmApi,
  type RealmJoinInfo,
} from './externals.js'
import { config } from './config.js'
import { logger } from './logger.js'
import { describeError } from './util.js'
import type { InviteManager } from './inviteManager.js'

interface PlayerListRecord {
  uuid?: string
  username?: string
  xbox_user_id?: string
}

interface PlayerListPacket {
  records?: {
    type?: string
    records?: PlayerListRecord[]
  }
}

interface PlayStatusPacket {
  status?: string
}

interface KickPacket {
  reason?: string
  message?: string
}

export interface DetectorHooks {
  onLive: () => void
  onDown: () => void
}

export class InGameDetector {
  private client: DetectorClient | null = null
  private spawned = false
  private downHandled = false
  private stopped = false
  private reconnectTimer: NodeJS.Timeout | null = null
  private readonly uuidToXuid = new Map<string, string>()

  constructor(
    private readonly realmApi: RealmApi,
    private readonly authflow: Authflow,
    private readonly selfXuid: string,
    private readonly invites: InviteManager,
    private readonly hooks: DetectorHooks,
  ) {}

  async connect(): Promise<void> {
    let networkId: string
    try {
      const join = await this.realmApi.rest.get<RealmJoinInfo>(`/worlds/${config.realmId}/join`)
      if (join.networkProtocol !== 'NETHERNET_JSONRPC') {
        logger.error(`Unexpected realm transport ${join.networkProtocol}, staying on REST fallback`)
        this.hooks.onDown()
        return
      }
      networkId = join.address
    } catch (error) {
      logger.error(`Realm join lookup failed: ${describeError(error)}`)
      this.fail()
      return
    }

    logger.warn(`Joining realm in-game (networkId ${networkId})`)
    this.downHandled = false
    this.spawned = false

    let client: DetectorClient
    try {
      client = createDetectorClient({
        transport: 'NETHERNET_JSONRPC',
        networkId,
        authflow: this.authflow,
        version: config.minecraftVersion,
        protocolVersion: config.protocolVersion,
      })
    } catch (error) {
      logger.error(`In-game connect failed: ${describeError(error)}`)
      this.fail()
      return
    }

    this.client = client
    logger.info(`Realm client connected (networkId ${networkId})`)
    client.on('error', () => {})
    client.on('player_list', (packet: PlayerListPacket) => this.handlePlayerList(packet))
    client.on('start_game', () => {
      this.spawned = true
      logger.success('In-game: spawned in realm, detecting players live')
      this.hooks.onLive()
    })
    client.on('play_status', (packet: PlayStatusPacket) => {
      if (packet?.status === 'not_allowed') logger.error('Realm rejected the in-game account (not_allowed)')
    })
    client.on('kick', (packet: KickPacket) => {
      logger.error(`In-game kicked: ${packet?.reason ?? packet?.message ?? ''}`)
      this.handleDown()
    })
    client.on('close', () => this.handleDown())
  }

  stop(): void {
    this.stopped = true
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer)
    this.reconnectTimer = null
    this.closeClient()
  }

  private handlePlayerList(packet: PlayerListPacket): void {
    const action = packet.records?.type
    for (const record of packet.records?.records ?? []) {
      if (action === 'add') {
        const xuid = String(record.xbox_user_id ?? '')
        if (!xuid || xuid === '0') continue
        if (record.uuid) this.uuidToXuid.set(record.uuid, xuid)
        if (xuid === this.selfXuid) continue
        void this.invites.invite(xuid, record.username)
      } else if (action === 'remove' && record.uuid) {
        const xuid = this.uuidToXuid.get(record.uuid)
        if (!xuid) continue
        this.uuidToXuid.delete(record.uuid)
        this.invites.forget(xuid)
      }
    }
  }

  private handleDown(): void {
    if (this.downHandled) return
    this.downHandled = true
    if (this.spawned) logger.warn('In-game connection lost, falling back to REST polling')
    this.spawned = false
    this.closeClient()
    this.uuidToXuid.clear()
    this.hooks.onDown()
    this.scheduleReconnect()
  }

  private fail(): void {
    this.hooks.onDown()
    this.scheduleReconnect()
  }

  private scheduleReconnect(): void {
    if (this.stopped || this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      void this.connect().catch((error) => {
        logger.error(`Reconnect error: ${describeError(error)}`)
        this.fail()
      })
    }, config.reconnectDelayMs)
  }

  private closeClient(): void {
    try {
      this.client?.close()
    } catch {}
    this.client = null
  }
}
