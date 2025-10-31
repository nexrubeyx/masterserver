/**
 * Sistema de Logging - Configuração do logger da aplicação
 * 
 * Este módulo cria e configura o sistema de logs usando a biblioteca Pino.
 * O logger é usado em toda a aplicação para registrar eventos, erros e informações de debug.
 * 
 * Comportamento:
 * - Em PRODUÇÃO: registra apenas logs de nível 'info' ou superior, formato JSON
 * - Em DESENVOLVIMENTO: registra logs 'debug' e superiores, com formatação colorida e legível
 */

import pino from 'pino';

/**
 * Cria e configura uma instância do logger
 * 
 * @returns {Object} Instância do logger Pino configurada
 * 
 * Níveis de log disponíveis (do menor para o maior):
 * - trace: informações muito detalhadas para debugging
 * - debug: informações de debug úteis durante desenvolvimento
 * - info: informações gerais sobre a operação do sistema
 * - warn: avisos sobre situações que podem causar problemas
 * - error: erros que precisam de atenção
 * - fatal: erros críticos que podem derrubar o sistema
 */
export function createLogger() {
  const logger = pino({
    // Define o nível mínimo de log baseado no ambiente
    // Produção: apenas 'info' e acima | Desenvolvimento: 'debug' e acima
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    
    // Configuração de transporte para formatação dos logs
    transport: process.env.NODE_ENV === 'production' ? undefined : {
      // Em desenvolvimento, usa pino-pretty para logs coloridos e legíveis
      target: 'pino-pretty',
      options: { 
        translateTime: 'SYS:standard',  // Formata timestamp no formato do sistema
        ignore: 'pid,hostname'           // Oculta PID e hostname para simplicidade
      }
    }
  });
  return logger;
}