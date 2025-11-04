/**
 * Utilidades de formateo de texto para formularios (ES locale)
 *
 * Objetivo principal: forzar Title Case en nombres, apellidos, direcciones, sedes, etc.
 * además de ofrecer otras transformaciones simples.
 */

const ES_LOCALE = 'es';

/**
 * Normaliza espacios (trim y colapsa espacios múltiples)
 * @param {string} str
 * @returns {string}
 */
export function normalizeWhitespace(str = '') {
  return String(str).replace(/\s+/g, ' ').trim();
}

/**
 * Determina si un token es un acrónimo (todo en mayúsculas y corto)
 * @param {string} token
 * @returns {boolean}
 */
function isAcronym(token) {
  // Consideramos acrónimo solo si tiene 2-3 letras mayúsculas (ONG, FMI, UI)
  return /^[A-ZÁÉÍÓÚÜÑ]{2,3}$/.test(token);
}

/**
 * Lista de palabras cortas que suelen ir en minúsculas en español
 * (si no son la primera palabra)
 */
const SMALL_WORDS = new Set([
  'de','del','la','las','los','y','e','o','u','a','al','en','por','para','con','sin','un','una','unos','unas','el'
]);

/**
 * Convierte a Title Case con sensibilidad al español.
 * - Respeta acrónimos (ONG, UNICEF, III)
 * - Mantiene palabras cortas en minúsculas (de, del, la, y, ...), salvo si son la primera
 * - Maneja separadores como espacios, guiones y apóstrofes: María-José, O'Connor
 *
 * @param {string} input
 * @param {{ keepSmallWords?: boolean, smallWords?: string[], preserveAcronyms?: boolean }} [options]
 * @returns {string}
 */
export function toTitleCase(input = '', options = {}) {
  // Por defecto NO preservamos acrónimos para evitar que palabras en MAYÚSCULAS se mantengan así
  const { keepSmallWords = true, smallWords = [], preserveAcronyms = false } = options;
  const small = new Set([...SMALL_WORDS, ...smallWords.map(s => s.toLowerCase())]);

  const normalized = normalizeWhitespace(input);
  if (!normalized) return '';

  // Dividir conservando separadores para reensamblar igual
  const parts = normalized.split(/([\s\-'])/g);
  let isStart = true; // inicio de cadena o después de separador

  return parts
    .map(part => {
      // Separadores
      if (part === ' ' || part === '-' || part === "'") {
        // Después de espacio, guión o apóstrofe, consideramos siguiente token como inicio
        isStart = true;
        return part;
      }

      // Palabra
      const original = part;
      const lower = original.toLocaleLowerCase(ES_LOCALE);

      // Acrónimos
      if (preserveAcronyms && isAcronym(original)) {
        isStart = false;
        return original; // dejar tal cual (mayúsculas)
      }

      // Palabras cortas
      if (keepSmallWords && !isStart && small.has(lower)) {
        isStart = false;
        return lower;
      }

      // Title Case normal
      const first = lower.charAt(0).toLocaleUpperCase(ES_LOCALE);
      const rest = lower.slice(1);
      isStart = false;
      return first + rest;
    })
    .join('');
}

/**
 * Convierte a MAYÚSCULAS con locale español.
 * @param {string} input
 */
export function toUpperCaseES(input = '') {
  return normalizeWhitespace(input).toLocaleUpperCase(ES_LOCALE);
}

/**
 * Convierte a minúsculas con locale español.
 * @param {string} input
 */
export function toLowerCaseES(input = '') {
  return normalizeWhitespace(input).toLocaleLowerCase(ES_LOCALE);
}

/**
 * Convierte a Sentence case: primera letra mayúscula, resto minúsculas.
 * @param {string} input
 */
export function toSentenceCase(input = '') {
  const s = normalizeWhitespace(input).toLocaleLowerCase(ES_LOCALE);
  if (!s) return '';
  return s.charAt(0).toLocaleUpperCase(ES_LOCALE) + s.slice(1);
}

/**
 * Formatea el valor de un evento de input antes de pasarlo al estado.
 * Uso: onChange={(e)=>{ formatEventValue(e, toTitleCase); handleChange(e); }}
 * @param {React.ChangeEvent<HTMLInputElement|HTMLTextAreaElement>} e
 * @param {(value:string)=>string} formatter
 */
export function formatEventValue(e, formatter) {
  if (!e || !e.target || typeof e.target.value !== 'string') return;
  e.target.value = formatter(e.target.value);
}

/**
 * Atajo para seleccionar formato por modo.
 * @param {string} input
 * @param {'title'|'upper'|'lower'|'sentence'} mode
 */
export function formatText(input = '', mode = 'title') {
  switch (mode) {
    case 'upper':
      return toUpperCaseES(input);
    case 'lower':
      return toLowerCaseES(input);
    case 'sentence':
      return toSentenceCase(input);
    case 'title':
    default:
      return toTitleCase(input);
  }
}

export default {
  normalizeWhitespace,
  toTitleCase,
  toUpperCaseES,
  toLowerCaseES,
  toSentenceCase,
  formatEventValue,
  formatText
};
