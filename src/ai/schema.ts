export const kChartAIPlanJsonSchema = {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/keneth80/k-chart/blob/main/ai/chart-plan.schema.json',
    title: 'KChart AI ChartPlan',
    description: 'Provider-neutral declarative plan compiled into a KChart configuration.',
    type: 'object',
    additionalProperties: false,
    $defs: {
        jsonValue: {
            anyOf: [
                {type: ['string', 'number', 'boolean', 'null']},
                {
                    type: 'array',
                    items: {$ref: '#/$defs/jsonValue'}
                },
                {$ref: '#/$defs/settings'}
            ]
        },
        settings: {
            type: 'object',
            propertyNames: {
                not: {
                    enum: ['__proto__', 'prototype', 'constructor']
                }
            },
            additionalProperties: {$ref: '#/$defs/jsonValue'}
        }
    },
    required: ['version', 'intent', 'data'],
    anyOf: [
        {required: ['series']},
        {required: ['adapters']}
    ],
    properties: {
        version: {const: 1},
        intent: {type: 'string', minLength: 1},
        title: {type: 'string'},
        data: {
            type: 'object',
            additionalProperties: false,
            required: ['shape', 'fields'],
            properties: {
                shape: {const: 'records'},
                rowCount: {type: 'integer', minimum: 0},
                fields: {
                    type: 'array',
                    items: {
                        type: 'object',
                        additionalProperties: false,
                        required: ['name', 'type'],
                        properties: {
                            name: {type: 'string', minLength: 1},
                            type: {
                                enum: [
                                    'number',
                                    'number-array',
                                    'time',
                                    'string',
                                    'boolean',
                                    'latitude',
                                    'longitude',
                                    'geojson',
                                    'url'
                                ]
                            },
                            nullable: {type: 'boolean'},
                            sampleValues: {
                                type: 'array',
                                maxItems: 8,
                                items: {
                                    anyOf: [
                                        {type: ['string', 'number', 'boolean', 'null']},
                                        {
                                            type: 'array',
                                            items: {type: 'number'}
                                        }
                                    ]
                                }
                            }
                        }
                    }
                }
            }
        },
        axes: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['field', 'type', 'placement'],
                properties: {
                    field: {type: 'string', minLength: 1},
                    type: {enum: ['number', 'time', 'string', 'point']},
                    placement: {enum: ['top', 'right', 'bottom', 'left']},
                    title: {type: 'string'},
                    min: {type: ['number', 'string']},
                    max: {type: ['number', 'string']},
                    tickCount: {type: 'integer', minimum: 1}
                }
            }
        },
        series: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['capability', 'renderer', 'bindings'],
                properties: {
                    capability: {type: 'string', minLength: 1},
                    renderer: {enum: ['svg', 'canvas', 'webgl']},
                    displayName: {type: 'string'},
                    bindings: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['role'],
                            properties: {
                                role: {type: 'string', minLength: 1},
                                field: {type: 'string', minLength: 1},
                                fields: {
                                    type: 'array',
                                    minItems: 1,
                                    items: {type: 'string', minLength: 1}
                                }
                            },
                            oneOf: [
                                {required: ['field']},
                                {required: ['fields']}
                            ]
                        }
                    },
                    settings: {$ref: '#/$defs/settings'}
                }
            }
        },
        adapters: {
            type: 'array',
            minItems: 1,
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['capability'],
                properties: {
                    capability: {type: 'string', minLength: 1},
                    bindings: {
                        type: 'array',
                        items: {
                            type: 'object',
                            additionalProperties: false,
                            required: ['role'],
                            properties: {
                                role: {type: 'string', minLength: 1},
                                field: {type: 'string', minLength: 1},
                                fields: {
                                    type: 'array',
                                    minItems: 1,
                                    items: {type: 'string', minLength: 1}
                                }
                            },
                            oneOf: [
                                {required: ['field']},
                                {required: ['fields']}
                            ]
                        }
                    },
                    settings: {$ref: '#/$defs/settings'}
                }
            }
        },
        options: {
            type: 'array',
            items: {
                type: 'object',
                additionalProperties: false,
                required: ['capability'],
                properties: {
                    capability: {type: 'string', minLength: 1},
                    enabled: {type: 'boolean'},
                    settings: {$ref: '#/$defs/settings'}
                }
            }
        },
        theme: {enum: ['dark', 'light']},
        rationale: {
            type: 'array',
            items: {type: 'string'}
        },
        warnings: {
            type: 'array',
            items: {type: 'string'}
        }
    }
} as const;
