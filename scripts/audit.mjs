#!/usr/bin/env node
import { spawnSync } from "node:child_process";

/**
 * @type {{ package: string, ghsa: string, reason: string, reviewed: string }[]}
 */
const ALLOWLIST = [
    {
        package: "image-size",
        ghsa: "GHSA-w3rx-r6r6-pgpr",
        reason:
            "Denial of service in the ICNS parser, reached through addons-linter <- web-ext. " +
            "image-size 2.0.2 is the newest release and is still vulnerable, so there is nothing " +
            "to upgrade to; npm's suggested fix downgrades web-ext to 5.5.0, which reintroduces " +
            "eight other advisories. web-ext is a devDependency that never ships, and the only " +
            "images it parses are this repository's own icons under src/assets/icons.",
        reviewed: "2026-09-07",
    },
    {
        package: "image-size",
        ghsa: "GHSA-5p2g-fcmc-qvqq",
        reason: "Same package, same path, same reasoning as GHSA-w3rx-r6r6-pgpr (JXL/HEIF parsers).",
        reviewed: "2026-09-07",
    },
];

const BLOCKING = new Set(["high", "critical"]);

const result = spawnSync("npm audit --json", { encoding: "utf8", shell: true });
if (!result.stdout) {
    console.error("npm audit produced no output.");
    console.error(result.error?.message ?? result.stderr);
    process.exit(1);
}

/** @type {{ vulnerabilities: Record<string, { via: (string | { url: string, severity: string, title: string })[] }> }} */
const report = JSON.parse(result.stdout);

const found = new Map();
for (const [name, vulnerability] of Object.entries(report.vulnerabilities ?? {})) {
    for (const via of vulnerability.via) {
        if (typeof via === "string" || !BLOCKING.has(via.severity)) {
            continue;
        }
        const ghsa = via.url.split("/").pop() ?? via.url;
        found.set(`${name}:${ghsa}`, { package: name, ghsa, severity: via.severity, title: via.title });
    }
}

const waived = new Set(ALLOWLIST.map(entry => `${entry.package}:${entry.ghsa}`));
const blocking = [...found.values()].filter(entry => !waived.has(`${entry.package}:${entry.ghsa}`));
const stale = [...waived].filter(key => !found.has(key));

for (const key of stale) {
    console.warn(`Allowlisted advisory no longer reported: ${key} - remove it from scripts/audit.mjs.`);
}

if (blocking.length > 0) {
    console.error(`\n${blocking.length} unwaived high/critical advisor${blocking.length === 1 ? "y" : "ies"}:\n`);
    for (const entry of blocking) {
        console.error(`  ${entry.severity.padEnd(8)} ${entry.package} - ${entry.title}`);
        console.error(`           https://github.com/advisories/${entry.ghsa}`);
    }
    console.error("\nFix them, or add a reviewed entry to ALLOWLIST in scripts/audit.mjs.\n");
    process.exit(1);
}

const waivedCount = found.size;
console.log(
    waivedCount === 0
        ? "No high or critical advisories."
        : `No unwaived high or critical advisories (${waivedCount} allowlisted).`,
);
