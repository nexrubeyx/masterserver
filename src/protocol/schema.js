import Ajv from 'ajv';

const ajv = new Ajv({ coerceTypes: true, useDefaults: true, removeAdditional: true });

export const schemaByType = {
  client: {
    type: 'object',
    required: ['type', 'ver', 'mobile', 'agent'],
    additionalProperties: true,
    properties: {
      type: { const: 'client' },
      ver: { type: 'string' },
      mobile: { type: 'boolean' },
      agent: { type: 'string', maxLength: 512 }
    }
  },
  login: {
    type: 'object',
    required: ['type'],
    additionalProperties: true,
    properties: {
      type: { const: 'login' },
      user: { type: 'string', maxLength: 128 },
      pass: { type: 'string', maxLength: 256 },
      email: { type: 'string', maxLength: 256 }
    }
  },
  guest: {
    type: 'object',
    required: ['type'],
    properties: { type: { const: 'guest' } },
    additionalProperties: false
  },
  chat: {
    type: 'object',
    required: ['type', 'data'],
    properties: {
      type: { const: 'chat' },
      data: { type: 'string', maxLength: 2048 }
    },
    additionalProperties: false
  },
  h: {
    type: 'object',
    required: ['type', 'x', 'y'],
    properties: {
      type: { const: 'h' },
      x: { type: 'integer', minimum: -99999, maximum: 99999 },
      y: { type: 'integer', minimum: -99999, maximum: 99999 },
      d: { type: 'integer', minimum: 0, maximum: 3 }
    },
    additionalProperties: false
  },
  m: {
    type: 'object',
    required: ['type', 'x', 'y', 'd'],
    properties: {
      type: { const: 'm' },
      x: { type: 'integer' },
      y: { type: 'integer' },
      d: { type: 'integer', minimum: 0, maximum: 3 }
    },
    additionalProperties: false
  },
  P: {
    type: 'object',
    required: ['type'],
    properties: { type: { const: 'P' } },
    additionalProperties: false
  }
};

const validators = {};
for (const [key, schema] of Object.entries(schemaByType)) {
  validators[key] = ajv.compile(schema);
}

export function validatePacket(obj) {
  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['Invalid JSON'] };
  const t = obj.type;
  if (!t || !validators[t]) return { ok: false, errors: ['Unknown type'] };
  const valid = validators[t](obj);
  if (!valid) return { ok: false, errors: validators[t].errors };
  return { ok: true };
}