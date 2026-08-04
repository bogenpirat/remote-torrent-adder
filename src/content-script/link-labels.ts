export function isMagnetLink(url: string): boolean {
    return typeof url === 'string' && url.startsWith('magnet:');
}

export function deriveLinkLabel(element: Element, url: string): string {
    const text = element.textContent?.trim();
    if (text) {
        return text;
    }
    if (element instanceof HTMLInputElement && element.value.trim()) {
        return element.value.trim();
    }
    const attributeLabel = element.getAttribute('aria-label') || element.getAttribute('title');
    if (attributeLabel) {
        return attributeLabel;
    }
    if (isMagnetLink(url)) {
        const match = /[?&]dn=([^&]+)/.exec(url);
        const dnValue = match?.[1];
        if (dnValue) {
            try {
                return decodeURIComponent(dnValue.replace(/\+/g, ' '));
            } catch {
                // fall through to the last-resort segment below
            }
        }
    }
    // Last resort: the full url is displayed right below the label anyway, so
    // the segment after the final '/' (usually a filename) is more useful than
    // repeating it wholesale. Falls back to the raw url when that segment is
    // empty, e.g. a url ending in '/'.
    const lastSegment = url.split('/').pop();
    if (lastSegment) {
        try {
            return decodeURIComponent(lastSegment);
        } catch {
            return lastSegment;
        }
    }
    return url;
}
