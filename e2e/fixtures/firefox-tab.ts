import { By } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

interface Outcome<R> {
    value?: R;
    error?: string;
}

const OPEN_TAB_AS_BROWSER = [
    'const browserWindow = Services.wm.getMostRecentWindow("navigator:browser");',
    "browserWindow.gBrowser.selectedTab = browserWindow.gBrowser.addTab(arguments[0], {",
    "    triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(),",
    "});",
].join("\n");

/** One browser tab, addressed by its window handle. */
export class FirefoxTab {
    constructor(
        private readonly driver: firefox.Driver,
        private readonly handle: string,
    ) {}

    /** Runs `body` as the body of an async function in this tab; the extra arguments arrive as `args`. */
    async evaluate<R>(body: string, ...args: unknown[]): Promise<R> {
        await this.focus();
        const outcome = await this.driver.executeAsyncScript<Outcome<R>>(reportingOutcome(body), ...args);
        if (outcome.error !== undefined) {
            throw new Error(`Extension page evaluate failed: ${outcome.error}`);
        }
        return outcome.value as R;
    }

    async click(selector: string): Promise<void> {
        await this.focus();
        await this.driver.findElement(By.css(selector)).click();
    }

    async clickButton(text: string): Promise<void> {
        await this.focus();
        await this.driver.findElement(By.xpath(`//button[normalize-space(.)=${JSON.stringify(text)}]`)).click();
    }

    private async focus(): Promise<void> {
        await this.driver.switchTo().window(this.handle);
    }
}

function reportingOutcome(body: string): string {
    return [
        "const done = arguments[arguments.length - 1];",
        "const args = Array.prototype.slice.call(arguments, 0, arguments.length - 1);",
        "(async () => {",
        body,
        "})().then(",
        "    value => done({ value }),",
        "    error => done({ error: String((error && error.message) || error) }),",
        ");",
    ].join("\n");
}

export async function openWebPage(driver: firefox.Driver, url: string): Promise<FirefoxTab> {
    await driver.switchTo().newWindow("tab");
    await driver.get(url);
    return new FirefoxTab(driver, await driver.getWindowHandle());
}

/** WebDriver may not navigate to moz-extension:// pages, so the tab is opened with the browser's own privileges. */
export async function openExtensionTab(driver: firefox.Driver, url: string): Promise<FirefoxTab> {
    const handlesBefore = await driver.getAllWindowHandles();
    await driver.setContext(firefox.Context.CHROME);
    await driver.executeScript(OPEN_TAB_AS_BROWSER, url);
    await driver.setContext(firefox.Context.CONTENT);
    return new FirefoxTab(driver, await waitForNewTab(driver, { handlesBefore, url }));
}

interface ExpectedTab {
    handlesBefore: string[];
    url: string;
}

async function waitForNewTab(driver: firefox.Driver, expected: ExpectedTab): Promise<string> {
    const deadline = Date.now() + 15_000;
    while (Date.now() < deadline) {
        const handle = await switchToNewTabShowing(driver, expected);
        if (handle) {
            return handle;
        }
        await driver.sleep(100);
    }
    throw new Error(`Extension page never opened: ${expected.url}`);
}

async function switchToNewTabShowing(driver: firefox.Driver, { handlesBefore, url }: ExpectedTab): Promise<string | undefined> {
    const fresh = (await driver.getAllWindowHandles()).find(handle => !handlesBefore.includes(handle));
    if (!fresh) {
        return undefined;
    }
    await driver.switchTo().window(fresh);
    return (await driver.getCurrentUrl()).startsWith(url) ? fresh : undefined;
}
