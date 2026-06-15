import { createRequire } from 'module'

const requireModule = createRequire(import.meta.url)

export interface XboxToken {
  userHash: string
  XSTSToken: string
  userXUID: string
}

export interface Authflow {
  getXboxToken(relyingParty?: string): Promise<XboxToken>
  getMinecraftBedrockServicesToken(options: { version: string }): Promise<{ mcToken: string }>
}

interface AuthflowConstructor {
  new (username: string, cache: string, options: Record<string, unknown>): Authflow
}

interface PrismarineAuthModule {
  Authflow: AuthflowConstructor
  Titles: Record<string, string>
}

const prismarineAuth = requireModule('prismarine-auth') as PrismarineAuthModule

export const Authflow: AuthflowConstructor = prismarineAuth.Authflow
export const titles: Record<string, string> = prismarineAuth.Titles

export interface RealmInfo {
  id: number
  name: string
  players?: Array<{ uuid: string; online: boolean }>
}

export interface RealmJoinInfo {
  networkProtocol: string
  address: string
}

export interface RealmRest {
  get<T = unknown>(path: string): Promise<T>
}

export interface RealmApi {
  getRealm(realmId: string): Promise<RealmInfo>
  rest: RealmRest
}

interface RealmApiFactory {
  from(authflow: Authflow, platform: 'bedrock' | 'java', options: { minecraftVersion: string }): RealmApi
}

interface PrismarineRealmsModule {
  RealmAPI: RealmApiFactory
}

const prismarineRealms = requireModule('prismarine-realms') as PrismarineRealmsModule

export const realmApiFactory: RealmApiFactory = prismarineRealms.RealmAPI

export interface PortalPlayer {
  profile?: { gamertag?: string; xuid?: string }
  xuid?: string
}

export interface PortalWorld {
  hostName: string
  name: string
  version: string
}

export interface BedrockPortalOptions {
  host: Authflow
  ip: string
  port: number
  joinability: string
  world: PortalWorld
}

export interface BedrockPortalInstance {
  start(): Promise<void>
  invitePlayer(identifier: string): Promise<void>
  on(event: 'playerJoin', listener: (player: PortalPlayer) => void): void
}

interface BedrockPortalConstructor {
  new (options: BedrockPortalOptions): BedrockPortalInstance
}

interface JoinabilityValues {
  InviteOnly: string
  FriendsOnly: string
  FriendsOfFriends: string
}

interface BedrockPortalModule {
  BedrockPortal: BedrockPortalConstructor
  Joinability: JoinabilityValues
}

const bedrockPortal = requireModule('bedrock-portal') as BedrockPortalModule

export const BedrockPortal: BedrockPortalConstructor = bedrockPortal.BedrockPortal
export const joinability: JoinabilityValues = bedrockPortal.Joinability

export interface DetectorClientOptions {
  transport: 'NETHERNET_JSONRPC'
  networkId: string
  authflow: Authflow
  version: string
  protocolVersion: number
}

export interface DetectorClient {
  on(event: string, listener: (...args: any[]) => void): void
  close(): void
}

interface BedrockxModule {
  createClient(options: DetectorClientOptions): DetectorClient
}

const bedrockx = requireModule('bedrockx') as BedrockxModule

export const createDetectorClient = (options: DetectorClientOptions): DetectorClient => bedrockx.createClient(options)
