#!/usr/bin/env node
import { spawnSync } from "node:child_process";

interface Waiver {
    package: string;
    ghsa: string;
    reason: string;
    reviewed: string;
}

interface Advisory {
    url: string;
    severity: string;
    title: string;
}

interface AuditReport {
    vulnerabilities: Record<string, { via: (string | Advisory)[] }>;
}

interface Finding {
    package: string;
    ghsa: string;
    severity: string;
    title: string;
}

const ALLOWLIST: Waiver[] = [];

const BLOCKING = new Set(["high", "critical"]);

const result = spawnSync("npm audit --json", { encoding: "utf8", shell: true });
if (!result.stdout) {
    console.error("npm audit produced no output.");
    console.error(result.error?.message ?? result.stderr);
    process.exit(1);
}

const report: AuditReport = JSON.parse(result.stdout);

const found = new Map<string, Finding>();
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
    console.warn(`Allowlisted advisory no longer reported: ${key} - remove it from scripts/audit.ts.`);
}

if (blocking.length > 0) {
    console.error(`\n${blocking.length} unwaived high/critical advisor${blocking.length === 1 ? "y" : "ies"}:\n`);
    for (const entry of blocking) {
        console.error(`  ${entry.severity.padEnd(8)} ${entry.package} - ${entry.title}`);
        console.error(`           https://github.com/advisories/${entry.ghsa}`);
    }
    console.error("\nFix them, or add a reviewed entry to ALLOWLIST in scripts/audit.ts.\n");
    process.exit(1);
}

const waivedCount = found.size;
console.log(
    waivedCount === 0
        ? "No high or critical advisories."
        : `No unwaived high or critical advisories (${waivedCount} allowlisted).`,
);
