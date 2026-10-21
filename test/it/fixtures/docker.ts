import { execFile } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const run = promisify(execFile);

const COMPOSE_FILE = fileURLToPath(new URL("../docker-compose.yml", import.meta.url));

export const keepContainers = process.env.RTA_IT_KEEP === "1";

function composeArgs(profile: string, ...args: string[]): string[] {
    return ["compose", "-f", COMPOSE_FILE, "-p", `rta-it-${profile}`, "--profile", profile, ...args];
}

export async function compose(profile: string, ...args: string[]): Promise<string> {
    const { stdout } = await run("docker", composeArgs(profile, ...args), { maxBuffer: 16 * 1024 * 1024 });
    return stdout;
}

export async function composeUp(profile: string, attempts = 3): Promise<void> {
    for (let attempt = 1; ; attempt++) {
        try {
            await compose(profile, "up", "-d", "--pull", "always");
            return;
        } catch (error) {
            if (attempt >= attempts) {
                throw error;
            }
            await new Promise(resolve => setTimeout(resolve, 5_000));
        }
    }
}

export async function composeDown(profile: string): Promise<void> {
    await compose(profile, "down", "-v", "--remove-orphans");
}

export async function composeLogs(profile: string, service: string): Promise<string> {
    return compose(profile, "logs", "--no-color", service);
}

export async function waitFor<T>(
    description: string,
    attempt: () => Promise<T | null | undefined>,
    { timeoutMs = 90_000, intervalMs = 500 }: { timeoutMs?: number; intervalMs?: number } = {},
): Promise<T> {
    const deadline = Date.now() + timeoutMs;
    let lastError: unknown = null;
    while (Date.now() < deadline) {
        try {
            const result = await attempt();
            if (result !== null && result !== undefined) {
                return result;
            }
        } catch (error) {
            lastError = error;
        }
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    throw new Error(`Timed out waiting for ${description}${lastError ? `: ${String(lastError)}` : ""}`);
}

export async function waitForHttp(url: string, init?: RequestInit): Promise<void> {
    await waitFor(`${url} to answer`, async () => {
        const response = await fetch(url, init);
        return response.status < 500 ? true : null;
    });
}
