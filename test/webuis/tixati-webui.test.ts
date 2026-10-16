import { TixatiWebUI } from "../../src/webuis/tixati-webui";
import { describeFormClient } from "../helpers/form-client-contract";

describeFormClient({
    client: TixatiWebUI,
    port: 8888,
    magnet: {
        path: "/transfers/action",
        fields: { addlink: "Add", addlinktext: "magnet:?xt=urn:btih:abc123&dn=Cool+Torrent", noautostart: "0" },
    },
    file: { blobField: "metafile", fields: { addmetafile: "Add", noautostart: "1" }, config: { addPaused: true } },
    supports: ["addPaused"],
});
