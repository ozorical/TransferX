import { logger } from './logger.js'
import { describeError } from './util.js'

export class DiscordWebhook {
  private announced = false

  constructor(private readonly url: string) {}

  async announcePlayerJoin(gamertag: string, xuid: string): Promise<void> {
    if (!this.enabled) return

    const relativeTime = Math.floor(Date.now() / 1000)
    await this.post({
      embeds: [
        {
          title: '<a:connected:1475299274249207999> Player joined relay session',
          color: 0x57f287,
          description: [
            `<:reply:1490081334540894489> <:platform_bedrock:1442155196296855632> **Gamertag** ${gamertag}`,
            `<:reply:1490081334540894489> <:mc_check:1466634463361503537> **XUID** ${xuid}`,
            `<:replyend:1490081355890163864> **Time** <t:${relativeTime}:R>`,
          ].join('\n'),
        },
      ],
    })
  }

  private get enabled(): boolean {
    return this.url.length > 0
  }

  private async post(body: unknown): Promise<void> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!response.ok) logger.error(`Webhook failed [${response.status}]: ${await response.text()}`)
    } catch (error) {
      logger.error(`Webhook error: ${describeError(error)}`)
    }
  }
}
