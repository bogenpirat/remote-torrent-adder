import { readdirSync, readFileSync } from "node:fs";
import { describe, it, expect } from "vitest";
import * as theme from "../../src/options/theme";

const OPTIONS_DIRECTORY = "src/options";
const THEME_MODULE = "theme.ts";
const STYLESHEET = readFileSync(`${OPTIONS_DIRECTORY}/options-theme.css`, "utf-8");
const LIGHT_RULES = STYLESHEET.slice(0, STYLESHEET.indexOf("@media"));
const LITERAL_STYLE_VALUE_PATTERN = /#[0-9a-fA-F]{3,8}\b|rgba?\(/;
const TOKEN_PATTERN = /^var\((--rta-[a-z-]+), (.+)\)$/;

function normalizeHex(value: string): string {
    if (!value.startsWith("#")) {
        return value;
    }
    const digits = value.slice(1).toLowerCase();
    return "#" + (digits.length === 3 ? [...digits].map(digit => digit + digit).join("") : digits);
}

function lightValueOf(property: string): string | undefined {
    return new RegExp(`${property}: *([^;]+);`).exec(LIGHT_RULES)?.[1];
}

function scriptsContaining(pattern: RegExp): string[] {
    return scriptsOutsideThemeModule()
        .filter(path => pattern.test(readFileSync(`${OPTIONS_DIRECTORY}/${path}`, "utf-8")));
}

function scriptsOutsideThemeModule(): string[] {
    return (readdirSync(OPTIONS_DIRECTORY, { recursive: true }) as string[])
        .filter(path => /\.tsx?$/.test(path) && path !== THEME_MODULE);
}

describe.each(Object.entries(theme))("theme token %s", (_name, token) => {
    it("falls back to the light value of a custom property the stylesheet defines", () => {
        const [, property, fallback] = TOKEN_PATTERN.exec(token) ?? [];

        expect(property).toBeDefined();
        expect(normalizeHex(fallback!)).toBe(lightValueOf(property!));
    });
});

describe("theme tokens outside the theme module", () => {
    it("are never spelled out as a custom property with its own fallback", () => {
        expect(scriptsContaining(/var\(--rta-/)).toEqual([]);
    });

    it("are never spelled out as a hex or rgb literal", () => {
        expect(scriptsContaining(LITERAL_STYLE_VALUE_PATTERN)).toEqual([]);
    });
});
