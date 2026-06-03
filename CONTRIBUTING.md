# Contributing

Thanks for taking time to improve this project.

## Development Setup

```bash
npm install
npm run typecheck
npm run build
```

Run the demo locally:

```bash
npm run dev
```

The demo runs on `http://127.0.0.1:8083/`.

## Pull Request Checklist

- Keep changes focused on one feature or bug fix.
- Update `README.md` or files in `docs/` when public APIs change.
- Run `npm run typecheck` and `npm run build` before opening a PR.
- Avoid committing generated archives, `node_modules`, local editor files, or OS metadata.

## Coding Style

- Prefer the functional chart API for new integration examples.
- Keep class API compatibility unless the change is explicitly documented as breaking.
- Place reusable chart behavior in focused helper modules instead of growing `chart-base.ts`.

