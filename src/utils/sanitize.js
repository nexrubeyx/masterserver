/**
 * Sanitization Utilities
 * 
 * Utilities to ensure data is safe for JSON transmission
 */

/**
 * Removes control characters that might cause JSON parse errors
 * 
 * @param {string} str - String to sanitize
 * @returns {string} Sanitized string
 */
export function sanitizeForJSON(str) {
  if (typeof str !== 'string') return str;
  
  // Remove null bytes and other problematic control characters
  // Keep only: newline (0x0A), carriage return (0x0D), tab (0x09), and printable chars
  return str.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
}

/**
 * Validates that a string can be safely JSON stringified and parsed
 * 
 * @param {any} data - Data to validate
 * @returns {boolean} True if data can be safely JSON encoded
 */
export function isValidForJSON(data) {
  try {
    const jsonStr = JSON.stringify(data);
    const parsed = JSON.parse(jsonStr);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Safely stringify data with error handling
 * 
 * @param {any} data - Data to stringify
 * @param {any} fallback - Fallback value if stringify fails
 * @returns {string} JSON string or fallback
 */
export function safeStringify(data, fallback = '{}') {
  try {
    return JSON.stringify(data);
  } catch (e) {
    console.error('Failed to stringify data:', e.message);
    return typeof fallback === 'string' ? fallback : JSON.stringify(fallback);
  }
}
