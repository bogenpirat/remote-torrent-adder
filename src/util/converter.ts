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

export async function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
