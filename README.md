# remote-torrent-adder
A handy Chrome extension to add torrent files to torrent clients.

## What is this about?
The Chrome Web Browser - albeit an excellent browsing tool - does not permit its extensions a lot of access into its functionality. Hence, an extension that would download a .torrent file and automatically open it in the user's BitTorrent client locally can't be easily implemented. *Remote Torrent Adder* utilizes the WebUIs of modern BitTorrent clients to implement the functionality required for this scenario - and it works locally as well as for BitTorrent clients on other machines!

It supports the following BitTorrent clients:
  * Bigly/Vuze (through plugins: Vuze Remote, SwingUI, HTML WebUI)
  * uTorrent (including uTorrent Server, uTorrent for Mac and newer Buffalo Linkstations)
  * Transmission
  * Deluge
  * qBittorrent
  * rtorrent (ruTorrent, pyrt, NodeJS-rTorrent, flood(&-jesec), direct XMLRPC interface)
  * Torrentflux
  * Buffalo built-in torrent client
  * Tixati
  * Hadouken
  * Synology Downloadstation
  * QNAP DownloadStation
  * tTorrent (Android)
  * KODI Elementum (ex Quasar, ex Pulsar) 


## How do i get it running?
To get this set up, follow these steps:

1. Get the extension added to your Chrome Browser by visiting https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci.
2. Open the extension's options through Chrome's wrench menu and set your server's info
3. If just clicking a link doesn't add the torrent to your client, but downloads it locally to your disk, also look at the "Link Catching" tab in the settings page and consult this project's wiki for a short tutorial on how to fix it.
