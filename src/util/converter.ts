export function convertToBinary(payload: string): Uint8Array {
	// TODO: note to self: to use this with a fetch() call, set Content-Type to application/octet-stream
	var ordinals = Array.prototype.map.call(payload, byteValue);
	var uint8Array = new Uint8Array(ordinals);
	return uint8Array.buffer;
}

function byteValue(x: string): number {
	return x.charCodeAt(0) & 0xff;
}

export async function convertBlobToString(blob: Blob): Promise<string> {
	const buf = await blob.arrayBuffer();
	const ui8a = new Uint8Array(buf);
	const chunksize = 0x8000;
	const chunks = [];
	for (let i = 0; i < ui8a.length; i += chunksize) {
		chunks.push(String.fromCharCode.apply(null, ui8a.subarray(i, i + chunksize)));
	}
	return Promise.resolve(chunks.join(""));
}
