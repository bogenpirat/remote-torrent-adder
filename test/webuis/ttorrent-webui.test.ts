import { TTorrentWebUI } from "../../src/webuis/ttorrent-webui";
import { describeFormClient } from "../helpers/form-client-contract";

describeFormClient({
    client: TTorrentWebUI,
    port: 1080,
    magnet: { path: "/cmd/downloadFromUrl", fields: { url: "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent" } },
    file: { path: "/cmd/downloadTorrent", blobField: "torrentfile" },
    supports: [],
});
