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

## GitFlow

KChart uses a lightweight GitFlow model:

- `main`: production and npm release branch. Every commit on `main` should represent a releasable state.
- `develop`: integration branch for the next release.
- `feature/<name>`: feature work branched from `develop`, merged back into `develop`.
- `release/<version>`: release stabilization branched from `develop`, merged into `main` and then back into `develop`.
- `hotfix/<version>`: urgent production fix branched from `main`, merged into both `main` and `develop`.

### Feature Flow

```bash
git switch develop
git pull origin develop
git switch -c feature/my-feature

# work, commit, verify
npm run typecheck
npm run build:lib

git push origin feature/my-feature
```

Merge the feature into `develop` after review.

### Release Flow

```bash
git switch develop
git pull origin develop
git switch -c release/1.4.0

npm version minor --no-git-tag-version
# update CHANGELOG.md and docs
npm run typecheck
npm run build:lib
npm run pack:dry

git commit -am "Prepare 1.4.0 release"
git switch main
git merge --no-ff release/1.4.0
git tag v1.4.0
git push origin main v1.4.0

git switch develop
git merge --no-ff release/1.4.0
git push origin develop
```

Publish to npm from `main` after the release tag is pushed.

### Hotfix Flow

```bash
git switch main
git pull origin main
git switch -c hotfix/1.3.1

# fix, verify, update patch version and CHANGELOG.md
npm run typecheck
npm run build:lib
npm run pack:dry

git switch main
git merge --no-ff hotfix/1.3.1
git tag v1.3.1
git push origin main v1.3.1

git switch develop
git merge --no-ff hotfix/1.3.1
git push origin develop
```

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
