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
 * ==========================================
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

/**
 * Comprime string usando algoritmo LZW compatível com jv.unzip
 * 
 * @param {string} uncompressed - String para comprimir (ex: "0:0:0:1:1:1")
 * @returns {string} String comprimida compatível com jv.unzip
 * 
 * Algoritmo:
 * 1. Começa com dicionário vazio
 * 2. Lê caracteres e busca sequências no dicionário
 * 3. Quando encontra sequência nova, adiciona ao dicionário com código >= 57344
 * 4. Emite código para sequência conhecida
 */
export function compressLZW(uncompressed) {
  // Dicionário de frases já vistas: frase -> código
  const dict = {};
  
  // Converte input em array de caracteres
  const data = (uncompressed + '').split('');
  
  // Array de saída (códigos de caractere)
  const output = [];
  
  // Variáveis de estado
  let currChar = data[0];
  let phrase = currChar;
  let code = 57344; // Código inicial para dicionário (igual ao cliente)
  
  // Processa cada caractere
  for (let i = 1; i < data.length; i++) {
    currChar = data[i];
    const temp = phrase + currChar;
    
    if (dict[temp] != null) {
      // Sequência já existe no dicionário, continua construindo
      phrase = temp;
    } else {
      // Sequência nova - emite código da frase atual
      if (phrase.length > 1) {
        // Frase do dicionário (código >= 57344)
        output.push(dict[phrase]);
      } else {
        // Caractere único (código < 57344)
        output.push(phrase.charCodeAt(0));
      }
      
      // Adiciona nova sequência ao dicionário
      dict[temp] = code;
      code++;
      
      // Reinicia com caractere atual
      phrase = currChar;
    }
  }
  
  // Emite última frase
  if (phrase.length > 1) {
    output.push(dict[phrase]);
  } else {
    output.push(phrase.charCodeAt(0));
  }
  
  // Converte códigos em string
  return output.map(c => String.fromCharCode(c)).join('');
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
  let code = 57344;
  
  for (let phrase = 1; phrase < data.length; phrase++) {
    const currCode = data[phrase].charCodeAt(0);
    
    if (currCode < 57344) {
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
  return compressed.length < original.length * 0.9 && original.length > 50;
}
