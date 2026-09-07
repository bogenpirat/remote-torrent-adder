export function convertToBinary(payload: string): Uint8Array {
	// TODO: note to self: to use this with a fetch() call, set Content-Type to application/octet-stream
	const ordinals = Array.prototype.map.call(payload, byteValue) as number[];
	return new Uint8Array(ordinals);
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
		chunks.push(String.fromCharCode(...Array.from(ui8a.subarray(i, i + chunksize))));
	}
	return Promise.resolve(chunks.join(""));
}

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    // onload, not onloadend: onloadend also fires after a failed read, where
    // reader.result is null. Reading it there threw a TypeError from inside the
    // event handler, which surfaced as an uncaught error and hid the real one.
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      if (base64 === undefined) {
        reject(new Error("FileReader produced an unexpected data URL"));
        return;
      }
      resolve(base64);
    };
    reader.onerror = () => reject(reader.error ?? new Error("Failed reading the torrent data"));
    reader.readAsDataURL(blob);
  });
}
