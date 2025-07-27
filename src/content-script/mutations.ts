
export function observe(selector: string, callback: (element: any) => void): void {
    const observer = new MutationObserver(() => {
        document.querySelectorAll(selector).forEach(element => {
            const bindableElement = element as Element & { __bound?: boolean };
            if (!bindableElement.__bound) {
                bindableElement.__bound = true;
                callback(bindableElement);
            }
        });
    });

    observer.observe(document.body, { childList: true, subtree: true });
}
