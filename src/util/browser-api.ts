type ExtensionApi = typeof chrome;

function resolveExtensionApi(): ExtensionApi {
    const scope = globalThis as { browser?: ExtensionApi; chrome?: ExtensionApi };
    return (scope.browser ?? scope.chrome) as ExtensionApi;
}

export const ext: ExtensionApi = new Proxy({} as ExtensionApi, {
    get: (_target, property) => Reflect.get(resolveExtensionApi() as object, property),
});

export function sendMessageAndForget(message: unknown): void {
    void ext.runtime.sendMessage(message).catch(() => undefined);
}

export async function trySendMessage<T>(message: unknown): Promise<T | null> {
    try {
        return (await ext.runtime.sendMessage(message) as T | undefined) ?? null;
    } catch (error) {
        console.debug("Message send failed; the background script may be asleep.", error);
        return null;
    }
}
