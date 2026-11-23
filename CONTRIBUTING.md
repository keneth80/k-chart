# Contributing

Thanks for taking time to improve this project.

## Development Setup

```bash
npm ci
npm run ci:adapters
npm run typecheck
npm run test:unit
npm run build-demo
npm run pack:dry
```

Run the demo locally:

```bash
npm run dev
```

The demo runs on `http://127.0.0.1:9003/`.

## Pull Request Checklist

- Keep changes focused on one feature or bug fix.
- Update `README.md` or files in `docs/` when public APIs change.
- Run the validation commands from Development Setup before opening a PR.
- Avoid committing generated archives, `node_modules`, local editor files, or OS metadata.

## Coding Style

- Prefer the functional chart API for new integration examples.
- Preserve backward compatibility for documented public APIs and package-root imports unless the change is explicitly documented as breaking. The runtime implementation remains class-free.
- Place reusable chart behavior in the focused ownership area under `src/core/`, `src/series/`, `src/options/`, or `src/utils/`.
