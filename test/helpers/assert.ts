/**
 * Assertion helpers that turn "this index should exist" from a type error
 * under `noUncheckedIndexedAccess` into a runtime check with a message that
 * says what was actually missing.
 */

/** Reads `items[index]`, failing the test if there is nothing there. */
export function at<T>(items: readonly T[] | undefined, index: number): T {
    const item = items?.[index];
    if (item === undefined) {
        throw new Error(`Expected an element at index ${index}, got ${items?.length ?? 0} element(s)`);
    }
    return item;
}

/** Reads the arguments of the nth call to a vitest mock, failing if it never happened. */
export function callArgs(mockFn: { mock: { calls: any[][] } }, index = 0): any[] {
    const call = mockFn.mock.calls[index];
    if (!call) {
        throw new Error(`Expected a call at index ${index}, but ${mockFn.mock.calls.length} call(s) were made`);
    }
    return call;
}
