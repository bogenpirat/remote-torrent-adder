
export function observe(selector: string, callback: (element: any) => void): void {
    const bind = (element: Element) => {
        const bindableElement = element as Element & { __bound?: boolean };
        if (!bindableElement.__bound) {
            bindableElement.__bound = true;
            callback(bindableElement);
        }
    };

    const bindWithin = (element: Element) => {
        if (element.matches(selector)) {
            bind(element);
        }
        element.querySelectorAll(selector).forEach(bind);
    };

    // Immediately process existing elements
    document.querySelectorAll(selector).forEach(bind);

    // Observe future mutations, inspecting only the added nodes rather than
    // re-scanning the whole document on every change.
    const observer = new MutationObserver(records => {
        for (const record of records) {
            record.addedNodes.forEach(node => {
                if (node instanceof Element) {
                    bindWithin(node);
                }
            });
        }
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
}
