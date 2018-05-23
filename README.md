# remote-torrent-adder
A handy Chrome extension to add torrent files to torrent clients.

## What is this about?
The Chrome Web Browser - albeit an excellent browsing tool - does not permit its extensions a lot of access into its functionality. Hence, an extension that would download a .torrent file and automatically open it in the user's BitTorrent client locally can't be easily implemented. *Remote Torrent Adder* utilizes the WebUIs of modern BitTorrent clients to implement the functionality required for this scenario - and it works locally as well as for BitTorrent clients on other machines!

It supports the following BitTorrent clients:
  * Vuze (through plugins: Vuze Remote, SwingUI, HTML WebUI)
  * uTorrent (including uTorrent Server, uTorrent for Mac and newer Buffalo Linkstations)
  * Transmission
  * Deluge
  * qBittorrent
  * rtorrent (ruTorrent, pyrt, NodeJS-rTorrent, flood)
  * Torrentflux
  * Buffalo built-in torrent client
  * Tixati
  * Hadouken
  * Synology Downloadstation
  * QNAP DownloadStation


## How do i get it running?
Given that this is a fork, it does not exist on chrome's extension store, you have to do it like this:
1. Download the source - Either via the web/download utility or via git
2. Unzip
3. Go to extensions in chrome/chromium-like browser 
4. Enable Developer mode 
5. Then there should be: "Load unpacked extension" - Click that and locate your extension folder

It should now be loaded.
