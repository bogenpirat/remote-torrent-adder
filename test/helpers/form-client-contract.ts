import { describe, expect, it } from "vitest";
import { type TorrentUploadConfig } from "../../src/models/torrent";
import { type TorrentWebUI, type WebUISettings } from "../../src/models/webui";
import { makeFileTorrent, makeMagnetTorrent, makeWebUISettings } from "./fixtures";
import { expectRejectionReported, sendToAcceptingClient, supportOf } from "./webui-requests";

type Feature = keyof ReturnType<typeof supportOf>;

export interface FormClientSpec {
    client: new (settings: WebUISettings) => TorrentWebUI;
    port: number;
    magnet: { path: string; fields: Record<string, string> };
    file: { path?: string; blobField: string; fields?: Record<string, string>; config?: TorrentUploadConfig };
    supports: Feature[];
}

/** The tests every client that adds torrents with one unauthenticated form POST has in common. */
export function describeFormClient(spec: FormClientSpec): void {
    const build = () => new spec.client(makeWebUISettings({ host: "h", port: spec.port }));
    const baseUrl = `http://h:${spec.port}`;

    describe(spec.client.name, () => {
        it(`posts a magnet to ${spec.magnet.path}`, async () => {
            const { result, url, body } = await sendToAcceptingClient(build(), makeMagnetTorrent());

            expect(result.success).toBe(true);
            expect(url).toBe(baseUrl + spec.magnet.path);
            expect(textFields(body, spec.magnet.fields)).toEqual(spec.magnet.fields);
        });

        it(`posts a torrent file under the ${spec.file.blobField} field`, async () => {
            const { url, body } = await sendToAcceptingClient(build(), makeFileTorrent(), spec.file.config);

            expect(url).toBe(baseUrl + (spec.file.path ?? spec.magnet.path));
            expect(body.get(spec.file.blobField)).toBeInstanceOf(Blob);
            expect(textFields(body, spec.file.fields)).toEqual(spec.file.fields ?? {});
        });

        it("reports the real status and body on a non-2xx response", async () => {
            await expectRejectionReported(build(), 500, "err");
        });

        it(`supports only ${spec.supports.join(", ") || "plain adding"}`, () => {
            const supported = Object.entries(supportOf(build())).filter(([, isSupported]) => isSupported);

            expect(supported.map(([feature]) => feature)).toEqual(spec.supports);
        });
    });
}

function textFields(body: FormData, expected: Record<string, string> = {}): Record<string, unknown> {
    return Object.fromEntries(Object.keys(expected).map(field => [field, body.get(field)]));
}
