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
   * Usada para login com usuário e senha existente, ou criação de conta
   * 
   * Campos:
   * - type: 'login' (constante)
   * - user: username em Base64
   * - pass: senha em Base64
   * - email: email em Base64 (opcional, usado ao criar conta)
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
   * Cria conta temporária sem senha (guest-XXXXX)
   * 
   * Campos:
   * - type: 'guest' (constante)
   */
  guest: {
    type: 'object',
    required: ['type'],
    properties: { type: { const: 'guest' } },
    additionalProperties: false  // Não permite campos extras
  },
  
  /**
   * Mensagem 'chat' - Mensagem de chat
   * Envia mensagem para outros jogadores
   * 
   * Campos:
   * - type: 'chat' (constante)
   * - data: texto da mensagem (max 2048 chars)
   */
  chat: {
    type: 'object',
    required: ['type', 'data'],
    properties: {
      type: { const: 'chat' },
      data: { type: 'string', maxLength: 2048 }       // Mensagem (max 2KB)
    },
    additionalProperties: false
  },
  
  /**
   * Mensagem 'h' - Comando de movimento (Hold)
   * Inicia ou para movimento do jogador
   * 
   * Campos:
   * - type: 'h' (constante)
   * - x, y: posição atual (para validação)
   * - d: direção (0=cima, 1=direita, 2=baixo, 3=esquerda, undefined=parar)
   */
  h: {
    type: 'object',
    required: ['type', 'x', 'y'],
    properties: {
      type: { const: 'h' },
      x: { type: 'integer', minimum: -99999, maximum: 99999 },  // Posição X
      y: { type: 'integer', minimum: -99999, maximum: 99999 },  // Posição Y
      d: { type: 'integer', minimum: 0, maximum: 3 }             // Direção (0-3)
    },
    additionalProperties: false
  },
  
  /**
   * Mensagem 'm' - Comando de direção (Move)
   * Muda direção do jogador sem mover
   * 
   * Campos:
   * - type: 'm' (constante)
   * - x, y: posição atual
   * - d: direção para virar (0=cima, 1=direita, 2=baixo, 3=esquerda)
   */
  m: {
    type: 'object',
    required: ['type', 'x', 'y', 'd'],
    properties: {
      type: { const: 'm' },
      x: { type: 'integer' },                          // Posição X
      y: { type: 'integer' },                          // Posição Y
      d: { type: 'integer', minimum: 0, maximum: 3 }   // Direção (0-3)
    },
    additionalProperties: false
  },
  
  /**
   * Mensagem 'P' - Ping/Keepalive
   * Cliente envia periodicamente para manter conexão ativa
   * Servidor responde com 'P' também
   * 
   * Campos:
   * - type: 'P' (constante)
   */
  P: {
    type: 'object',
    required: ['type'],
    properties: { type: { const: 'P' } },
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
 * 
 * Processo de validação:
 * 1. Verifica se é um objeto válido
 * 2. Verifica se tem campo 'type'
 * 3. Verifica se o tipo é conhecido
 * 4. Valida contra o schema correspondente
 * 5. Retorna { ok: true } se válido, ou { ok: false, errors: [...] } se inválido
 * 
 * Exemplo:
 * const result = validatePacket({ type: 'chat', data: 'olá' });
 * if (result.ok) {
 *   // Mensagem válida, processar
 * } else {
 *   // Mensagem inválida, ignorar ou logar erro
 * }
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