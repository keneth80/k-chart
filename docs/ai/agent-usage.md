# Using KChart with coding agents

This guide applies to Cursor, Codex, and Claude Code. The canonical rules are the same for every tool; repository-specific files only point agents to these rules.

## Prompt context

Give the agent:

1. the data shape or a small representative sample,
2. the analytical question,
3. expected update frequency and maximum row count,
4. interaction requirements,
5. target framework and cleanup lifecycle.

Example:

```text
Build a responsive operations dashboard with KChart.

Data:
- timestamp: ISO date
- cpu, memory, requests: number
- up to 3,600 retained rows, one update per second

Requirements:
- rolling one-hour Canvas line chart
- selectable legend and tooltip
- dark/light theme
- no unbounded arrays
- destroy timers and the chart controller on unmount
- explain the selected renderer and options
```

## Shared agent instruction

Add this to a consuming repository's agent instruction file:

```md
When implementing charts:

- Use `@keneth80/k-chart` public exports only.
- Read KChart `llms.txt`, `docs/ai/chart-selection.md`, and `ai/catalog.json`.
- Select a capability from the catalog before writing code.
- Prefer presets for simple line, column, pie, and doughnut charts.
- Use `createKChart` plus functional series for composed or custom visualization.
- Never invent factory names.
- Keep realtime buffers bounded and destroy controllers on unmount.
- Use `whenRenderComplete()` before export or performance measurement.
- Dynamically import browser-only MapLibre, Cesium, and Three adapters in SSR frameworks.
```

## Codex

Codex reads `AGENTS.md`. Put project-wide instructions at the repository root and narrower instructions in subdirectories when a dashboard package needs different rules.

The KChart repository's root `AGENTS.md` points to the canonical AI docs and includes validation commands. In a consuming project, include the shared instruction above and add exact build and test commands.

## Claude Code

Claude Code reads `CLAUDE.md`. Keep it short and reference the same canonical documents instead of copying the catalog into the file.

For local exceptions that must not be committed, use the tool's supported local instruction mechanism rather than placing tokens, provider keys, or private data in `CLAUDE.md`.

## Cursor

Use `.cursor/rules/*.mdc`; `.cursorrules` is legacy. A KChart rule should be focused, auto-attached to chart files where possible, and reference this guide plus `ai/catalog.json`.

The repository includes `.cursor/rules/kchart.mdc` as a starting point.

## Verification checklist

- TypeScript compilation passes.
- The selected capability exists in `ai/catalog.json`.
- Every required data role is bound to a real field.
- The renderer is supported by the capability.
- Loading, empty, error, resize, and cleanup states are handled.
- No model-generated code is evaluated.
- Large-data and realtime examples have bounded memory.
- Browser-only adapters are not executed during SSR.
