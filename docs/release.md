# Release Guide

KChart is published to npm as `@keneth80/k-chart`.

## Prerequisites

- npm account with publish permission for the `@keneth80` scope.
- GitHub repository remote set to `https://github.com/keneth80/k-chart.git`.
- Clean git working tree before publishing.

## Local Verification

Run these checks before every release:

```bash
npm install
npm run typecheck
npm run build:lib
npm run pack:dry
```

`npm run pack:dry` should show only the runtime package files:

- `lib/**`
- `README.md`
- `LICENSE`
- `CHANGELOG.md`
- `package.json`

It should not include `node_modules`, `src`, `dist`, demo files, webpack config, or local archives.

## Publish

For the first public release:

```bash
npm login
npm publish --access public
```

For later releases, update the version first:

```bash
npm version patch
npm publish
git push origin main --follow-tags
```

Use semantic versioning:

- `patch`: bug fixes and docs-only compatible changes.
- `minor`: new backwards-compatible API or examples.
- `major`: breaking API changes.

## GitHub Release

After pushing the version tag, create a GitHub Release from that tag.

Recommended release note sections:

```md
## Added

## Changed

## Fixed

## Migration Notes
```

Use the same content to update `CHANGELOG.md`.

## Playground

After publishing, update the playground project to consume npm instead of a vendored tgz:

```bash
npm install @keneth80/k-chart@latest
```

Then remove the local `vendor/kchart-1.0.0.tgz` dependency if it is no longer needed.
