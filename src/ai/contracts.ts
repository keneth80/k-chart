export type KChartAIRenderer = 'svg' | 'canvas' | 'webgl';

export type KChartAIFieldType =
    | 'number'
    | 'number-array'
    | 'time'
    | 'string'
    | 'boolean'
    | 'latitude'
    | 'longitude'
    | 'geojson'
    | 'url';

export type KChartAICapabilityKind = 'preset' | 'series' | 'recipe' | 'option' | 'adapter';
export type KChartAIApiKind = 'factory' | 'config-property' | 'controller-method' | 'recipe';

export interface KChartAIFieldRole {
    id: string;
    description: string;
    types: KChartAIFieldType[];
    required?: boolean;
    multiple?: boolean;
}

export interface KChartAIRowCountGuidance {
    idealMax?: number;
    supportedMax?: number;
    note?: string;
}

export interface KChartAICapability {
    id: string;
    kind: KChartAICapabilityKind;
    displayName: string;
    description: string;
    apiKind: KChartAIApiKind;
    apiName: string;
    importPath: string;
    renderers: KChartAIRenderer[];
    fieldRoles: KChartAIFieldRole[];
    recommendedFor: string[];
    avoidWhen?: string[];
    compatibleOptions?: string[];
    rowCount?: KChartAIRowCountGuidance;
    tags?: string[];
    docsPath?: string;
    repositoryPath?: string;
    examplePaths?: string[];
    configType?: string;
    browserOnly?: boolean;
    requires?: string[];
    packageName?: string;
}

export interface KChartAIRendererMetadata {
    id: KChartAIRenderer;
    displayName: string;
    recommendedFor: string[];
    tradeoffs: string[];
}

export interface KChartAICatalog {
    version: 1;
    renderers: KChartAIRendererMetadata[];
    capabilities: KChartAICapability[];
}

export interface KChartAIDataField {
    name: string;
    type: KChartAIFieldType;
    nullable?: boolean;
    sampleValues?: Array<string | number | boolean | null | number[]>;
}

export interface KChartAIFieldBinding {
    role: string;
    field?: string;
    fields?: string[];
}

export interface KChartAIPlanAxis {
    field: string;
    type: 'number' | 'time' | 'string' | 'point';
    placement: 'top' | 'right' | 'bottom' | 'left';
    title?: string;
    min?: number | string;
    max?: number | string;
    tickCount?: number;
}

export interface KChartAIPlanSeries {
    capability: string;
    renderer: KChartAIRenderer;
    bindings: KChartAIFieldBinding[];
    displayName?: string;
    settings?: Record<string, unknown>;
}

export interface KChartAIPlanAdapter {
    capability: string;
    bindings?: KChartAIFieldBinding[];
    settings?: Record<string, unknown>;
}

export interface KChartAIPlanOption {
    capability: string;
    enabled?: boolean;
    settings?: Record<string, unknown>;
}

export interface KChartAIPlan {
    version: 1;
    intent: string;
    title?: string;
    data: {
        shape: 'records';
        fields: KChartAIDataField[];
        rowCount?: number;
    };
    axes?: KChartAIPlanAxis[];
    series?: KChartAIPlanSeries[];
    adapters?: KChartAIPlanAdapter[];
    options?: KChartAIPlanOption[];
    theme?: 'dark' | 'light';
    rationale?: string[];
    warnings?: string[];
}

export type KChartAIValidationIssueCode =
    | 'invalid-plan'
    | 'unknown-property'
    | 'unknown-capability'
    | 'invalid-renderer'
    | 'missing-binding'
    | 'invalid-binding'
    | 'field-type-mismatch'
    | 'incompatible-option'
    | 'unknown-field'
    | 'row-count-warning';

export interface KChartAIValidationIssue {
    code: KChartAIValidationIssueCode;
    path: string;
    message: string;
    severity: 'error' | 'warning';
}

export interface KChartAIPlanValidationResult {
    valid: boolean;
    plan?: KChartAIPlan;
    issues: KChartAIValidationIssue[];
}
