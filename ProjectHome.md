# What is this about? #
The Chrome Web Browser - albeit an excellent browsing tool - does not permit its extensions a lot of access into its functionality. Hence, an extension that would download a .torrent file and automatically open it in the user's BitTorrent client locally can't be easily implemented. **Remote Torrent Adder** utilizes the WebUIs of modern BitTorrent clients to implement the functionality required for this scenario - and it works locally as well as for BitTorrent clients on other machines!

It supports the following BitTorrent clients:
  * Vuze (through plugins: Vuze Remote, SwingUI, HTML WebUI)
  * uTorrent (including uTorrent Server, uTorrent for Mac and newer Buffalo Linkstations)
  * Transmission
  * Deluge
  * qBittorrent
  * rtorrent (ruTorrent, pyrt)
  * Torrentflux
  * Buffalo built-in torrent client
  * Tixati

Changes to functionality are listed here: [Changelog](Changelog.md)

# How do i get it running? #
To get this set up, follow these steps:
  1. Get the extension added to your Chrome Browser by visiting [this page](https://chrome.google.com/webstore/detail/oabphaconndgibllomdcjbfdghcmenci).
  1. Open the extension's options through Chrome's wrench menu and set your server's info
  1. If just clicking a link doesn't add the torrent to your client, but downloads it locally to your disk, also look at the "Link Catching" tab in the settings page and consult [this page](CreateLinkCatchingFilters.md) for a short tutorial on how to fix it.
  1. (optional) ♥Donate♥:
<a href='https://www.paypal.com/cgi-bin/webscr?cmd=_s-xclick&hosted_button_id=E7PGHLKHR4GJL'><img src='https://www.paypal.com/en_US/i/btn/btn_donateCC_LG.gif' /></a> or via Bitcoin: 15VMf7nUNgCutmQrGKu2gSQaLYfG9VtH74