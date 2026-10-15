import { type WebUISettings } from "./webui";

const DEFAULT_HTTP_PORT = 80;
const DEFAULT_HTTPS_PORT = 443;

export function buildBaseUrl(settings: WebUISettings): string {
    const scheme = settings.secure ? "https" : "http";
    const path = settings.relativePath ? addLeadingAndTrimTrailingSlashes(settings.relativePath) : "";
    return `${scheme}://${settings.host}${buildPortPart(settings)}${path}`;
}

export function addLeadingAndTrimTrailingSlashes(urlPart: string): string {
    if (!urlPart) {
        return "";
    }
    return "/" + urlPart.replace(/^\/+|\/+$/g, "");
}

export function defaultPortFor(settings: WebUISettings): number {
    return settings.secure ? DEFAULT_HTTPS_PORT : DEFAULT_HTTP_PORT;
}

function buildPortPart(settings: WebUISettings): string {
    const defaultPort = defaultPortFor(settings);
    const isImplied = settings.port === null || settings.port === undefined || settings.port === defaultPort;
    return isImplied ? "" : `:${settings.port}`;
}
