import { readdirSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import * as theme from "../../src/options/theme";

const OPTIONS_DIRECTORY = "src/options";
const THEME_MODULE = "theme.ts";
const STYLESHEET = readFileSync(`${OPTIONS_DIRECTORY}/options-theme.css`, "utf-8");
const LIGHT_RULES = STYLESHEET.slice(0, STYLESHEET.indexOf("@media"));
const TOKEN_PATTERN = /^var\((--rta-[a-z-]+), (#[0-9a-fA-F]+)\)$/;

function expandShortHex(color: string): string {
    const digits = color.slice(1).toLowerCase();
    return "#" + (digits.length === 3 ? [...digits].map(digit => digit + digit).join("") : digits);
}

function lightValueOf(property: string): string | undefined {
    return new RegExp(`${property}: *(#[0-9a-fA-F]+)`).exec(LIGHT_RULES)?.[1];
}

function scriptsOutsideThemeModule(): string[] {
    return (readdirSync(OPTIONS_DIRECTORY, { recursive: true }) as string[])
        .filter(path => /\.tsx?$/.test(path) && path !== THEME_MODULE);
}

describe.each(Object.entries(theme))("theme colour %s", (_name, token) => {
    it("falls back to the light value of a custom property the stylesheet defines", () => {
        const [, property, fallback] = TOKEN_PATTERN.exec(token) ?? [];

        expect(property).toBeDefined();
        expect(expandShortHex(fallback!)).toBe(lightValueOf(property!));
    });
});

describe("theme colours outside the theme module", () => {
    it("are never spelled out as a custom property with its own fallback", () => {
        const offenders = scriptsOutsideThemeModule()
            .filter(path => readFileSync(`${OPTIONS_DIRECTORY}/${path}`, "utf-8").includes("var(--rta-"));

        expect(offenders).toEqual([]);
    });
});
