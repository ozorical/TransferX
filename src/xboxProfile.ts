import type { Authflow } from './externals.js'

interface ProfileSetting {
  id: string
  value: string
}

interface ProfileResponse {
  profileUsers?: Array<{ settings?: ProfileSetting[] }>
}

const headerLifetimeMs = 55 * 60 * 1000

export class XboxProfile {
  private cachedHeader: string | null = null
  private headerExpiry = 0
  private readonly gamertagCache = new Map<string, string>()

  constructor(private readonly authflow: Authflow) {}

  async gamertagFor(xuid: string): Promise<string> {
    const cached = this.gamertagCache.get(xuid)
    if (cached) return cached

    try {
      const response = await fetch(
        `https://profile.xboxlive.com/users/xuid(${xuid})/profile/settings?settings=Gamertag`,
        { headers: { Authorization: await this.authorizationHeader(), 'x-xbl-contract-version': '3' } },
      )
      if (!response.ok) throw new Error(String(response.status))

      const data = (await response.json()) as ProfileResponse
      const gamertag = data.profileUsers?.[0]?.settings?.find((setting) => setting.id === 'Gamertag')?.value
      if (gamertag) this.gamertagCache.set(xuid, gamertag)
      return gamertag ?? xuid
    } catch {
      return xuid
    }
  }

  private async authorizationHeader(): Promise<string> {
    if (this.cachedHeader && Date.now() < this.headerExpiry) return this.cachedHeader

    const { userHash, XSTSToken } = await this.authflow.getXboxToken('http://xboxlive.com')
    this.cachedHeader = `XBL3.0 x=${userHash};${XSTSToken}`
    this.headerExpiry = Date.now() + headerLifetimeMs
    return this.cachedHeader
  }
}
