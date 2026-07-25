# KChart instructions for Claude Code

Follow `AGENTS.md` and the canonical AI guide in `docs/ai/index.md`.

Before generating or modifying a chart:

1. inspect `ai/catalog.json`,
2. select a real capability id,
3. bind every required data role,
4. choose a supported renderer,
5. validate with `validateKChartAIPlan`,
6. compile through application-owned code without `eval`.

Use `docs/ai/chart-selection.md` for renderer and chart choice. Run `npm run test:unit` after changes.
