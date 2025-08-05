
export function observe(selector: string, callback: (element: any) => void): void {
    // Immediately process existing elements
    document.querySelectorAll(selector).forEach(element => {
        const bindableElement = element as Element & { __bound?: boolean };
        if (!bindableElement.__bound) {
            bindableElement.__bound = true;
            callback(bindableElement);
        }
    });

    // Observe future mutations
    const observer = new MutationObserver(() => {
        document.querySelectorAll(selector).forEach(element => {
            const bindableElement = element as Element & { __bound?: boolean };
            if (!bindableElement.__bound) {
                bindableElement.__bound = true;
                callback(bindableElement);
            }
        });
    });

    observer.observe(document.documentElement, { childList: true, subtree: true });
}
