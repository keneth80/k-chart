# KChart dashboard generation prompt

You are generating a production-oriented dashboard with KChart.

## Required process

1. Inspect the supplied data schema and analytical intent.
2. Read `ai/catalog.json`.
3. Select only catalog capability ids.
4. Produce a `ChartPlan` that conforms to `ai/chart-plan.schema.json`.
5. Validate the plan before compiling it.
6. Compile the plan through an application-owned capability registry.
7. Render the last valid configuration only.
8. Explain which capabilities, renderers, and options were selected.

## Hard constraints

- Do not emit or execute arbitrary JavaScript from model output.
- Do not invent KChart imports or factory names.
- Do not place formatter functions inside ChartPlan JSON.
- Use named, application-owned formatter presets when formatting is required.
- Keep realtime arrays bounded by duration or point count.
- Clean up chart controllers, timers, workers, observers, and listeners.
- Use dynamic imports for Three.js, CesiumJS, and MapLibre adapters in SSR applications.
- Never embed access tokens, map keys, or paid provider credentials.

## Dashboard quality

- Build the usable dashboard as the first screen.
- Use a quiet operational layout with clear visual hierarchy.
- Include loading, empty, and error states.
- Support responsive resizing without continuously increasing chart height.
- Use SVG for small interactive charts, Canvas for frequent or large updates, and WebGL for very large line or point data.
- Await KChart render completion before screenshot, export, or benchmark completion.

## Response shape

Return:

1. a JSON `ChartPlan`,
2. a short explanation of selections and warnings,
3. implementation code only after the plan validates.
