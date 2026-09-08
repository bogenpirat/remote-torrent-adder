<div align="center">

<img src="src/assets/icons/BitTorrent128.png" alt="Remote Torrent Adder logo" width="96" />

# Remote Torrent Adder

**Send torrents and magnet links from your browser straight to your BitTorrent client — local or remote — with a single click.**

[![Chrome Web Store](https://img.shields.io/chrome-web-store/v/oabphaconndgibllomdcjbfdghcmenci?label=Chrome%20Web%20Store&color=blue)](https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci)
[![Firefox Add-on](https://img.shields.io/amo/v/remote-torrent-adder%40bogenpirat?label=Firefox%20Add-on&color=orange)](https://addons.mozilla.org/firefox/addon/remote-torrent-adder/)
[![Users](https://img.shields.io/chrome-web-store/users/oabphaconndgibllomdcjbfdghcmenci)](https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci)
[![Rating](https://img.shields.io/chrome-web-store/rating/oabphaconndgibllomdcjbfdghcmenci)](https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci)
[![Build](https://github.com/bogenpirat/remote-torrent-adder/actions/workflows/build-extension.yml/badge.svg)](https://github.com/bogenpirat/remote-torrent-adder/actions/workflows/build-extension.yml)

[Install](#-installation) · [Features](#-features) · [Supported clients](#-supported-clients) · [Build from source](#-building-from-source) · [Contributing](#-contributing)

</div>

---

## 🤔 What is this?

Chrome doesn't let extensions hand a downloaded `.torrent` file over to a desktop application. *Remote Torrent Adder* (RTA) works around this by talking directly to the **WebUI of your BitTorrent client**: click a torrent or magnet link, and RTA uploads it to your client's web API instead of saving a file to disk. Because everything happens over HTTP(S), it works just as well with a client running on your own machine as with one on a seedbox, NAS, or home server on the other side of the world.

## ✨ Features

- 🖱️ **One-click adding** — torrent and magnet links are caught as you click them and sent straight to your client
- 🔗 **Smart link catching** — a mutation observer picks up dynamically added links as they appear, and custom regexes let you tune exactly which links get caught
- 🖥️ **Multiple servers** — configure as many clients/servers as you like and pick the target per link via the right-click context menu
- 🏷️ **Labels & download directories** — set defaults per server, choose per torrent in a popup, or let **auto-rules assign a label/directory based on the torrent's tracker URL or the files inside it**, and test those rules right in the options page by dropping a .torrent file or pasting a magnet link
- ⏸️ **Add paused** — optionally add torrents in a stopped state
- 🔐 **Authentication & HTTPS** — username/password auth and secure connections supported for all clients
- 🔔 **Rich notifications** — success/failure notifications with configurable duration and **custom notification sounds**
- 📦 **Import/export** — back up and restore your complete configuration as a file
- ⚡ **Manifest V3** — built for Chrome's current extension platform, with a modern React-based settings UI
- 🦊 **Chrome and Firefox** — one codebase, identical features on both

## 🧩 Supported clients

| Client | Notes |
|---|---|
| [qBittorrent](https://www.qbittorrent.org/) | v5+ |
| [ruTorrent](https://github.com/Novik/ruTorrent) | |
| [Transmission](https://transmissionbt.com/) | |
| [Deluge](https://deluge-torrent.org/) | |
| [flood](https://github.com/jesec/flood) | jesec's flood |
| [BiglyBT](https://www.biglybt.com/) | via Web Remote (formerly Vuze/Azureus) |
| [Porla](https://porla.org/) | |
| [Tixati](https://www.tixati.com/) | |
| [Elementum](https://elementum.surge.sh/) | Kodi add-on |
| [rqbit](https://github.com/ikatson/rqbit) | |
| [tTorrent](https://ttorrent.org/) | Android |
| QNAP Download Station | |
| [Synology Download Station](https://www.synology.com/en-global/dsm/packages/DownloadStation) | DSM 6 & 7; no 2FA yet |

Missing your client? [Open an issue](https://github.com/bogenpirat/remote-torrent-adder/issues) — or better yet, [add it yourself](#-contributing); client integrations are small, self-contained classes.

## 🚀 Installation

1. **Chrome** — install from the [Chrome Web Store](https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci).

   **Firefox** — needs **Firefox 149 or newer**. Download the signed `.xpi` from the
   [latest release](https://github.com/bogenpirat/remote-torrent-adder/releases/latest), then
   install it from `about:addons` → the gear icon → **Install Add-on From File**. It updates
   itself from this repository. You can also [build it from source](#-building-from-source).
2. Open the extension's **options** and add your server(s): client type, host, port, credentials
3. Click a torrent link — done!

> [!TIP]
> If clicking a link downloads the `.torrent` file to disk instead of adding it to your client, check the **Link Catching** tab in the settings and adjust the catching patterns for the site you're using.

## 🛠️ Building from source

You'll need a recent version of [Node.js](https://nodejs.org/) and npm.

```bash
git clone https://github.com/bogenpirat/remote-torrent-adder.git
cd remote-torrent-adder
npm install

npm run build            # development build  → dist/chrome/
npm run build:prod       # production build   → dist-prod/chrome/
npm run build:firefox    # Firefox dev build   → dist/firefox/
npm run build:all        # every bundle, incl. the self-hosted Firefox one
```

Tests run automatically before every build; you can also run them directly:

```bash
npm test             # run the test suite once
npm run test:watch   # watch mode
npm run test:coverage
```

To load your build into Chrome:

1. Open `chrome://extensions/`
2. Enable **Developer mode** (top right)
3. Click **Load unpacked** and select the `dist/chrome/` (or `dist-prod/chrome/`) folder

To load your build into Firefox, either run `npm run dev:firefox`, which launches a
scratch Firefox profile with the add-on already installed, or load it by hand:

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…** and pick `dist/firefox/manifest.json`

A temporary add-on is gone on restart. Release Firefox refuses to install an
unsigned `.xpi` permanently, so a persistent local install needs Firefox
Developer Edition or Nightly with `xpinstall.signatures.required` set to `false` —
or the signed `.xpi` from the [latest release](https://github.com/bogenpirat/remote-torrent-adder/releases/latest).

For iterating on the extension, `npm run dev` builds once and then rebuilds on every source change — just hit the reload button on the extension card in `chrome://extensions/` to pick up changes.

## 🏗️ Tech stack

- **TypeScript** throughout, strict mode on
- **React + Tailwind CSS** for the options page and per-torrent popup
- **Vite** for all five bundles — the popup, options and notifications pages, plus the service worker and content script as standalone IIFE files
- **One codebase, two browsers** — `scripts/generate-manifest.mjs` derives the Firefox manifest from the Chrome one, and a build-time constant folds away the branches that do not apply
- **Vitest** for the unit suite, **Playwright** for Chrome end-to-end tests and **geckodriver** for the Firefox ones
- Version-driven release pipeline that auto-deploys to the Chrome Web Store and addons.mozilla.org, and attaches a signed `.xpi` to every GitHub release

## 🤝 Contributing

Bug reports, feature requests, and pull requests are welcome!

- **Adding a client**: each client is a single class in [`src/webuis/`](src/webuis/) extending `TorrentWebUI` and registered in [`src/models/clients.ts`](src/models/clients.ts) — existing implementations make great templates
- **Found a bug?** [Open an issue](https://github.com/bogenpirat/remote-torrent-adder/issues) with your client, its version, and what happened

<details>
<summary><h2>📜 Changes from RTA v1.x</h2></summary>

With Chrome enforcing Manifest V3, the extension was rewritten from scratch (RTA v2.x), which changed a few things.

### Dropped clients

- qBittorrent 4.x and older
- non-jesec flood
- TorrentFlux
- Vuze Swing UI & HTML UI (use BiglyBT's Web Remote instead)
- pyrT
- Synology & Buffalo — no hardware to test against; if you can help re-implement them, get in touch
- nodeJS-rTorrent, rTorrent XML-RPC
- µTorrent
- Hadouken (its maintainer recommends Porla)

### Changed features

- **Link scan delay** is gone — no longer necessary since a mutation observer now discovers dynamic page changes as they happen
- **Context menu** is always generated instead of being togglable
- **New tab catching** is gone — it hadn't worked reliably in a long time
- **Address bar indicator** has been obsolete since ~2016; the extension icon is always available anyway

</details>
