# KChart AI integration

KChart AI integration is a provider-neutral planning layer. A language model selects a supported visualization and returns a declarative `ChartPlan`; deterministic application code validates that plan and compiles it into KChart configuration.

The model must not return executable JavaScript or TypeScript. This keeps provider output inspectable, testable, and safe to reject without replacing the currently rendered chart.

## Sources of truth

| Resource | Purpose |
| --- | --- |
| `src/ai/catalog.ts` | Typed capability metadata used at runtime |
| `ai/catalog.json` | Generated catalog for tools that do not import TypeScript |
| `src/ai/schema.ts` | Source JSON Schema object |
| `ai/chart-plan.schema.json` | Generated model-output schema |
| `ai/examples/intent-to-config.jsonl` | Natural-language examples and regression fixtures |
| `docs/ai/chart-selection.md` | Human-readable selection policy |

Run the following after changing the catalog or schema:

```bash
npm run generate:ai
npm run test:unit
```

`npm run test:unit` checks that committed generated artifacts match their TypeScript sources and validates every natural-language fixture.

## Recommended pipeline

```text
user prompt + data schema
        |
        v
deterministic data profiler
        |
        v
LLM returns ChartPlan JSON
        |
        v
validateKChartAIPlan()
        |
        v
compileKChartAIPlan()
        |
        v
render preview and explain selections
```

The data profiler should send field names, inferred types, nullability, row count, and a small redacted sample. It should not send an entire large dataset to the model.

## Runtime validation

```ts
import {
  assertKChartAIPlan,
  kChartAICatalog,
  kChartAIPlanJsonSchema,
  validateKChartAIPlan,
} from "@keneth80/k-chart/ai";

const result = validateKChartAIPlan(providerResponse);

if (!result.valid) {
  console.error(result.issues);
  // Keep the last successfully rendered chart.
  return;
}

const plan = assertKChartAIPlan(providerResponse);
```

Validation checks capability ids, supported renderers, required field bindings, declared data fields, option compatibility, and strict top-level properties. Row-count guidance is reported as a warning rather than silently changing the requested chart.

## Compile a validated plan

`compileKChartAIPlan()` converts provider JSON into a real `KChartConfiguration`. The application supplies the selector and actual rows, so the model never controls DOM targets, callbacks, credentials, or the full dataset.

```ts
import {
  compileKChartAIPlan,
  renderKChartAIPlan,
} from "@keneth80/k-chart/ai";

const compiled = compileKChartAIPlan(providerResponse, {
  selector: "#chart",
  data: actualRows,
  configuration: {
    width: 960,
    height: 480,
    margin: { top: 72, right: 32, bottom: 56, left: 68 },
  },
});

if (compiled.configuration) {
  console.log(compiled.configuration, compiled.warnings);
}

const rendered = renderKChartAIPlan(providerResponse, {
  selector: "#chart",
  data: actualRows,
});

await rendered.controller.whenRenderComplete();
```

The compiler validates the plan again, infers axes when they are omitted, converts time-axis bounds to `Date`, applies only capability-specific setting allowlists, and keeps categorical zoom disabled. `renderKChartAIPlan()` is a convenience for chart-series plans; adapter-only plans intentionally have no core chart configuration.

### Trusted runtime settings

Model settings are JSON-only and filtered before they reach a factory. Supply callbacks, GeoJSON, provider instances, map styles, and credentials through trusted application settings:

```ts
const compiled = compileKChartAIPlan(regionPlan, {
  selector: "#map",
  data: regionalSales,
  trustedSeriesSettings: {
    "series.geo-region-map.svg": {
      geoJson: koreaAdministrativeGeoJson,
      onRegionClick: ({ data }) => openRegion(data),
    },
  },
});
```

Use `capability#0`, `capability#1`, and so on when a plan contains the same capability more than once. A capability-wide key acts as the default and the indexed key overrides it.

### Custom series and recipes

`series.custom` and `recipe.*` need application-owned rendering or lifecycle code. Register deterministic compilers instead of asking the model to generate functions:

```ts
const compiled = compileKChartAIPlan(recipePlan, {
  selector: "#chart",
  data,
  seriesCompilers: {
    "recipe.column.stacked": ({ selector, bindings, trustedSettings }) =>
      createStackedColumnRecipe({
        ...trustedSettings,
        selector,
        xField: bindings.x as string,
        fields: bindings.segments as string[],
      }),
  },
});
```

The callback is trusted source code owned by the application. `settings` contains filtered provider JSON; `trustedSettings` contains values supplied by the application.

## Public AI entry points

Applications can import the typed runtime API without adding AI metadata to the main KChart entry bundle:

```ts
import {
  compileKChartAIPlan,
  kChartAICatalog,
  kChartAIPlanJsonSchema,
  renderKChartAIPlan,
  validateKChartAIPlan,
} from "@keneth80/k-chart/ai";
```

Tools that only need static assets can resolve these package subpaths:

- `@keneth80/k-chart/ai/catalog.json`
- `@keneth80/k-chart/ai/chart-plan.schema.json`
- `@keneth80/k-chart/llms.txt`

Each catalog entry declares both `apiKind` and `apiName`. `factory` identifies an importable function, `config-property` identifies configuration owned by the chart, `controller-method` identifies an imperative controller signal, and `recipe` identifies an application-owned composition.

## Optional adapters

Three.js, CesiumJS, and MapLibre integrations use `plan.adapters`, not `plan.series`. Adapter-only plans are valid. The compiler returns adapter descriptors with `importPath`, `apiName`, the actual data reference, field bindings, filtered plan settings, and separate trusted settings. The consuming application performs the dynamic client-side import and owns the adapter lifecycle.

Keep adapters as dynamic client-side imports in SSR frameworks. Provide tokens, map styles, imagery, terrain, and provider objects through `trustedAdapterSettings`, never through model output.

## Security boundary

- Never pass provider output to `eval`, `Function`, dynamic import, or JSX compilation.
- Map capability ids to an application-owned factory registry.
- Restrict formatters, callbacks, colors, and themes to serializable settings or registered preset ids.
- Validate remote URLs and geographic providers separately.
- Keep API tokens outside prompts and generated configuration.
- Limit sample rows and redact personal or confidential values.

## Current scope

The catalog covers first-class presets and series, documented custom recipes, core options, and optional adapter packages. `recipe.*` capabilities are intentionally separate from `series.*`: recipes require deterministic application-owned composition and do not imply that a same-named factory exists.

The deterministic ChartPlan compiler is the shared runtime boundary for the
Playground and dashboard template. The Playground provider now returns validated
JSON plans and deterministic editor source calls `compileKChartAIPlan()`; model
output is never evaluated as JavaScript. Its server API and client UI are
controlled separately with `KCHART_AI_ENABLED` and
`NEXT_PUBLIC_KCHART_AI_ENABLED`, so QA and Live builds can keep the unfinished
experience disabled.
