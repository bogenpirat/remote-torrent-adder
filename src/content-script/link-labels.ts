import { getDeclaredTorrentNameFromMagnetLink } from '../util/parsers';

export function isMagnetLink(url: string): boolean {
    return typeof url === 'string' && url.startsWith('magnet:');
}

export function deriveLinkLabel(element: Element, url: string): string {
    return labelFromElement(element) || labelFromMagnetName(url) || labelFromLastUrlSegment(url);
}

function labelFromElement(element: Element): string {
    const text = element.textContent?.trim();
    if (text) {
        return text;
    }
    if (element instanceof HTMLInputElement && element.value.trim()) {
        return element.value.trim();
    }
    return element.getAttribute('aria-label') || element.getAttribute('title') || '';
}

function labelFromMagnetName(url: string): string {
    return isMagnetLink(url) ? getDeclaredTorrentNameFromMagnetLink(url) ?? '' : '';
}

// Last resort: the full url is displayed right below the label anyway, so
// the segment after the final '/' (usually a filename) is more useful than
// repeating it wholesale. Falls back to the raw url when that segment is
// empty, e.g. a url ending in '/'.
function labelFromLastUrlSegment(url: string): string {
    const lastSegment = url.split('/').pop();
    if (!lastSegment) {
        return url;
    }
    try {
        return decodeURIComponent(lastSegment);
    } catch {
        return lastSegment;
    }
}
