/** Script bodies for FirefoxTab.evaluate; they run in an extension page, with their arguments in `args`. */

export const READ_STORED_VALUE = "return (await browser.storage.local.get([args[0]]))[args[0]];";

export const WRITE_STORED_VALUE = "await browser.storage.local.set({ [args[0]]: args[1] });";

export const READ_SESSION_RULES = "return await browser.declarativeNetRequest.getSessionRules();";

export const QUERY_PAGE_LINKS = [
    "const [tab] = await browser.tabs.query({ url: args[0] });",
    'if (!tab || !tab.id) { throw new Error("No tab matched " + args[0]); }',
    'const response = await browser.tabs.sendMessage(tab.id, { action: "getPageLinks" }, { frameId: 0 });',
    "return (response && response.links) || [];",
].join("\n");

export const HAS_BUFFERED_TORRENT = [
    "const record = await new Promise((res, rej) => {",
    '  const open = indexedDB.open("rta-torrents", 1);',
    "  open.onerror = () => rej(open.error);",
    "  open.onsuccess = () => {",
    '    const tx = open.result.transaction("buffered", "readonly");',
    '    const get = tx.objectStore("buffered").get("pending");',
    "    get.onsuccess = () => res(get.result); get.onerror = () => rej(get.error);",
    "    tx.oncomplete = () => open.result.close();",
    "  };",
    "});",
    "return Boolean(record && record.torrent);",
].join("\n");
