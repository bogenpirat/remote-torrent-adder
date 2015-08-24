#questions that get asked in a frequent fashion.

---



---

### What's the fastest way to set up? ###
Go to the extension's options, choose your webui, enter your host (127.0.0.1 if on your local computer), port, username and password and reload the page that has torrents on it.

If there's a green indicator in the omnibox, it's already working. If it isn't look into CreateLinkCatchingFilters.

### I'm using an SSL webui and keep getting "HTTP CODE 0"-like errors ###
  1. make sure that you entered the correct port. if your webui doesn't have a specified port (e.g. "https://somehost.com:12345"), it's using port 443; not 80.
  1. make sure you either have an SSL certificate signed by a trusted authority (i.e. one that you don't have to confirm everytime you restart the browser and open up your webui), or that your self-signed SSL certificate is imported into your operating system's certificate cache (see ImportSelfsignedSSLCertificates).

### I have a Buffalo Linkstation and the "Buffalo WebUI" setting doesn't work ###
Seems like Buffalo may have a changed the software that facilitates their BitTorrent support.

Their older NAS devices used to have one that will work with the "Buffalo WebUI (OLD!)" setting. The newer devices can be accessed using the "uTorrent WebUI" setting.

### How come when I select a custom download directory with ruTorrent, the torrent is still downloaded to the default download location? ###
Due to a limitation in ruTorrent, RTA is unable to create the custom directory on your behalf. You must manually create the directory on your torrent machine's filesystem BEFORE you add a torrent with a custom path. Otherwise, the download location will be the default download directory.