# OpenInventory JSON (local fork)

A JSON-only fork of [OpenInventory](https://github.com/8liam/OpenInventory), based on commit 1e3f48d992c0865ffc526a303ea2cb2ed063c5af. Keeps its dashboard, item table, portfolio selector and marketplace pricing. Steam sign-in, Game Coordinator connections, transfers, renames and Terminal actions are unavailable. Upstream license and attribution are retained; this project remains noncommercial.

## Run locally

Node 24+ and pnpm are required:

```sh
pnpm install --frozen-lockfile --ignore-scripts
pnpm exec tsc -b
pnpm exec vp build
pnpm api
```

Open http://127.0.0.1:4174. The server automatically serves the built `dist` directory. Data defaults to `~/.openinventory-json`. For development use `pnpm dev` in another terminal. Docker builds the UI automatically: `docker compose up --build -d`, then open http://127.0.0.1:3000. The checked-in port mapping is loopback-only; use a strong `OPENINVENTORY_PASSWORD` for shared access.

## Import inventory

Choose a portfolio name and one or more raw Steam app 730 inventory JSON response files. A file containing an ordered array of pages also works. Filenames sort numerically. Complete context 2 and context 16 exports are supported. To export, open `https://steamcommunity.com/inventory/YOUR_STEAMID/730/2?l=english&count=2000` in your own browser signed into Steam and save the response. If `more_items` is 1, append `&start_assetid=LAST_ASSETID` and save each next page until `more_items` is 0.

Use the same portfolio name to replace its latest inventory, or a different name for another one. Replacing from an existing portfolio dialog keeps that portfolio's identity. Counts, pagination, duplicate assets, descriptions, game/context and quantities are validated before existing data is replaced. Limits: 100 pages, 20 MiB combined request, 20,000 item units. Arrays with large quantities expand to individual item units to preserve the upstream dashboard's counting model.

Only normalized item fields are stored in the local SQLite cache, under `~/.openinventory-json` by default (or the dedicated Docker volume). Raw imports, cookies and Steam session files are not saved or read. Portfolio IDs are local synthetic identifiers, not verified SteamIDs. Items persist after restarts. Prices come from public CSGOTrader marketplace feeds and may differ from Steam lowest asks; currency and marketplace remain configurable. Unpriced items are shown without a price and excluded from totals. History preserves missing prices as null and marks incomplete coverage; totals include known prices only.

Standard exports do not prove ownership or export age and generally omit storage-unit contents, exact floats, paint seeds and some attachment metadata. Import a fresh export after holdings change; price refresh does not update quantities.

## Historical inventories

Each successful import preserves a normalized inventory version. New value-history points save the exact item rows, quantities, notes and available prices used for that valuation. A new import can create a point immediately even within the hourly interval; background valuations of unchanged holdings remain hourly while the server runs. Items without market prices stay in snapshots with null prices. The chart selector, tooltip and value summary mark incomplete coverage; totals include known prices only.

Choose a portfolio, then click a saved graph point or use the **Inventory value over time** selector to open its historical dashboard and Items view. **Return to latest inventory** exits without overwriting the latest import. The chosen point is remembered in this browser separately for each portfolio, currency and marketplace, including after switching profiles or reloading. Importing an updated inventory returns that portfolio to its latest view. Refresh is disabled while viewing history.

Historical rows are local SQLite data and survive restarts. Value snapshots and their item payloads follow the existing 730-day retention; normalized import versions are retained separately. Existing totals-only points and the live preview cannot restore items because they never saved them. The combined all-portfolios chart shows totals only; choose an individual portfolio for restoration. History records observed valuations from the time this app saved them; it cannot reconstruct holdings before an import.

Do not upload cookies, HAR archives or copied cURL commands. Existing Steam account session folders are not migrated. Upstream desktop auto-updates are disabled to prevent this fork reverting to the login-based app.

## Validation

`pnpm exec tsc -b`, `pnpm test`, and `pnpm exec vp build`.

---

## Upstream documentation (historical; live Steam features below do not apply to this fork)

<p align="center">
  <img src="public/logo.svg" alt="OpenInventory logo" width="120" height="120" />
</p>

<h1 align="center">OpenInventory</h1>

<table>
  <tr>
    <td align="center"><a href="docs/dashboard.png"><img src="docs/dashboard.png" alt="Dashboard" width="280" /></a><br /><sub>Dashboard</sub></td>
    <td align="center"><a href="docs/items.png"><img src="docs/items.png" alt="Items" width="280" /></a><br /><sub>Items</sub></td>
    <td align="center"><a href="docs/storage-units.png"><img src="docs/storage-units.png" alt="Storage units" width="280" /></a><br /><sub>Storage units</sub></td>
  </tr>
  <tr>
    <td align="center"><a href="docs/cases.png"><img src="docs/cases.png" alt="Case openings" width="280" /></a><br /><sub>Case openings</sub></td>
    <td align="center"><a href="docs/tradeup.png"><img src="docs/tradeup.png" alt="Trade-up" width="280" /></a><br /><sub>Trade-up</sub></td>
  </tr>
</table>

Self-hosted CS2 inventory and storage unit tracker. Sign in with the Steam mobile app (add as many accounts as you like) and OpenInventory shows what you own, where it is, and what it's worth, with history that builds up over time. Everything is cached in a local SQLite file on your own server. OpenInventory talks to Steam (with your login), fetches public item data and Skinport prices, and your browser loads item images from Steam's CDN.

- **Dashboard**: total value with 24h/7d/30d change, a value history chart you can switch between total, inventory and storage units over 1D to all time, a tabbed breakdown (type, rarity, wear, location) as a donut, top holdings, and your lowest floats, highest floats and largest stacks.
- **Exports**: download item data and value history as CSV or JSON.
- **Items**: every item across your inventory and all storage units, searchable and filterable, with images, floats, stickers, charms (with pattern ids) and prices.
- **Storage units**: all units load automatically; contents are cached so restarts are instant. Capacity (1,000 items) is checked before a move starts.
- **Cases**: case, souvenir, capsule, trade-up and drop stats read from your Steam inventory history: rarity split, rarest pulls, most opened, per-month volume, and your gold drought. History is synced in the background and stored locally.
- **Trade-up finder**: compare read-only EV estimates for ranked contracts from your holdings, with collection odds and float-aware outcomes. OpenInventory can't perform trade-ups.

- **Terminals**: the Terminals page lists your sealed and active Terminals. Browsing an active Terminal's current offer (the item, what the Terminal charges and its market value) is read-only. Two actions are **destructive and irreversible**, and OpenInventory makes an exception to its read-only rule for them: **activating** a sealed Terminal (it is used up and its expiry timer starts, and an active Terminal can't be traded or moved) and asking for the **next offer** (you can't go back to the offer you were on). Each sits behind a confirmation dialog that spells out the effects and needs a tick box. OpenInventory never buys anything from a Terminal.
- **Multiple accounts**: add accounts with a QR login each and switch between them in the sidebar, or pick **All accounts** on the Dashboard and Items for combined value, history and items (with an account column and filters by account or label). Searching Items in the combined view finds a skin across every account, showing which account and storage unit holds it and its float. Tag accounts as main, trade or alt in Settings. Each account has its own Game Coordinator connection, opened only when you use the account (the first account connects at start so value history keeps recording). Moves, renames and Terminal actions always act on one explicit account.
- **Move items**: select items on the Items or Storage page and move them between your inventory and storage units (unit to unit goes through your inventory). Each move is confirmed by the Game Coordinator, with live progress, cancel, and a per-item error report. Nothing is ever listed or traded. Apart from moves, renaming storage units and activating Terminals (above), OpenInventory is read-only.

## Desktop app

Download the installer for your OS from the [latest release](https://github.com/8liam/OpenInventory/releases/latest): Windows (`.exe`), macOS (`.dmg`) or Linux (`.AppImage`). The app updates itself on Windows and Linux; on macOS it tells you when a new version is out and links to the download.

The builds aren't code-signed (no paid certificates), so the first launch shows a warning: on Windows choose **More info → Run anyway**; on macOS right-click the app and choose **Open** (or run `xattr -cr /Applications/OpenInventory.app`). Every release is built by [GitHub Actions](.github/workflows/release.yml) straight from `main`, so you can verify what you download.

## Run with Docker

```sh
docker compose up -d
```

Open <http://localhost:3000>, press **Show QR code**, and scan it in the Steam mobile app.

Set a password if the port is reachable by anyone but you (the browser will ask for any username plus this password):

```sh
OPENINVENTORY_PASSWORD='something-long' docker compose up -d
```

Without a password, OpenInventory only answers to IPs and local names (`localhost`, `nas`, `nas.local`, `*.ts.net`, ...). To open it by another name, such as a `.lan` name or a domain behind a reverse proxy, list it (no port needed):

```sh
OPENINVENTORY_ALLOWED_HOSTS='nas.lan,inventory.example.com' docker compose up -d
```

Data (SQLite database, value history and your Steam session) lives in the `openinventory-data` volume.

> **Heads up:** OpenInventory connects to the CS2 Game Coordinator the way the game does, and Steam allows one game session per account. If CS2 is already running elsewhere, OpenInventory waits (it never forces the session) and connects when you close the game. If you launch CS2 while OpenInventory is connected, Steam asks whether to end OpenInventory's session; it reconnects once you're done.

### Configuration

| Variable                      | Default                                         | Purpose                                                                                                                                                                                                                                                                                      |
| ----------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OPENINVENTORY_PASSWORD`      | unset                                           | Require HTTP basic auth (any username). Unset means no auth.                                                                                                                                                                                                                                 |
| `OPENINVENTORY_PORT`          | `3000` in Docker, `4174` otherwise              | Listen port.                                                                                                                                                                                                                                                                                 |
| `OPENINVENTORY_HOST`          | `0.0.0.0` in Docker, `127.0.0.1` otherwise      | Listen address.                                                                                                                                                                                                                                                                              |
| `OPENINVENTORY_DATA_DIR`      | `/data` in Docker, `~/.openinventory` otherwise | SQLite database and Steam session.                                                                                                                                                                                                                                                           |
| `OPENINVENTORY_WEB_DIR`       | set in Docker                                   | Built web app to serve. Unset in dev.                                                                                                                                                                                                                                                        |
| `OPENINVENTORY_ALLOWED_HOSTS` | unset                                           | Comma-separated hostnames accepted when no password is set (`nas.lan,.home.example`; a leading dot also matches subdomains). Needed only for names in public DNS or `.lan`; IPs, single-label names (`nas`), `localhost`, `*.local`, `*.home.arpa`, `*.internal` and `*.ts.net` always work. |

## One session per account

Steam allows a single client session per account, and OpenInventory signs in once per tracked account. If another OpenInventory (desktop app, Docker, another machine) or the Steam app is signed in to the same account, each takes the session from the other. OpenInventory stops and says so instead of retrying; close the other one, then press **Reconnect** on that account.

## Security

- Your Steam **refresh token** is stored per account in `sessions/<steamId>.json` inside the data directory (an older single `session.json` is moved there on first start) (mode `0600`). Anyone who can read it can act as your account until you remove that account in Settings, which deletes it. Protect the volume.
- Without `OPENINVENTORY_PASSWORD`, anyone who can reach the port can see your inventory **and move your items**. Set a password, and put OpenInventory behind a VPN or a TLS reverse proxy if you expose it.
- State-changing requests are same-origin only and require a JSON body, so another website can't drive your instance from your browser. Without a password the `Host` header must also be an IP, a single-label name, `localhost`, a `*.local`, `*.home.arpa`, `*.internal` or `*.ts.net` name, or listed in `OPENINVENTORY_ALLOWED_HOSTS`, which blocks DNS-rebinding attacks. Other names get a 403 that says which variable to set.

## Develop

Requires Node 24+ and pnpm 12 ([Vite+](https://viteplus.dev) provides `vp`).

```sh
pnpm install
pnpm api          # API on 127.0.0.1:4174 (SQLite in ~/.openinventory)
pnpm dev          # web on :5173, proxying /api
pnpm build        # type-check + production build into dist/
vp check          # format, lint and type-check
```

Stack: React 19, TanStack Router and Virtual, Tailwind 4, Zustand, Vite+. The server is plain Node with the built-in `node:sqlite`; Steam access uses `steam-session`, `steam-user` and `globaloffensive`.

## Data sources

- Item names, rarities and images: [ByMykel/CSGO-API](https://github.com/ByMykel/CSGO-API) (images are served from Steam's CDN).
- Prices: [CSGOTrader](https://prices.csgotrader.app) marketplace feeds (Buff163 by default; Skinport, Steam, CSFloat, CS.MONEY, Youpin898 and LIS-SKINS selectable in Settings), converted with its exchange rates. Items with no listing count as zero.
- Value history is recorded hourly while OpenInventory runs, for every currency you've viewed the dashboard in, starting from your first sign-in; there is no way to backfill it.

OpenInventory is not affiliated with or endorsed by Valve, Steam or Skinport.

## License

[PolyForm Noncommercial 1.0.0](LICENSE): you can use, modify, fork and share OpenInventory for any noncommercial purpose, but not sell it or use it commercially. That makes it source-available rather than OSI-approved open source. For commercial use, open an issue to ask.

## Repository layout

- `src/`, `server/`: the app.
- `site/`: the landing page (<https://openinventory.unsurf.sh>). It renders the real app UI on sample data; see [site/README.md](site/README.md).
