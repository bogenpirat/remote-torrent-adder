export function isUserInitiated(event: Event): boolean {
    return event.isTrusted;
}
