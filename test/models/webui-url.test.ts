import { describe, it, expect } from "vitest";
import { addLeadingAndTrimTrailingSlashes, buildBaseUrl } from "../../src/models/webui-url";
import { makeWebUISettings } from "../helpers/fixtures";

describe("buildBaseUrl", () => {
    it("joins scheme, host, port and normalized relative path", () => {
        const settings = makeWebUISettings({ host: "h", port: 8443, secure: true, relativePath: "/app/" });

        expect(buildBaseUrl(settings)).toBe("https://h:8443/app");
    });

    it("omits the default port of the scheme only", () => {
        expect(buildBaseUrl(makeWebUISettings({ host: "h", port: 443, secure: true }))).toBe("https://h");
        expect(buildBaseUrl(makeWebUISettings({ host: "h", port: 80, secure: true }))).toBe("https://h:80");
    });
});

describe("addLeadingAndTrimTrailingSlashes", () => {
    it("returns empty string for empty input", () => {
        expect(addLeadingAndTrimTrailingSlashes("")).toBe("");
    });

    it("adds a leading slash and trims trailing slashes", () => {
        expect(addLeadingAndTrimTrailingSlashes("path/")).toBe("/path");
        expect(addLeadingAndTrimTrailingSlashes("//a/b//")).toBe("/a/b");
    });
});
