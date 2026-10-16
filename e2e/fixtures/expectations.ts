import { expect } from "@playwright/test";
import { type ConsoleCollector } from "./console-collector";

/**
 * Waits for the extension to stop logging, then fails on every error or
 * warning the spec did not announce in `expected`.
 */
export async function expectNoProblems(logs: ConsoleCollector, expected: RegExp[] = []): Promise<void> {
    await logs.waitForQuiet();
    const problems = logs.unexpectedProblems(expected);
    expect(problems, logs.report(problems)).toEqual([]);
}
