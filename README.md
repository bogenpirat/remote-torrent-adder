# remote-torrent-adder

A handy Chrome extension to add torrent files to torrent clients.

## What is this about?

The Chrome Web Browser - albeit an excellent browsing tool - does not permit its extensions a lot of access into its functionality. Hence, an extension that would download a .torrent file and automatically open it in the user's BitTorrent client locally can't be easily implemented. *Remote Torrent Adder* utilizes the WebUIs of modern BitTorrent clients to implement the functionality required for this scenario - and it works locally as well as for BitTorrent clients on other machines!

It supports the following BitTorrent clients:

- ruTorrent
- flood (jesec)
- qBittorrent (v5+)
- BiglyBT Web Remote (formerly Vuze (formerly Azureus))
- Deluge
- Elementum
- Transmission
- Porla (new!)
- Tixati
- QNAP DownloadStation

## How do i get it running?

To get this set up, follow these steps:

1. Get the extension added to your Chrome Browser by visiting <https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci>
2. Open the extension's options and set your server(s)'(s) info
3. If just clicking a link doesn't add the torrent to your client, but downloads it locally to your disk, also look at the "Link Catching" tab in the settings.

## Changes from RTA v1.x

With Chrome enforcing Manifest V3, a rewrite of the extension (RTA v2.x) resulted in various changes in terms of features.

### Ditched support for some old clients

- qbittorrent 4.x and older
- non-jesec flood
- torrentflux
- vuze swing ui & html ui (just use bigly's web remote)
- pyrt
- synology, QNAP, & buffalo - i don't have the hardware to test those so if anybody can support me in re-implementing them, hit me up
- nodeJSrTorrent, rtorrent XML-RPC
- µtorrent
- hadouken (the maintainer recommends porla)

### Features

- **link scan delay** is gone. actually no longer necessary since we now use a mutation observer that discovers dynamic changes to the page as they happen
- **context menu** is always generated instead of being togglable
- **new tab catching** is gone. not sure if that ever worked properly in the recent past, couldn't get it to work
- **address bar indicator** has not been a thing since like 2016? extension icon always exists anyway
