export const STUDIO_RESULT_SCHEMA = {
  name: 'studio_result',
  strict: true,
  schema: {
    type: 'object',
    properties: {
      turns: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            seat: { type: 'string' },
            text: { type: 'string' },
          },
          required: ['seat', 'text'],
          additionalProperties: false,
        },
      },
      nextSteps: {
        type: 'array',
        items: { type: 'string' },
      },
      watchOut: { type: 'string' },
      anchorsUsed: {
        type: 'array',
        items: { type: 'string' },
      },
    },
    required: ['turns', 'nextSteps', 'watchOut', 'anchorsUsed'],
    additionalProperties: false,
  },
} as const;
