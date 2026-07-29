/**
 * The shape a .torrent file decodes into.
 *
 * Bencode has four types: byte strings, integers, lists and dictionaries.
 * Byte strings stay raw `Uint8Array`s because a torrent is not required to be
 * UTF-8 anywhere, so decoding to text is an explicit step via {@link toText}.
 *
 * Everything is optional and every accessor is a guard: the bytes come off the
 * network from a tracker or an arbitrary site, so nothing about the structure
 * can be assumed.
 */
export type BencodeValue = Uint8Array | number | BencodeValue[] | BencodeDictionary;

export interface BencodeDictionary {
    [key: string]: BencodeValue | undefined;
}

export interface DecodedTorrentInfo extends BencodeDictionary {
    name?: BencodeValue;
    private?: BencodeValue;
    files?: BencodeValue;
}

export interface DecodedTorrent extends BencodeDictionary {
    announce?: BencodeValue;
    "announce-list"?: BencodeValue;
    info?: BencodeValue;
}

/**
 * `instanceof Uint8Array` is not reliable here: the decoder may hand back a
 * typed array constructed in another realm (a Node Buffer under the test
 * runner, for instance), which fails an identity check against the global
 * constructor. `ArrayBuffer.isView` is realm-independent.
 */
export function isBytes(value: unknown): value is Uint8Array {
    return ArrayBuffer.isView(value) && !(value instanceof DataView);
}

export function isBencodeDictionary(value: BencodeValue | undefined): value is BencodeDictionary {
    return typeof value === "object"
        && value !== null
        && !Array.isArray(value)
        && !isBytes(value);
}

/** True when the value looks like a torrent, i.e. carries an info dictionary. */
export function isDecodedTorrent(value: unknown): value is DecodedTorrent {
    return isBencodeDictionary(value as BencodeValue) && isBencodeDictionary((value as DecodedTorrent).info);
}

/** Decodes a bencoded byte string to text, or null if it was not a byte string. */
export function toText(value: BencodeValue | undefined): string | null {
    return isBytes(value) ? new TextDecoder().decode(value) : null;
}

/** Narrows to a bencoded list, or an empty list for anything else. */
export function toList(value: BencodeValue | undefined): BencodeValue[] {
    return Array.isArray(value) ? value : [];
}

/** Narrows to a bencoded integer, or null for anything else. */
export function toInteger(value: BencodeValue | undefined): number | null {
    return typeof value === "number" ? value : null;
}

/** Reads the info dictionary, or null when it is missing or malformed. */
export function toInfo(torrent: DecodedTorrent | null | undefined): DecodedTorrentInfo | null {
    return isBencodeDictionary(torrent?.info) ? torrent.info : null;
}
