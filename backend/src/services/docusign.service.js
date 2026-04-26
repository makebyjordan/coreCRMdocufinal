// backend/src/services/docusign.service.js
//
// Esqueleto preparado para integración con DocuSign.
// La implementación real se hará cuando el usuario active el servicio.
// Ver README_DOCUSIGN.md en este directorio para los pasos de activación.

class DocuSignNotConfiguredError extends Error {
  constructor() {
    super('DocuSign no está activado todavía. Ver backend/src/services/README_DOCUSIGN.md');
    this.code = 'DOCUSIGN_NOT_CONFIGURED';
    this.statusCode = 501;
  }
}

function isConfigured() {
  return Boolean(
    process.env.DOCUSIGN_INTEGRATION_KEY &&
    process.env.DOCUSIGN_USER_ID &&
    process.env.DOCUSIGN_ACCOUNT_ID
  );
}

async function getApiClient() {
  throw new DocuSignNotConfiguredError();
}

/**
 * Crea un envelope en DocuSign con el documento y los firmantes.
 * @param {Object} params
 * @param {string} params.documentPath - Ruta local del PDF a firmar
 * @param {string} params.documentName
 * @param {Array<{name:string,email:string,role:string,routingOrder:number}>} params.signers
 * @param {"PARALLEL"|"SEQUENTIAL"} params.signingOrder
 * @param {Date|null} params.expiresAt
 * @param {Object} params.metadata - { expedientId, signatureId } para tracking
 * @returns {Promise<{envelopeId:string, recipientIds: Record<string,string>}>}
 */
async function createEnvelope(params) {
  throw new DocuSignNotConfiguredError();
}

async function getEnvelopeStatus(envelopeId) {
  throw new DocuSignNotConfiguredError();
}

async function downloadSignedDocument(envelopeId) {
  throw new DocuSignNotConfiguredError();
}

async function voidEnvelope(envelopeId, reason) {
  throw new DocuSignNotConfiguredError();
}

/**
 * Verifica la firma HMAC del webhook de DocuSign Connect.
 * @returns {boolean}
 */
function verifyWebhookSignature(rawBody, signatureHeader) {
  // Se implementará al activar. En modo no configurado, rechaza siempre.
  if (!isConfigured()) return false;
  throw new DocuSignNotConfiguredError();
}

module.exports = {
  isConfigured,
  getApiClient,
  createEnvelope,
  getEnvelopeStatus,
  downloadSignedDocument,
  voidEnvelope,
  verifyWebhookSignature,
  DocuSignNotConfiguredError,
};
