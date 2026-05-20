# Agent: release-manager

**Purpose**: Prepare and execute a version release for Remote Torrent Adder.

## When to Use

Invoke when the user wants to release a new version of the extension.

## Release Checklist

### 1. Determine version type

- **patch** (X.Y.Z+1): bug fixes, no new features, no API changes
- **minor** (X.Y+1.0): new features (e.g. new client, new option), backwards compatible
- **major** (X+1.0.0): breaking changes (e.g. settings migration required)

Current version is in `package.json` → `"version"` field and `src/manifest.json` → `"version"`.

### 2. Update version numbers

Two files must be updated simultaneously:

**`package.json`**:
```json
{
  "version": "X.Y.Z"
}
```

**`src/manifest.json`**:
```json
{
  "version": "X.Y.Z"
}
```

They must always match.

### 3. Verify the build

```bash
npm run build:prod
```

The build must succeed with no errors. Check `dist-prod/` is populated.

### 4. Create the release commit

```
git add package.json src/manifest.json
git commit -m "bump version to X.Y.Z"
```

Convention: commit message is exactly `bump version to X.Y.Z` (see git history).

### 5. Tag the release commit

Create a lightweight tag on the version bump commit:

```
git tag vX.Y.Z
```

Convention: tag name is `vX.Y.Z` (lowercase `v` prefix, matches all existing tags). Tags are lightweight (no `-a` flag).

### 6. Push commit and tag, then wait for CI

```
git push origin master
git push origin vX.Y.Z
```

GitHub Actions will:
1. Run `build-dev` job (always)
2. Run `build-prod` job (master only) and upload `dist-prod/` artifact named `chrome-extension-dist-prod`

Note: CI triggers on branch pushes only, not on tag pushes — so the tag push does not trigger an extra CI run.

Wait for the `build-prod` job to succeed before continuing:

```
gh run watch $(gh run list --branch master --workflow build-extension.yml --limit 1 --json databaseId --jq '.[0].databaseId')
```

### 7. Create a draft GitHub release

**Download the prod artifact:**

```
gh run download $(gh run list --branch master --workflow build-extension.yml --status success --limit 1 --json databaseId --jq '.[0].databaseId') \
  --name chrome-extension-dist-prod \
  --dir /tmp/rta-release
zip -r remote-torrent-adder-vX.Y.Z.zip /tmp/rta-release/
```

**Generate release notes from git history:**

Run `git log vX.Y.ZPREV..vX.Y.Z --pretty=format:"%s"` to get all commits in this release (where `vX.Y.ZPREV` is the previous tag). Then:

- **Exclude** the `bump version to X.Y.Z` commit — it's not a user-facing change.
- **Group** the remaining commits into two sections:
  - **Changes** — anything that is not a dependency bump (features, fixes, refactors, CI/tooling changes that matter to users)
  - **Dependency updates** — commits matching `build(deps` prefix (these come from Dependabot)
- For each commit that references a GitHub issue or PR number like `(#123)`, include a link: `[#123](https://github.com/bogenpirat/remote-torrent-adder/issues/123)`
- Write the Changes bullets in plain English, correcting any typos in the original commit message. Keep them concise.
- If there are no dependency updates, omit that section entirely.

Example release notes format:

```markdown
## Changes
- Fixed qBittorrent 5.2.0 compatibility (#450)
- Upgraded Vite build tooling (#448)

## Dependency updates
- lodash, postcss, webpack, rollup, and others (see commits for details)
```

**Create the draft release:**

```
gh release create vX.Y.Z \
  --repo bogenpirat/remote-torrent-adder \
  --title "Remote Torrent Adder vX.Y.Z" \
  --notes "$(cat <<'EOF'
<paste generated release notes here>
EOF
)" \
  --draft \
  remote-torrent-adder-vX.Y.Z.zip
```

After creating, print the URL of the draft release so the user can review and publish it.

## Notes

- The `dist-prod/` folder is gitignored — the release artifact comes from GitHub Actions CI
- If settings format changes between versions, check `src/util/settings.ts` for migration logic and add a new migration step
