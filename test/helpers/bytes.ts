export function utf8Bytes(text: string): Uint8Array {
    return new TextEncoder().encode(text);
}
