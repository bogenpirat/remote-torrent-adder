### v1.2.5: ###
  * added: support for Hadouken and nodejs-rtorrent
  * fixed: a minor uTorrent api difference that broke tribler's support

### v1.2.4: ###
  * fixed: a bug where label/directory settings weren't saved in the correct server instance

### v1.2.1 - v1.2.3: ###
  * various fixes introduced by refactoring for 1.2.0

### v1.2.0: ###
  * added: support for multiple concurrent torrent servers ([issue 84](https://code.google.com/p/remote-torrent-adder/issues/detail?id=84))
  * fixed: vuze remote csrf header workaround
  * fixed: error notifications now have a red icon instead of the green one ([issue 94](https://code.google.com/p/remote-torrent-adder/issues/detail?id=94))
  * note: major restructuring of the code as well as the settings, so some things may turn out buggy. please remove and re-add the extension from the webstore, that should fix most.

### v1.1.11: ###
  * fixed: notifications ([issue 98](https://code.google.com/p/remote-torrent-adder/issues/detail?id=98) and many others)
  * added: support for Tixati
  * added: "add torrents paused" option for rutorrent
  * added: an option to grab torrents from newly opened tabs
  * added: a couple of newer libraries

### v1.1.10: ###
  * added: support for SSL/HTTPS url scheme with utorrent (only works via reverse proxying) ([issue 58](https://code.google.com/p/remote-torrent-adder/issues/detail?id=58))
  * fixed: preventing null-values from being used in interactive directory/label dialog ([issue 55](https://code.google.com/p/remote-torrent-adder/issues/detail?id=55))
  * fixed: changed standard catching regex to prevent unwanted catching ([issue 51](https://code.google.com/p/remote-torrent-adder/issues/detail?id=51))
  * buffalo webui: changed name to emphasize that this only works on older devices; newer ones use utorrent api ([issue 45](https://code.google.com/p/remote-torrent-adder/issues/detail?id=45))

### v1.1.9: ###
  * redid blob building for binary send due to WebKitBlobBuilder deprecation in latest chrome dev

### v1.1.8: ###
  * fixed the desktop notification icon ([issue 40](https://code.google.com/p/remote-torrent-adder/issues/detail?id=40))

### v1.1.6 & 1.1.7: ###
  * deluge: added support for non-standard webui paths ([issue 38](https://code.google.com/p/remote-torrent-adder/issues/detail?id=38))
  * reverted the authentication back to the proper way (fixes issues for rutorrent running on webservers using http digest as authentication), see 1.1.4/5 ([issue 39](https://code.google.com/p/remote-torrent-adder/issues/detail?id=39))

### v1.1.5: ###
  * reverted changes made for [issue 32](https://code.google.com/p/remote-torrent-adder/issues/detail?id=32) until chrome 19 goes stable

### v1.1.4: ###
  * utorrent: added an option to enter a non-standard path for people who reverse-proxy their webui ([issue 28](https://code.google.com/p/remote-torrent-adder/issues/detail?id=28))
  * fixed the default regex filter
  * fixed authentication for all clients, hopefully ([issue 32](https://code.google.com/p/remote-torrent-adder/issues/detail?id=32))

### v1.1.3: ###
  * deluge: added SSL support
  * utorrent: fixed a bug in error handling where the security token wasn't present.

### v1.1.2: ###
  * added a method of preventing inline link catching: hold either of CTRL/ALT/SHIFT whilst clicking to prevent RTA from doing anything
  * rutorrent: added magnet support
  * fixed a bug where the rutorrent label/directory dialog wasn't displayed when adding via context menu

### v1.1.1: ###
  * rutorrent: added an optional per-torrent adding dialog that lets you choose a label/directory
  * utorrent: fixed error message handling

### v1.1.0: ###
  * added support for qbittorrent, pyrt (rtorrent), deluge
  * implemented magnet support. works for: utorrent, vuze remote, vuze html, transmission, qbittorrent, deluge
  * improved error messages

### v1.0.21: ###
  * fixed SSL support for transmission
  * added support for the Vuze Remote plugin (self-signed SSL certificates must be imported/accepted manually!)

### v1.0.20: ###
  * fixed bug introduced in previous release

### v1.0.19: ###
  * added support for bittorrent links behind html buttons - please report if this breaks anything (like regular buttons).

### v1.0.18: ###
  * added support for Buffalo's Bittorrent WebUI

### v1.0.17: ###
  * added support for  Vuze's HTML WebUI plugin

### v1.0.16: ###
  * bugfix for rutorrent

### v1.0.15: ###
  * added default label and directory settings to the rutorrent client.

### v1.0.14: ###
  * made options more aesthetically pleasing, added more information

### v1.0.13: ###
  * fixed an issue that would silently make urls without ".torrent" in them fail to load

### v1.0.12: ###
  * (hopefully) fixed rutorrent and torrentflux support

### v1.0.11: ###
  * added SSL support for Torrentflux and ruTorrent web interfaces

### v1.0.10: ###
  * fix to support for newer versions of chrome (due to this)

### v1.0.9: ###
  * simplified uTorrent handling
  * added Torrentflux support (please test and report, people)

### v1.0.8: ###
  * added ruTorrent support (no SSL (yet?))

### v1.0.6-v1.0.7: ###
  * fixed an options display bug with the regex filters (thanks Curtis)

### v1.0.5: ###
  * added an option to hide the new address bar indicator
  * prettied up the options page

### v1.0.4: ###
  * added an icon to the address bar to indicate that torrent links have been found

### v1.0.0-v1.0.3: ###
  * a bit of code cleanup and resource bug fixing