import React from "react";

export default function AboutPage() {
  return (
    <div>
      <h1>About Remote Torrent Adder</h1>
      <p>This extension allows you to automatically add torrents to your torrent client without having to download a torrent file and opening your torrent client. For that purpose, the torrent client's WebUI must be running and have CORS restrictions disabled.</p>
      <h2>RTA v2 (Manifest V3)</h2>
      <p>A lot of things have changed with Chrome's insistence on Manifest V3. This has prompted a complete rewrite of this project. Some features were removed, others were improved, some new stuff was added. I've tried to migrate old configurations, but it's a good possibility that some things don't work. Should you see problems after migration to RTA v2.x from RTA v1.x, please reinstall the extension and reconfigure it. If you're faced with bugs or problems on a clean install, file an issue at the GitHub repo below.</p>
      <h2>Support, Source, Contact</h2>
      <p>Take a look at the GitHub repository: <a href="https://github.com/bogenpirat/remote-torrent-adder" target="_blank">https://github.com/bogenpirat/remote-torrent-adder</a></p>

      <h1>Settings</h1>
      <h2>Primary Client</h2>
      <p>Clients that are not the first in the Settings list have a button that allows you to promote them to the primary client. The primary client will be the one that is used if you just left-click on a (recognized) torrent link.</p>
      <h2>Relative Path</h2>
      <p>Should be optional for some clients, but is available for all of them in case you use a reverse proxy.</p>
      <h2>Auto Label/Dir Settings</h2>
      <p>This feature allows you to automatically assign labels and destination directories based on the tracker URLs contained in the torrent files. A sub-string works, but the criterion is evaluated as a regular expression.</p>
    </div>
  );
}
