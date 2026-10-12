import { type IncomingMessage, type Server } from "node:http";
import { type AddressInfo } from "node:net";

/** Starts the server on a free loopback port and resolves with that port. */
export async function listenOnLoopback(server: Server): Promise<number> {
    await new Promise<void>(resolve => server.listen(0, "127.0.0.1", resolve));
    return (server.address() as AddressInfo).port;
}

export async function closeServer(server: Server): Promise<void> {
    server.closeAllConnections();
    await new Promise<void>(resolve => server.close(() => resolve()));
}

export async function readBody(req: IncomingMessage): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
        chunks.push(chunk as Buffer);
    }
    return Buffer.concat(chunks);
}
