# TransferX

TransferX sits inside a Minecraft Bedrock **realm** as a live player, detects players the moment they join, and invites them to a server of your choice through a BedrockPortal session. If the in-game connection drops it falls back to polling the Realms REST API, so detection never fully stops.

It works with **any Bedrock realm** you have access to — the `play.crabsmp.net` values are just the defaults and can be changed entirely through environment variables.

## How it works

One account joins the realm in-game over Nethernet (via [BedrockX](https://github.com/thejfkvis/BedrockX)) and reads `player_list` packets in real time. Every detected player is invited through a BedrockPortal session hosted by a second account. When the in-game link is unavailable, REST polling takes over until it reconnects.

Two accounts are used:

| Role | Requirements |
| --- | --- |
| In-game detector | Must own Minecraft Bedrock and be able to join the target realm (member, multiplayer enabled). A realm owner account works well. |
| Portal host | Hosts the redirect session and sends the invites. Does not need to be a realm member. |

> The in-game account must actually be allowed to join the realm. Accounts without a game entitlement or with multiplayer disabled are rejected by the realm at login (`not_allowed`).

## Setup

1. `npm install`
2. Copy `.env.example` to `.env` and fill in your values (see below).
3. Sign both accounts in once via the device-code flow so the `auth-cache` and `auth-cache-realm` folders get populated. Running any command and following the prompted Microsoft login URL is enough.

## Configuration

All configuration is read from `.env` (loaded automatically). Defaults are shown.

| Variable | Default | Description |
| --- | --- | --- |
| `DISCORD_WEBHOOK_URL` | _(empty)_ | Optional Discord webhook for join/activation notifications. Leave empty to disable. |
| `REALM_ID` | `00000000` | The numeric id of the realm to listen on. |
| `SERVER_HOST` | `play.crabsmp.net` | Host that invited players are redirected to. |
| `SERVER_PORT` | `19132` | Port of the redirect target. |
| `PORTAL_WORLD_NAME` | `CrabSMP` | Name shown for the portal session in the invite. |
| `DRY_RUN` | `0` | Set to `1` to detect players and log invites without hosting the portal or sending anything. |

To point TransferX at a different realm and server, set `REALM_ID`, `SERVER_HOST`, `SERVER_PORT`, and `PORTAL_WORLD_NAME` to your own values.

## Commands

| Command | Description |
| --- | --- |
| `npm run build` | Compile `src` to `dist` |
| `npm start` | Run the compiled listener |
| `npm run dev` | Run from source with tsx |
| `npm run typecheck` | Type-check without emitting |
| `./start.sh` | Build, then run with automatic restart |

## Notes

- Targets Minecraft Bedrock `1.26.20` (the protocol version bundled by BedrockX). Realms on a different version require a matching BedrockX build.
- The two account token caches (`auth-cache`, `auth-cache-realm`) and your `.env` are git-ignored and never published.

## License

MIT — see [LICENSE](LICENSE).
