export const STUDIO_RESULT_SCHEMA = {
  name: 'studio_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      meta: {
        type: 'object',
        properties: {
          engine: { type: 'string', enum: ['local-stub', 'llm'] },
          engineVersion: { type: 'string' },
          computedAt: { type: 'string' },
          warnings: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['engine', 'engineVersion', 'computedAt', 'warnings'],
        additionalProperties: false,
      },
      turns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            seat: { type: 'string', enum: ['maya', 'luna', 'orion', 'karma'] },
            text: { type: 'string' },
          },
          required: ['seat', 'text'],
          additionalProperties: false,
        },
        minItems: 4,
        maxItems: 8,
      },
      nextSteps: {
        type: 'array',
        items: { type: 'string' },
        minItems: 3,
        maxItems: 3,
      },
      watchOut: { type: 'string', minLength: 10 },
    },
    required: ['meta', 'turns', 'nextSteps', 'watchOut'],
    additionalProperties: false,
  },
} as const;
