/**
 * Utilitário de Decodificação Base64
 * 
 * Este módulo fornece funções para decodificar strings Base64 enviadas pelo cliente.
 * O cliente codifica credenciais (username, senha) em Base64 antes de enviar,
 * e este módulo decodifica de volta para texto puro.
 * 
 * Tratamento especial:
 * - O cliente usa encodeURIComponent antes de btoa
 * - Tentamos decodificar UTF-8 corretamente usando escape/unescape
 * - Se falhar, retorna string vazia (seguro)
 */

/**
 * Decodifica uma string Base64 para texto UTF-8
 * 
 * @param {string} str - String codificada em Base64
 * @returns {string} String decodificada em UTF-8, ou string vazia se falhar
 * 
 * Processo de decodificação:
 * 1. Decodifica Base64 para buffer
 * 2. Converte buffer para string UTF-8
 * 3. Tenta decodeURIComponent para caracteres especiais
 * 4. Se qualquer passo falhar, retorna string vazia (seguro)
 * 
 * Uso típico:
 * const username = b64decode(packet.user);
 * const password = b64decode(packet.pass);
 */
export function b64decode(str) {
  try {
    // O client usa encodeURIComponent antes do btoa. Tentamos decodificar robusto.
    
    // Passo 1: Decodifica Base64 para buffer
    const buf = Buffer.from(str, 'base64');
    
    // Passo 2: Converte buffer para string UTF-8
    const s = buf.toString('utf8');
    
    try {
      // Passo 3: Tenta decodificar caracteres URL-encoded
      // escape() é deprecated mas funciona para este caso específico
      return decodeURIComponent(escape(s));
    } catch {
      // Se decodeURIComponent falhar, retorna a string UTF-8 simples
      return s;
    }
  } catch {
    // Se qualquer etapa falhar, retorna string vazia (seguro)
    return '';
  }
}