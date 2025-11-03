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
