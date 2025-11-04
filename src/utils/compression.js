/**
 * Compression Utility - Compress and Decompress Data
 * 
 * This module provides compression utilities using Node.js built-in zlib.
 * Used to compress map data before sending to clients.
 */

import { gzipSync, gunzipSync } from 'zlib';

/**
 * Compress data using gzip
 * 
 * @param {string|Buffer} data - Data to compress
 * @returns {Buffer} Compressed data
 */
export function compress(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf8');
  return gzipSync(buffer);
}

/**
 * Decompress gzipped data
 * 
 * @param {Buffer} data - Compressed data
 * @returns {string} Decompressed data as string
 */
export function decompress(data) {
  const buffer = gunzipSync(data);
  return buffer.toString('utf8');
}

/**
 * Compress data and return base64 encoded string
 * 
 * @param {string|Buffer} data - Data to compress
 * @returns {string} Base64 encoded compressed data
 */
export function compressToBase64(data) {
  const compressed = compress(data);
  return compressed.toString('base64');
}

/**
 * Decompress base64 encoded gzipped data
 * 
 * @param {string} base64Data - Base64 encoded compressed data
 * @returns {string} Decompressed data as string
 */
export function decompressFromBase64(base64Data) {
  const buffer = Buffer.from(base64Data, 'base64');
  return decompress(buffer);
}

/**
 * LZW Compression (Cliente-compatível)
 * ==========================================
 * 
 * Implementa compressão LZW compatível com jv.unzip do cliente.
 * 
 * A função jv.unzip do cliente usa o algoritmo LZW (Lempel-Ziv-Welch):
 * - Códigos < 57344: caracteres literais
 * - Códigos >= 57344: referências ao dicionário
 * 
 * LZW é ideal para dados com padrões repetitivos como tiles de mapa.
 */

// Constantes do algoritmo LZW
const LZW_DICT_START_CODE = 57344;  // Código inicial do dicionário (igual ao cliente)

// Constantes de otimização de compressão
const COMPRESSION_RATIO_THRESHOLD = 0.9;  // Só usa compressão se reduzir >= 10%
const MIN_SIZE_FOR_COMPRESSION = 50;  // Tamanho mínimo para considerar compressão

/**
 * Comprime string usando algoritmo LZW compatível com jv.unzip
 * 
 * Esta implementação usa o mesmo algoritmo do cliente (jv.zip):
 * function(e) {
 *     for (var t, i = {}, o = (e + "").split(""), n = [], a = o[0], r = 57344, s = 1; s < o.length; s++) 
 *         null != i[a + (t = o[s])] ? a += t : (n.push(1 < a.length ? i[a] : a.charCodeAt(0)), i[a + t] = r, r++, a = t);
 *     n.push(1 < a.length ? i[a] : a.charCodeAt(0));
 *     for (s = 0; s < n.length; s++) n[s] = String.fromCharCode(n[s]);
 *     return n.join("")
 * }
 * 
 * @param {string} e - String para comprimir (ex: "0:0:0:1:1:1")
 * @returns {string} String comprimida compatível com jv.unzip
 */
export function compressLZW(e) {
  // Variáveis do algoritmo (mantendo nomes do cliente para compatibilidade):
  // t = caractere temporário
  // i = dicionário (frase -> código)
  // o = array de caracteres do input
  // n = array de saída (códigos)
  // a = frase atual sendo construída
  // r = próximo código disponível (começa em 57344)
  // s = índice do loop
  let t, s;
  const i = {};
  const o = (e + "").split("");
  const n = [];
  let a = o[0];
  let r = LZW_DICT_START_CODE;
  
  // Processa cada caractere
  for (s = 1; s < o.length; s++) {
    t = o[s];
    if (null != i[a + t]) {
      // Sequência já existe no dicionário, continua construindo
      a += t;
    } else {
      // Sequência nova - emite código da frase atual
      n.push(1 < a.length ? i[a] : a.charCodeAt(0));
      // Adiciona nova sequência ao dicionário
      i[a + t] = r;
      r++;
      // Reinicia com caractere atual
      a = t;
    }
  }
  
  // Emite última frase
  n.push(1 < a.length ? i[a] : a.charCodeAt(0));
  
  // Converte códigos em string
  for (s = 0; s < n.length; s++) {
    n[s] = String.fromCharCode(n[s]);
  }
  
  return n.join("");
}

/**
 * Descomprime string LZW (para testes e validação)
 * 
 * Esta é a implementação equivalente ao jv.unzip do cliente.
 * 
 * @param {string} compressed - String comprimida
 * @returns {string} String original descomprimida
 */
export function decompressLZW(compressed) {
  let result;
  const dict = {};
  const data = (compressed + '').split('');
  let currChar = data[0];
  let oldPhrase = currChar;
  const output = [currChar];
  let code = LZW_DICT_START_CODE;
  
  for (let phrase = 1; phrase < data.length; phrase++) {
    const currCode = data[phrase].charCodeAt(0);
    
    if (currCode < LZW_DICT_START_CODE) {
      // Código literal
      result = data[phrase];
    } else if (dict[currCode]) {
      // Código no dicionário
      result = dict[currCode];
    } else {
      // Caso especial: código não existe ainda
      result = oldPhrase + currChar;
    }
    
    output.push(result);
    currChar = result.charAt(0);
    dict[code] = oldPhrase + currChar;
    code++;
    oldPhrase = result;
  }
  
  return output.join('');
}

/**
 * Verifica se vale a pena usar compressão LZW
 * 
 * A compressão LZW tem overhead para strings pequenas ou sem padrões.
 * Esta função verifica se a compressão realmente reduziu o tamanho.
 * 
 * @param {string} original - String original
 * @param {string} compressed - String comprimida
 * @returns {boolean} True se compressão reduziu pelo menos 10% do tamanho
 */
export function shouldUseLZWCompression(original, compressed) {
  // Usa compressão se reduzir pelo menos 10% do tamanho
  // Para strings muito pequenas (<50 chars), não compensa
  return compressed.length < original.length * COMPRESSION_RATIO_THRESHOLD && 
         original.length > MIN_SIZE_FOR_COMPRESSION;
}
