import { readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import * as theme from "../../src/options/theme";

const STYLESHEET = readFileSync("src/options/options-theme.css", "utf-8");
const LIGHT_RULES = STYLESHEET.slice(0, STYLESHEET.indexOf("@media"));
const TOKEN_PATTERN = /^var\((--rta-[a-z-]+), (#[0-9a-fA-F]+)\)$/;

function expandShortHex(color: string): string {
    const digits = color.slice(1).toLowerCase();
    return "#" + (digits.length === 3 ? [...digits].map(digit => digit + digit).join("") : digits);
}

function lightValueOf(property: string): string | undefined {
    return new RegExp(`${property}: *(#[0-9a-fA-F]+)`).exec(LIGHT_RULES)?.[1];
}

describe.each(Object.entries(theme))("theme colour %s", (_name, token) => {
    it("falls back to the light value of a custom property the stylesheet defines", () => {
        const [, property, fallback] = TOKEN_PATTERN.exec(token) ?? [];

        expect(property).toBeDefined();
        expect(expandShortHex(fallback!)).toBe(lightValueOf(property!));
    });
});
