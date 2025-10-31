/**
 * Carregamento de Certificados TLS/SSL
 * 
 * Este módulo é responsável por carregar os certificados e chaves privadas
 * necessários para habilitar HTTPS e WSS (WebSocket Seguro).
 * 
 * Apenas usado quando TLS_ENABLE=true no arquivo .env
 */

import fs from 'fs';

/**
 * Carrega os certificados TLS do sistema de arquivos
 * 
 * @param {Object} env - Configurações do ambiente (deve conter TLS_CERT_PATH e TLS_KEY_PATH)
 * @param {Object} logger - Instância do logger para registrar erros
 * @returns {Object} Objeto com { key: string, cert: string }
 * @throws {Error} Se os arquivos não forem encontrados ou não puderem ser lidos
 * 
 * Os arquivos necessários são:
 * - Certificado SSL (.crt ou .pem): TLS_CERT_PATH
 * - Chave privada (.key): TLS_KEY_PATH
 * 
 * Exemplo de uso:
 * const creds = loadTLSCredentials(env, logger);
 * https.createServer({ key: creds.key, cert: creds.cert })
 */
export function loadTLSCredentials(env, logger) {
  // Valida que os caminhos foram configurados
  if (!env.TLS_CERT_PATH || !env.TLS_KEY_PATH) {
    throw new Error('TLS_CERT_PATH e TLS_KEY_PATH devem estar definidos no .env quando TLS_ENABLE=true');
  }
  
  try {
    // Lê o certificado SSL do arquivo
    const cert = fs.readFileSync(env.TLS_CERT_PATH, 'utf8');
    
    // Lê a chave privada do arquivo
    const key = fs.readFileSync(env.TLS_KEY_PATH, 'utf8');
    
    // Retorna ambos os arquivos carregados
    return { key, cert };
  } catch (err) {
    // Registra o erro com detalhes dos caminhos que falharam
    logger.error({ 
      err: String(err), 
      cert: env.TLS_CERT_PATH, 
      key: env.TLS_KEY_PATH 
    }, 'Falha ao ler certificados TLS');
    
    // Re-lança o erro para interromper a inicialização do servidor
    throw err;
  }
}