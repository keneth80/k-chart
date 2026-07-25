import type {
    KChartAICapability,
    KChartAIFieldBinding,
    KChartAIFieldType,
    KChartAIPlan,
    KChartAIPlanValidationResult,
    KChartAIValidationIssue
} from './contracts';
import {findKChartAICapability, kChartAICatalog} from './catalog';

const topLevelKeys = [
    'version',
    'intent',
    'title',
    'data',
    'axes',
    'series',
    'adapters',
    'options',
    'theme',
    'rationale',
    'warnings'
];

const fieldTypes = new Set<KChartAIFieldType>([
    'number',
    'number-array',
    'time',
    'string',
    'boolean',
    'latitude',
    'longitude',
    'geojson',
    'url'
]);
const rendererIds = new Set(['svg', 'canvas', 'webgl']);
const axisTypes = new Set(['number', 'time', 'string', 'point']);
const axisPlacements = new Set(['top', 'right', 'bottom', 'left']);
const themes = new Set(['dark', 'light']);
const dangerousSettingKeys = new Set(['__proto__', 'prototype', 'constructor']);
const numericSettingKeys = new Set([
    'strokeWidth',
    'lineWidth',
    'fontSize',
    'fontWeight',
    'fillOpacity',
    'opacity',
    'radius',
    'markerRadius',
    'pointSize',
    'duration',
    'threshold',
    'barRatio',
    'barRadius',
    'innerRadiusRatio',
    'minRadius',
    'maxRadius',
    'candleWidth',
    'minCandleWidth',
    'maxCandleWidth',
    'gap',
    'thickness',
    'zoomScale',
    'focusZoom',
    'mapZoomThreshold',
    'globeZoomThreshold'
]);
const booleanSettingKeys = new Set([
    'visible',
    'enabled',
    'selectable',
    'dot',
    'wheelZoom',
    'gestureZoom',
    'resetOnDoubleClick',
    'respectReducedMotion',
    'draggable',
    'autoMapOnZoom',
    'resetControl',
    'graticuleVisible',
    'landVisible',
    'countryBordersVisible'
]);

const pushIssue = (
    issues: KChartAIValidationIssue[],
    issue: KChartAIValidationIssue
): void => {
    issues.push(issue);
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
    Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const validateJsonSettingValue = (
    value: unknown,
    path: string,
    issues: KChartAIValidationIssue[],
    seen: Set<object> = new Set()
): void => {
    if (
        value === null
        || typeof value === 'string'
        || typeof value === 'boolean'
    ) {
        return;
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path,
                message: 'Settings numbers must be finite JSON numbers.',
                severity: 'error'
            });
        }
        return;
    }
    if (typeof value !== 'object') {
        pushIssue(issues, {
            code: 'invalid-plan',
            path,
            message: 'Settings must contain JSON-safe values only.',
            severity: 'error'
        });
        return;
    }

    if (seen.has(value)) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path,
            message: 'Settings must not contain circular references.',
            severity: 'error'
        });
        return;
    }
    seen.add(value);

    if (Array.isArray(value)) {
        value.forEach((item, index) => {
            validateJsonSettingValue(item, `${path}[${index}]`, issues, seen);
        });
        seen.delete(value);
        return;
    }

    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path,
            message: 'Settings objects must be plain JSON objects.',
            severity: 'error'
        });
        seen.delete(value);
        return;
    }

    Object.entries(value as Record<string, unknown>).forEach(([key, item]) => {
        if (dangerousSettingKeys.has(key)) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: `${path}.${key}`,
                message: `Settings key "${key}" is not allowed.`,
                severity: 'error'
            });
            return;
        }
        validateJsonSettingValue(item, `${path}.${key}`, issues, seen);
    });
    seen.delete(value);
};

const validateKnownSettingTypes = (
    settings: Record<string, unknown>,
    path: string,
    issues: KChartAIValidationIssue[],
    seen: Set<object> = new Set()
): void => {
    if (seen.has(settings)) {
        return;
    }
    seen.add(settings);
    Object.entries(settings).forEach(([key, value]) => {
        const valuePath = `${path}.${key}`;
        if (
            numericSettingKeys.has(key)
            && (typeof value !== 'number' || !Number.isFinite(value))
        ) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: valuePath,
                message: `${key} must be a finite number.`,
                severity: 'error'
            });
        }
        if (booleanSettingKeys.has(key) && typeof value !== 'boolean') {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: valuePath,
                message: `${key} must be a boolean.`,
                severity: 'error'
            });
        }
        if (
            key === 'scaleExtent'
            && (
                !Array.isArray(value)
                || value.length !== 2
                || value.some((item) => typeof item !== 'number' || !Number.isFinite(item))
            )
        ) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: valuePath,
                message: 'scaleExtent must contain two finite numbers.',
                severity: 'error'
            });
        }
        if (
            key === 'direction'
            && value !== 'x'
            && value !== 'y'
            && value !== 'both'
        ) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: valuePath,
                message: 'direction must be "x", "y", or "both".',
                severity: 'error'
            });
        }
        if (isRecord(value)) {
            validateKnownSettingTypes(value, valuePath, issues, seen);
        }
    });
    seen.delete(settings);
};

const reportUnknownKeys = (
    value: Record<string, unknown>,
    allowedKeys: string[],
    path: string,
    issues: KChartAIValidationIssue[]
): void => {
    Object.keys(value).forEach((key) => {
        if (!allowedKeys.includes(key)) {
            pushIssue(issues, {
                code: 'unknown-property',
                path: `${path}.${key}`,
                message: `Unknown property "${key}".`,
                severity: 'error'
            });
        }
    });
};

const validateBindings = (
    capability: KChartAICapability,
    bindings: KChartAIFieldBinding[],
    fields: Map<string, KChartAIFieldType>,
    path: string,
    issues: KChartAIValidationIssue[]
): void => {
    const roles = new Map(capability.fieldRoles.map((role) => [role.id, role]));
    const boundRoles = new Set<string>();

    bindings.forEach((binding, bindingIndex) => {
        const bindingPath = `${path}.bindings[${bindingIndex}]`;
        if (!isRecord(binding)) {
            pushIssue(issues, {
                code: 'invalid-binding',
                path: bindingPath,
                message: 'Binding must be an object.',
                severity: 'error'
            });
            return;
        }
        reportUnknownKeys(binding, ['role', 'field', 'fields'], bindingPath, issues);
        if (typeof binding.role !== 'string' || binding.role.length === 0) {
            pushIssue(issues, {
                code: 'invalid-binding',
                path: `${bindingPath}.role`,
                message: 'Binding role must be a non-empty string.',
                severity: 'error'
            });
            return;
        }
        const role = roles.get(binding.role);
        if (!role) {
            pushIssue(issues, {
                code: 'invalid-binding',
                path: `${bindingPath}.role`,
                message: `Role "${binding.role}" is not supported by ${capability.id}.`,
                severity: 'error'
            });
            return;
        }

        boundRoles.add(binding.role);
        const hasField = typeof binding.field === 'string' && binding.field.length > 0;
        const hasFields = Array.isArray(binding.fields)
            && binding.fields.length > 0
            && binding.fields.every((field) => typeof field === 'string' && field.length > 0);
        const values = hasFields
            ? binding.fields!
            : hasField
                ? [binding.field!]
                : [];
        if (values.length === 0 || (binding.field !== undefined && binding.fields !== undefined)) {
            pushIssue(issues, {
                code: 'invalid-binding',
                path: bindingPath,
                message: 'A binding must contain exactly one of "field" or "fields".',
                severity: 'error'
            });
            return;
        }

        if (!role.multiple && values.length > 1) {
            pushIssue(issues, {
                code: 'invalid-binding',
                path: bindingPath,
                message: `Role "${binding.role}" accepts only one field.`,
                severity: 'error'
            });
        }

        values.forEach((field) => {
            const fieldType = fields.get(field);
            if (!fieldType) {
                pushIssue(issues, {
                    code: 'unknown-field',
                    path: bindingPath,
                    message: `Field "${field}" is not declared in plan.data.fields.`,
                    severity: 'error'
                });
            } else if (!role.types.includes(fieldType)) {
                pushIssue(issues, {
                    code: 'field-type-mismatch',
                    path: bindingPath,
                    message: `Role "${binding.role}" expects ${role.types.join(' or ')}, but "${field}" is ${fieldType}.`,
                    severity: 'error'
                });
            }
        });
    });

    capability.fieldRoles
        .filter((role) => role.required)
        .forEach((role) => {
            if (!boundRoles.has(role.id)) {
                pushIssue(issues, {
                    code: 'missing-binding',
                    path,
                    message: `${capability.id} requires a "${role.id}" field binding.`,
                    severity: 'error'
                });
            }
        });
};

export const validateKChartAIPlan = (
    input: unknown
): KChartAIPlanValidationResult => {
    const issues: KChartAIValidationIssue[] = [];
    if (!isRecord(input)) {
        return {
            valid: false,
            issues: [{
                code: 'invalid-plan',
                path: '$',
                message: 'ChartPlan must be an object.',
                severity: 'error'
            }]
        };
    }

    reportUnknownKeys(input, topLevelKeys, '$', issues);

    if (input.version !== 1) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.version',
            message: 'ChartPlan version must be 1.',
            severity: 'error'
        });
    }
    if (typeof input.intent !== 'string' || input.intent.trim().length === 0) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.intent',
            message: 'ChartPlan intent must be a non-empty string.',
            severity: 'error'
        });
    }
    if (input.title !== undefined && typeof input.title !== 'string') {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.title',
            message: 'ChartPlan title must be a string.',
            severity: 'error'
        });
    }
    if (input.theme !== undefined && !themes.has(input.theme as string)) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.theme',
            message: 'ChartPlan theme must be "dark" or "light".',
            severity: 'error'
        });
    }
    for (const key of ['rationale', 'warnings']) {
        const value = input[key];
        if (
            value !== undefined
            && (!Array.isArray(value) || !value.every((item) => typeof item === 'string'))
        ) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: `$.${key}`,
                message: `${key} must be an array of strings.`,
                severity: 'error'
            });
        }
    }

    const data = input.data;
    const dataRecord = isRecord(data) ? data : undefined;
    const declaredFieldTypes = new Map<string, KChartAIFieldType>();
    if (!dataRecord || dataRecord.shape !== 'records' || !Array.isArray(dataRecord.fields)) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.data',
            message: 'ChartPlan data must declare record-shaped fields.',
            severity: 'error'
        });
    } else {
        reportUnknownKeys(dataRecord, ['shape', 'fields', 'rowCount'], '$.data', issues);
        if (
            dataRecord.rowCount !== undefined
            && (
                typeof dataRecord.rowCount !== 'number'
                || !Number.isInteger(dataRecord.rowCount)
                || dataRecord.rowCount < 0
            )
        ) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: '$.data.rowCount',
                message: 'rowCount must be a non-negative integer.',
                severity: 'error'
            });
        }
        dataRecord.fields.forEach((rawField, index) => {
            const path = `$.data.fields[${index}]`;
            if (!isRecord(rawField)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path,
                    message: 'Data field must be an object.',
                    severity: 'error'
                });
                return;
            }
            reportUnknownKeys(rawField, ['name', 'type', 'nullable', 'sampleValues'], path, issues);
            if (typeof rawField.name !== 'string' || typeof rawField.type !== 'string') {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path,
                    message: 'Data field requires string name and type values.',
                    severity: 'error'
                });
                return;
            }
            if (rawField.name.length === 0) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.name`,
                    message: 'Data field name must not be empty.',
                    severity: 'error'
                });
            }
            if (rawField.nullable !== undefined && typeof rawField.nullable !== 'boolean') {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.nullable`,
                    message: 'nullable must be a boolean.',
                    severity: 'error'
                });
            }
            if (rawField.sampleValues !== undefined) {
                const validSamples = Array.isArray(rawField.sampleValues)
                    && rawField.sampleValues.length <= 8
                    && rawField.sampleValues.every((sample) =>
                        sample === null
                        || ['string', 'number', 'boolean'].includes(typeof sample)
                        || (
                            Array.isArray(sample)
                            && sample.every((item) => typeof item === 'number')
                        )
                    );
                if (!validSamples) {
                    pushIssue(issues, {
                        code: 'invalid-plan',
                        path: `${path}.sampleValues`,
                        message: 'sampleValues must contain at most eight JSON-safe primitive or number-array values.',
                        severity: 'error'
                    });
                }
            }
            if (!fieldTypes.has(rawField.type as KChartAIFieldType)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.type`,
                    message: `Unknown data field type "${rawField.type}".`,
                    severity: 'error'
                });
                return;
            }
            if (declaredFieldTypes.has(rawField.name)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.name`,
                    message: `Duplicate data field "${rawField.name}".`,
                    severity: 'error'
                });
                return;
            }
            declaredFieldTypes.set(rawField.name, rawField.type as KChartAIFieldType);
        });
    }

    if (
        input.series !== undefined
        && (!Array.isArray(input.series) || input.series.length === 0)
    ) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.series',
            message: 'series must be a non-empty array when provided.',
            severity: 'error'
        });
    } else if (Array.isArray(input.series)) {
        input.series.forEach((rawSeries, index) => {
            const path = `$.series[${index}]`;
            if (!isRecord(rawSeries)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path,
                    message: 'Series plan must be an object.',
                    severity: 'error'
                });
                return;
            }
            reportUnknownKeys(
                rawSeries,
                ['capability', 'renderer', 'bindings', 'displayName', 'settings'],
                path,
                issues
            );
            if (
                rawSeries.displayName !== undefined
                && typeof rawSeries.displayName !== 'string'
            ) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.displayName`,
                    message: 'displayName must be a string.',
                    severity: 'error'
                });
            }
            if (rawSeries.settings !== undefined && !isRecord(rawSeries.settings)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.settings`,
                    message: 'settings must be an object.',
                    severity: 'error'
                });
            } else if (rawSeries.settings !== undefined) {
                validateJsonSettingValue(
                    rawSeries.settings,
                    `${path}.settings`,
                    issues
                );
                validateKnownSettingTypes(
                    rawSeries.settings as Record<string, unknown>,
                    `${path}.settings`,
                    issues
                );
            }

            const capabilityId = typeof rawSeries.capability === 'string'
                ? rawSeries.capability
                : '';
            const capability = findKChartAICapability(capabilityId);
            if (
                !capability
                || !['series', 'preset', 'recipe'].includes(capability.kind)
            ) {
                pushIssue(issues, {
                    code: 'unknown-capability',
                    path: `${path}.capability`,
                    message: `Unknown chart capability "${capabilityId}".`,
                    severity: 'error'
                });
                return;
            }

            if (
                typeof rawSeries.renderer !== 'string'
                || !rendererIds.has(rawSeries.renderer)
                || !capability.renderers.includes(rawSeries.renderer as any)
            ) {
                pushIssue(issues, {
                    code: 'invalid-renderer',
                    path: `${path}.renderer`,
                    message: `${capability.id} supports: ${capability.renderers.join(', ')}.`,
                    severity: 'error'
                });
            }

            const bindings = Array.isArray(rawSeries.bindings)
                ? rawSeries.bindings as unknown as KChartAIFieldBinding[]
                : [];
            if (!Array.isArray(rawSeries.bindings)) {
                pushIssue(issues, {
                    code: 'invalid-binding',
                    path: `${path}.bindings`,
                    message: 'Series bindings must be an array.',
                    severity: 'error'
                });
            } else {
                validateBindings(capability, bindings, declaredFieldTypes, path, issues);
            }

            const rowCount = typeof dataRecord?.rowCount === 'number'
                ? dataRecord.rowCount
                : undefined;
            if (
                rowCount !== undefined
                && capability.rowCount?.idealMax !== undefined
                && rowCount > capability.rowCount.idealMax
            ) {
                pushIssue(issues, {
                    code: 'row-count-warning',
                    path,
                    message: `${capability.id} is ideally used at or below ${capability.rowCount.idealMax.toLocaleString()} rows.`,
                    severity: 'warning'
                });
            }
        });
    }

    if (input.adapters !== undefined && !Array.isArray(input.adapters)) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.adapters',
            message: 'adapters must be an array.',
            severity: 'error'
        });
    } else if (Array.isArray(input.adapters)) {
        if (input.adapters.length === 0) {
            pushIssue(issues, {
                code: 'invalid-plan',
                path: '$.adapters',
                message: 'adapters must not be empty when provided.',
                severity: 'error'
            });
        }
        input.adapters.forEach((rawAdapter, index) => {
            const path = `$.adapters[${index}]`;
            if (!isRecord(rawAdapter)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path,
                    message: 'Adapter plan must be an object.',
                    severity: 'error'
                });
                return;
            }
            reportUnknownKeys(rawAdapter, ['capability', 'bindings', 'settings'], path, issues);
            const capabilityId = typeof rawAdapter.capability === 'string'
                ? rawAdapter.capability
                : '';
            const capability = findKChartAICapability(capabilityId);
            if (!capability || capability.kind !== 'adapter') {
                pushIssue(issues, {
                    code: 'unknown-capability',
                    path: `${path}.capability`,
                    message: `Unknown adapter capability "${capabilityId}".`,
                    severity: 'error'
                });
                return;
            }
            if (rawAdapter.settings !== undefined && !isRecord(rawAdapter.settings)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `${path}.settings`,
                    message: 'settings must be an object.',
                    severity: 'error'
                });
            } else if (rawAdapter.settings !== undefined) {
                validateJsonSettingValue(
                    rawAdapter.settings,
                    `${path}.settings`,
                    issues
                );
            }
            const bindings = rawAdapter.bindings === undefined
                ? []
                : Array.isArray(rawAdapter.bindings)
                    ? rawAdapter.bindings as unknown as KChartAIFieldBinding[]
                    : [];
            if (rawAdapter.bindings !== undefined && !Array.isArray(rawAdapter.bindings)) {
                pushIssue(issues, {
                    code: 'invalid-binding',
                    path: `${path}.bindings`,
                    message: 'Adapter bindings must be an array.',
                    severity: 'error'
                });
            } else {
                validateBindings(capability, bindings, declaredFieldTypes, path, issues);
            }
        });
    }

    if (
        (!Array.isArray(input.series) || input.series.length === 0)
        && (!Array.isArray(input.adapters) || input.adapters.length === 0)
    ) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$',
            message: 'ChartPlan requires at least one series or adapter.',
            severity: 'error'
        });
    }

    if (input.axes !== undefined && !Array.isArray(input.axes)) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.axes',
            message: 'axes must be an array.',
            severity: 'error'
        });
    } else if (Array.isArray(input.axes)) {
        input.axes.forEach((rawAxis, index) => {
            if (!isRecord(rawAxis) || typeof rawAxis.field !== 'string') {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `$.axes[${index}]`,
                    message: 'Axis requires field, type, and placement.',
                    severity: 'error'
                });
                return;
            }
            reportUnknownKeys(
                rawAxis,
                ['field', 'type', 'placement', 'title', 'min', 'max', 'tickCount'],
                `$.axes[${index}]`,
                issues
            );
            if (
                !axisTypes.has(rawAxis.type as string)
                || !axisPlacements.has(rawAxis.placement as string)
            ) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `$.axes[${index}]`,
                    message: 'Axis type or placement is invalid.',
                    severity: 'error'
                });
            }
            const declaredType = declaredFieldTypes.get(rawAxis.field);
            const axisType = rawAxis.type as string;
            const compatibleAxisType = declaredType === 'time'
                ? axisType === 'time'
                : declaredType === 'string' || declaredType === 'boolean'
                    ? axisType === 'point' || axisType === 'string'
                    : declaredType === 'number'
                        || declaredType === 'latitude'
                        || declaredType === 'longitude'
                        ? axisType === 'number'
                        : false;
            if (declaredType && !compatibleAxisType) {
                pushIssue(issues, {
                    code: 'field-type-mismatch',
                    path: `$.axes[${index}].type`,
                    message: `Axis type "${axisType}" is not compatible with ${declaredType} field "${rawAxis.field}".`,
                    severity: 'error'
                });
            }
            if (rawAxis.title !== undefined && typeof rawAxis.title !== 'string') {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `$.axes[${index}].title`,
                    message: 'Axis title must be a string.',
                    severity: 'error'
                });
            }
            if (
                rawAxis.tickCount !== undefined
                && (
                    typeof rawAxis.tickCount !== 'number'
                    || !Number.isInteger(rawAxis.tickCount)
                    || rawAxis.tickCount < 1
                )
            ) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `$.axes[${index}].tickCount`,
                    message: 'tickCount must be a positive integer.',
                    severity: 'error'
                });
            }
            for (const bound of ['min', 'max']) {
                const value = rawAxis[bound];
                const validNumberBound = axisType === 'number'
                    && typeof value === 'number'
                    && Number.isFinite(value);
                const validTimeBound = axisType === 'time'
                    && (
                        typeof value === 'number'
                        && Number.isFinite(value)
                        || typeof value === 'string'
                        && value.trim().length > 0
                        && Number.isFinite(Date.parse(value))
                    );
                const validCategoricalBound = (axisType === 'point' || axisType === 'string')
                    && (typeof value === 'number' || typeof value === 'string');
                if (value !== undefined && !validNumberBound && !validTimeBound && !validCategoricalBound) {
                    pushIssue(issues, {
                        code: 'invalid-plan',
                        path: `$.axes[${index}].${bound}`,
                        message: `${bound} is invalid for a ${axisType} axis.`,
                        severity: 'error'
                    });
                }
            }
            if (!declaredFieldTypes.has(rawAxis.field)) {
                pushIssue(issues, {
                    code: 'unknown-field',
                    path: `$.axes[${index}].field`,
                    message: `Axis field "${rawAxis.field}" is not declared in plan.data.fields.`,
                    severity: 'error'
                });
            }
        });
    }

    if (input.options !== undefined && !Array.isArray(input.options)) {
        pushIssue(issues, {
            code: 'invalid-plan',
            path: '$.options',
            message: 'options must be an array.',
            severity: 'error'
        });
    } else if (Array.isArray(input.options)) {
        const seriesCapabilities = Array.isArray(input.series)
            ? input.series
                .filter(isRecord)
                .map((item) => typeof item.capability === 'string'
                    ? findKChartAICapability(item.capability)
                    : undefined)
                .filter((item): item is KChartAICapability => Boolean(item))
            : [];

        input.options.forEach((rawOption, index) => {
            const path = `$.options[${index}].capability`;
            if (!isRecord(rawOption) || typeof rawOption.capability !== 'string') {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path,
                    message: 'Option capability must be a string.',
                    severity: 'error'
                });
                return;
            }
            reportUnknownKeys(
                rawOption,
                ['capability', 'enabled', 'settings'],
                `$.options[${index}]`,
                issues
            );
            if (rawOption.enabled !== undefined && typeof rawOption.enabled !== 'boolean') {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `$.options[${index}].enabled`,
                    message: 'enabled must be a boolean.',
                    severity: 'error'
                });
            }
            if (rawOption.settings !== undefined && !isRecord(rawOption.settings)) {
                pushIssue(issues, {
                    code: 'invalid-plan',
                    path: `$.options[${index}].settings`,
                    message: 'settings must be an object.',
                    severity: 'error'
                });
            } else if (rawOption.settings !== undefined) {
                validateJsonSettingValue(
                    rawOption.settings,
                    `${path}.settings`,
                    issues
                );
                validateKnownSettingTypes(
                    rawOption.settings as Record<string, unknown>,
                    `${path}.settings`,
                    issues
                );
            }

            const capability = findKChartAICapability(rawOption.capability);
            if (!capability || capability.kind !== 'option') {
                pushIssue(issues, {
                    code: 'unknown-capability',
                    path,
                    message: `Unknown option capability "${rawOption.capability}".`,
                    severity: 'error'
                });
                return;
            }

            if (
                seriesCapabilities.length === 0
                && Array.isArray(input.adapters)
                && input.adapters.length > 0
            ) {
                pushIssue(issues, {
                    code: 'incompatible-option',
                    path,
                    message: `${capability.id} is a core chart option. Configure adapter interaction through adapters[].settings.`,
                    severity: 'error'
                });
            }

            seriesCapabilities.forEach((seriesCapability) => {
                if (
                    seriesCapability.compatibleOptions
                    && !seriesCapability.compatibleOptions.includes(capability.id)
                ) {
                    pushIssue(issues, {
                        code: 'incompatible-option',
                        path,
                        message: `${capability.id} is not compatible with ${seriesCapability.id}.`,
                        severity: 'error'
                    });
                }
            });

            if (capability.id === 'option.zoom' && Array.isArray(input.series)) {
                input.series.filter(isRecord).forEach((seriesPlan, seriesIndex) => {
                    if (!Array.isArray(seriesPlan.bindings)) {
                        return;
                    }
                    const xBinding = seriesPlan.bindings
                        .filter(isRecord)
                        .find((binding) => binding.role === 'x');
                    const xField = typeof xBinding?.field === 'string'
                        ? xBinding.field
                        : undefined;
                    const xType = xField ? declaredFieldTypes.get(xField) : undefined;
                    if (xType === 'string' || xType === 'boolean') {
                        pushIssue(issues, {
                            code: 'incompatible-option',
                            path,
                            message: `option.zoom is not supported for categorical x field "${xField}" in series[${seriesIndex}].`,
                            severity: 'error'
                        });
                    }
                });
            }
        });
    }

    const valid = !issues.some((issue) => issue.severity === 'error');
    return {
        valid,
        plan: valid ? input as unknown as KChartAIPlan : undefined,
        issues
    };
};

export const assertKChartAIPlan = (input: unknown): KChartAIPlan => {
    const result = validateKChartAIPlan(input);
    if (!result.valid || !result.plan) {
        const message = result.issues
            .filter((issue) => issue.severity === 'error')
            .map((issue) => `${issue.path}: ${issue.message}`)
            .join('\n');
        throw new Error(`Invalid KChart AI ChartPlan:\n${message}`);
    }
    return result.plan;
};

export const listKChartAICapabilityIds = (): string[] =>
    kChartAICatalog.capabilities.map((capability) => capability.id);
