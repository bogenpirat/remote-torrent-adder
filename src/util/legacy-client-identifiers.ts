import { Client } from "../models/clients";
import { RTASettings } from "../models/settings";

/**
 * Single source of truth for every historical client identifier that may still
 * appear in a user's stored or exported configuration, mapped to the current
 * {@link Client} identifier.
 *
 * These are the 2.0.x identifiers, where the display label doubled as the stored
 * identifier (e.g. "qBittorrent WebUI"), from before labels and identifiers were
 * decoupled.
 *
 * This module is intentionally the ONLY place in the codebase that knows about
 * these old strings. All regular code deals exclusively with current
 * {@link Client} values, keeping legacy concerns quarantined here.
 */
const LEGACY_CLIENT_IDENTIFIERS: Readonly<Record<string, Client>> = {
    "BiglyBT WebUI": Client.BiglyBTWebUI,
    "Deluge WebUI": Client.DelugeWebUI,
    "Elementum WebUI": Client.ElementumWebUI,
    "flood WebUI": Client.FloodWebUI,
    "qBittorrent WebUI": Client.QBittorrentWebUI,
    "ruTorrent WebUI": Client.RuTorrentWebUI,
    "Tixati WebUI": Client.TixatiWebUI,
    "Transmission WebUI": Client.TransmissionWebUI,
    "tTorrent WebUI": Client.TTorrentWebUI,
    "Porla WebUI": Client.PorlaWebUI,
    "QNAP Download Station WebUI": Client.QNAPDownloadStationWebUI,
};

const CURRENT_CLIENT_IDENTIFIERS: ReadonlySet<string> = new Set(Object.values(Client));

/**
 * Resolves any stored client identifier — current or legacy — to a current
 * {@link Client}, or null if it is unknown.
 */
export function resolveClientIdentifier(stored: string): Client | null {
    if (CURRENT_CLIENT_IDENTIFIERS.has(stored)) {
        return stored as Client;
    }
    return LEGACY_CLIENT_IDENTIFIERS[stored] ?? null;
}

/**
 * Rewrites any legacy client identifiers found in the given settings to their
 * current {@link Client} values. Returns the very same reference when nothing
 * needed migrating, so callers can cheaply detect whether a persist is
 * warranted (`migrated !== original`).
 */
export function migrateSettingsClientIdentifiers(settings: RTASettings): RTASettings {
    let changed = false;
    const webuiSettings = settings.webuiSettings.map(webui => {
        const stored = webui.client as string;
        const resolved = resolveClientIdentifier(stored);
        if (resolved !== null && resolved !== stored) {
            changed = true;
            return { ...webui, client: resolved };
        }
        return webui;
    });
    return changed ? { ...settings, webuiSettings } : settings;
}
