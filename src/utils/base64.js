export function b64decode(str) {
  try {
    // O client usa encodeURIComponent antes do btoa. Tentamos decodificar robusto.
    const buf = Buffer.from(str, 'base64');
    const s = buf.toString('utf8');
    try {
      return decodeURIComponent(escape(s));
    } catch {
      return s;
    }
  } catch {
    return '';
  }
}