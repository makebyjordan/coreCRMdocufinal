/**
 * Validador de DNI/NIE/NIF español
 */

const DNI_REGEX = /^\d{8}[A-Z]$/;
const NIE_REGEX = /^[XYZ]\d{7}[A-Z]$/;
const NIF_REGEX = /^[A-HJNP-SW]\d{7}[0-9A-J]$|^[0-9]\d{7}[A-J]$/;

const LETRAS_DNI = 'TRWAGMYFPDXBNJZSQVHLCKE';

/**
 * Calcula la letra de control para un número de DNI
 * @param {string} numero - Número de DNI (8 dígitos)
 * @returns {string} Letra de control
 */
function calcularLetraDNI(numero) {
  const num = parseInt(numero, 10) % 23;
  return LETRAS_DNI[num];
}

/**
 * Normaliza un DNI/NIE (trim + uppercase)
 * @param {string} value
 * @returns {string}
 */
function normalizeDni(value) {
  if (!value) return '';
  return value.trim().toUpperCase();
}

/**
 * Valida un DNI español (8 dígitos + letra control)
 * @param {string} value
 * @returns {boolean}
 */
function isValidDNI(value) {
  const dni = normalizeDni(value);
  if (!DNI_REGEX.test(dni)) return false;

  const numero = dni.slice(0, 8);
  const letra = dni.slice(8);
  return letra === calcularLetraDNI(numero);
}

/**
 * Valida un NIE (X/Y/Z + 7 dígitos + letra control)
 * @param {string} value
 * @returns {boolean}
 */
function isValidNIE(value) {
  const nie = normalizeDni(value);
  if (!NIE_REGEX.test(nie)) return false;

  // Reemplazar la primera letra X/Y/Z por 0/1/2
  const firstChar = nie.charAt(0);
  const numMap = { X: '0', Y: '1', Z: '2' };
  const numero = numMap[firstChar] + nie.slice(1, 8);
  const letra = nie.slice(8);

  return letra === calcularLetraDNI(numero);
}

/**
 * Valida un NIF (NIF de empresa) - validación simplificada
 * @param {string} value
 * @returns {boolean}
 */
function isValidNIF(value) {
  const nif = normalizeDni(value);
  if (!NIF_REGEX.test(nif)) return false;

  // Para NIF que empiezan con letra (sociedades)
  if (/^[A-HJNP-SW]/.test(nif)) {
    const letra = nif.charAt(0);
    const numero = nif.slice(1, 8);
    const control = nif.slice(8);

    // Cálculo de letra de control para sociedades
    const letrasSociedad = 'JABCDEFGHI';
    const suma = parseInt(numero, 10) % 11;
    const letraControl = letrasSociedad[suma];

    return control === letraControl;
  }

  // Para NIF de persona física con letra final
  if (/^\d/.test(nif)) {
    const numero = nif.slice(0, 8);
    const letra = nif.slice(8);
    return letra === calcularLetraDNI(numero);
  }

  return false;
}

/**
 * Valida si un documento es válido (DNI, NIE o NIF)
 * @param {string} value
 * @returns {boolean}
 */
function isValidDocument(value) {
  if (!value) return false;
  const doc = normalizeDni(value);
  return isValidDNI(doc) || isValidNIE(doc) || isValidNIF(doc);
}

/**
 * Detecta el tipo de documento
 * @param {string} value
 * @returns {string|null} 'DNI' | 'NIE' | 'NIF' | null
 */
function detectDocumentType(value) {
  const doc = normalizeDni(value);
  if (isValidDNI(doc)) return 'DNI';
  if (isValidNIE(doc)) return 'NIE';
  if (isValidNIF(doc)) return 'NIF';
  return null;
}

module.exports = {
  isValidDNI,
  isValidNIE,
  isValidNIF,
  isValidDocument,
  normalizeDni,
  detectDocumentType,
};
