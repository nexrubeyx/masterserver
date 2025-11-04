/**
 * Esquema de Protocolo - Validação de Mensagens
 * 
 * Este módulo define e valida a estrutura de todas as mensagens trocadas
 * entre cliente e servidor usando JSON Schema e a biblioteca Ajv.
 * 
 * Benefícios da validação:
 * - Previne mensagens malformadas de crashar o servidor
 * - Garante tipos corretos (números, strings, etc)
 * - Documenta o formato esperado de cada tipo de mensagem
 * - Rejeita mensagens inválidas antes de processar
 * 
 * Tipos de mensagem suportados:
 * - client: informações do cliente (versão, plataforma)
 * - login: autenticação com usuário/senha
 * - guest: entrada como visitante
 * - chat: mensagem de chat
 * - h: comando de movimento (hold)
 * - m: comando de direção (move)
 * - P: ping/keepalive
 * - pickup: coletar objeto
 * - bld: construir template no tile atual
 * - setobj: setar objetos do tile
 * - clrobj: limpar objetos do tile
 */

import Ajv from 'ajv';

// Cria instância do Ajv com opções úteis
const ajv = new Ajv({ 
  coerceTypes: true,        // Converte tipos automaticamente quando possível
  useDefaults: true,        // Aplica valores padrão de schemas
  removeAdditional: true    // Remove campos extras não definidos no schema
});

/**
 * Esquemas JSON Schema para cada tipo de mensagem
 * 
 * Cada schema define:
 * - type: sempre 'object' (mensagens são objetos JSON)
 * - required: array de campos obrigatórios
 * - properties: definição de cada campo com seu tipo e restrições
 * - additionalProperties: se permite campos extras (true/false)
 */
export const schemaByType = {
  /**
   * Mensagem 'client' - Informações do cliente
   * Enviada logo após conectar para identificar o cliente
   * 
   * Campos:
   * - type: 'client' (constante)
   * - ver: versão do cliente (ex: '5.1.2')
   * - mobile: se é dispositivo móvel (boolean)
   * - agent: user agent do navegador
   */
  client: {
    type: 'object',
    required: ['type', 'ver', 'mobile', 'agent'],
    additionalProperties: true,  // Permite campos extras
    properties: {
      type: { const: 'client' },                      // Deve ser exatamente 'client'
      ver: { type: 'string' },                        // Versão do cliente
      mobile: { type: 'boolean' },                    // Se é mobile
      agent: { type: 'string', maxLength: 512 }       // User agent (max 512 chars)
    }
  },
  
  /**
   * Mensagem 'login' - Autenticação com credenciais
   */
  login: {
    type: 'object',
    required: ['type'],
    additionalProperties: true,
    properties: {
      type: { const: 'login' },
      user: { type: 'string', maxLength: 128 },       // Username (Base64)
      pass: { type: 'string', maxLength: 256 },       // Senha (Base64)
      email: { type: 'string', maxLength: 256 }       // Email (Base64, opcional)
    }
  },
  
  /**
   * Mensagem 'guest' - Entrada como visitante
   */
  guest: {
    type: 'object',
    required: ['type'],
    properties: { type: { const: 'guest' } },
    additionalProperties: false
  },
  
  /**
   * Mensagem 'chat' - Mensagem de chat
   */
  chat: {
    type: 'object',
    required: ['type', 'data'],
    properties: {
      type: { const: 'chat' },
      data: { type: 'string', maxLength: 2048 }
    },
    additionalProperties: false
  },
  
  /**
   * Mensagem 'h' - Comando de movimento (Hold)
   */
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
  
  /**
   * Mensagem 'm' - Comando de direção (Move)
   */
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
  
  /**
   * Mensagem 'P' - Ping/Keepalive
   */
  P: {
    type: 'object',
    required: ['type'],
    properties: { type: { const: 'P' } },
    additionalProperties: false
  },
  
  /**
   * Mensagem 'pickup' - Coletar objeto do mundo
   */
  pickup: {
    type: 'object',
    required: ['type', 'x', 'y', 'tpl'],
    properties: {
      type: { const: 'pickup' },
      x: { type: 'integer', minimum: -99999, maximum: 99999 },
      y: { type: 'integer', minimum: -99999, maximum: 99999 },
      tpl: { type: 'string', maxLength: 64 }
    },
    additionalProperties: false
  },

  /**
   * Mensagem 'bld' - Build de objeto (template) no tile do player
   */
  bld: {
    type: 'object',
    required: ['type', 'tpl'],
    properties: {
      type: { const: 'bld' },
      tpl: { type: 'string', minLength: 1, maxLength: 128 }
    },
    additionalProperties: true
  },

  /**
   * Mensagem 'setobj' - Seta a lista de objetos de um tile
   */
  setobj: {
    type: 'object',
    required: ['type', 'x', 'y', 'list'],
    properties: {
      type: { const: 'setobj' },
      x: { type: 'integer', minimum: -99999, maximum: 99999 },
      y: { type: 'integer', minimum: -99999, maximum: 99999 },
      list: { type: 'array', items: { type: 'string', minLength: 1, maxLength: 128 }, maxItems: 32 }
    },
    additionalProperties: false
  },

  /**
   * Mensagem 'clrobj' - Limpa objetos de um tile
   */
  clrobj: {
    type: 'object',
    required: ['type', 'x', 'y'],
    properties: {
      type: { const: 'clrobj' },
      x: { type: 'integer', minimum: -99999, maximum: 99999 },
      y: { type: 'integer', minimum: -99999, maximum: 99999 }
    },
    additionalProperties: false
  },

  /**
   * Mensagem 'costume' - Troca de roupa/aparência
   * Requer premium ou nível >= 1 (não-guest)
   */
  costume: {
    type: 'object',
    required: ['type'],
    properties: {
      type: { const: 'costume' },
      body: { type: 'integer', minimum: 0, maximum: 100 },
      hair: { type: 'integer', minimum: 0, maximum: 100 },
      clothes: { type: 'integer', minimum: 0, maximum: 100 },
      hair_color: { type: 'integer', minimum: 0, maximum: 16777215 },
      clothes_color: { type: 'integer', minimum: 0, maximum: 16777215 },
      eye_color: { type: 'integer', minimum: 0, maximum: 16777215 }
    },
    additionalProperties: false
  },

  /**
   * Mensagem 'c' - Sistema multi-propósito
   * Cliente envia com r:"ap" para aparência, r:"cs" para costume shop, 
   * r:"cb" para comprar costume, r:"cbh" para testar costume
   * 
   * Campos:
   * - r: tipo de request (ap, cs, cb, cbh)
   * - c: clothes (r:ap) OU costume ID (r:cb, r:cbh) - 0-148
   * - b, h: body, hair (r:ap) - 0-100
   * - cc, hc, ec, nc: cores (r:ap) - 0-16777215
   */
  c: {
    type: 'object',
    required: ['type', 'r'],
    properties: {
      type: { const: 'c' },
      r: { type: 'string', maxLength: 10 },
      c: { type: 'integer', minimum: 0, maximum: 200 },      // clothes OU costume ID
      b: { type: 'integer', minimum: 0, maximum: 100 },      // body
      h: { type: 'integer', minimum: 0, maximum: 100 },      // hair
      cc: { type: 'integer', minimum: 0, maximum: 16777215 }, // clothes_color
      hc: { type: 'integer', minimum: 0, maximum: 16777215 }, // hair_color
      ec: { type: 'integer', minimum: 0, maximum: 16777215 }, // eye_color
      nc: { type: 'integer', minimum: 0, maximum: 16777215 }  // name_color
    },
    additionalProperties: false
  }
};

/**
 * Validadores compilados para cada tipo de mensagem
 * Compilar os schemas uma vez melhora a performance
 */
const validators = {};
for (const [key, schema] of Object.entries(schemaByType)) {
  validators[key] = ajv.compile(schema);
}

/**
 * Valida um pacote recebido do cliente
 * 
 * @param {Object} obj - Objeto JSON parseado da mensagem
 * @returns {Object} { ok: boolean, errors?: Array }
 */
export function validatePacket(obj) {
  // Verifica se é um objeto
  if (!obj || typeof obj !== 'object') return { ok: false, errors: ['Invalid JSON'] };
  
  // Extrai o tipo da mensagem
  const t = obj.type;
  
  // Verifica se tipo existe e é conhecido
  if (!t || !validators[t]) return { ok: false, errors: ['Unknown type'] };
  
  // Valida usando o validador compilado
  const valid = validators[t](obj);
  
  // Retorna resultado
  if (!valid) return { ok: false, errors: validators[t].errors };
  return { ok: true };
}