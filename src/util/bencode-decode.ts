import bencode from "bencode";
import { type DecodedTorrent, isDecodedTorrent } from "../models/decoded-torrent";

/**
 * The single place raw bytes become a {@link DecodedTorrent}. `bencode.decode`
 * is typed as returning `any` and is fed bytes from an arbitrary URL, so the
 * result is validated here rather than trusted by every caller.
 *
 * Throws if the bytes are not bencode, or decode to something without an info
 * dictionary (an HTML error page served with a .torrent URL, typically).
 */
export function decodeTorrentBytes(bytes: Uint8Array): DecodedTorrent {
    const decoded: unknown = bencode.decode(bytes as never);
    if (!isDecodedTorrent(decoded)) {
        throw new Error("Decoded data is not a torrent: no info dictionary");
    }
    return decoded;
}
