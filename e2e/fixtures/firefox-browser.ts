import { Builder } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { FIREFOX_EXTENSION_DIR, GECKO_ID } from "./firefox-paths";

const HEADLESS = process.env.RTA_FIREFOX_HEADED !== "1";
const UUID_PREFERENCE = /user_pref\("extensions\.webextensions\.uuids",\s*"(.*)"\);/;

export const NON_LOOPBACK_HOST = "rta-client.test";

export async function startFirefoxWithExtension(profileDir: string): Promise<firefox.Driver> {
    const driver = (await new Builder()
        .forBrowser("firefox")
        .setFirefoxOptions(createOptions(profileDir))
        .setFirefoxService(new firefox.ServiceBuilder().addArguments("--allow-system-access"))
        .build()) as firefox.Driver;
    await driver.installAddon(FIREFOX_EXTENSION_DIR, true);
    return driver;
}

function createOptions(profileDir: string): firefox.Options {
    const options = new firefox.Options();
    options.addArguments("--profile", profileDir);
    if (HEADLESS) {
        options.addArguments("--headless");
    }
    options.setPreference("xpinstall.signatures.required", false);
    options.setPreference("network.dns.localDomains", NON_LOOPBACK_HOST);
    return options;
}

/** Firefox gives every installed extension a random UUID, which its moz-extension:// URLs are built from. */
export async function readAssignedUuid(driver: firefox.Driver, profileDir: string): Promise<string> {
    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
        const uuid = await readUuidFromPrefs(profileDir);
        if (uuid) {
            return uuid;
        }
        await driver.sleep(200);
    }
    throw new Error(`Firefox never assigned a UUID to ${GECKO_ID}`);
}

async function readUuidFromPrefs(profileDir: string): Promise<string | undefined> {
    const prefs = await readFile(join(profileDir, "prefs.js"), "utf8").catch(() => "");
    const raw = UUID_PREFERENCE.exec(prefs)?.[1];
    if (!raw) {
        return undefined;
    }
    const uuids = JSON.parse(raw.replace(/\\"/g, '"')) as Record<string, string>;
    return uuids[GECKO_ID];
}
