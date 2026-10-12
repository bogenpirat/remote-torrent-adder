import { ElementumWebUI } from "../../src/webuis/elementum-webui";
import { describeFormClient } from "../helpers/form-client-contract";

describeFormClient({
    client: ElementumWebUI,
    port: 65220,
    magnet: { path: "/playuri", fields: { uri: "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent" } },
    file: { blobField: "file" },
    supports: [],
});
