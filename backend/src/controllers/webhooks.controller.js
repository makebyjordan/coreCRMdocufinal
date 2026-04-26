const { prisma } = require('../config/db');
const path = require('path');
const fs = require('fs');
const logger = require('../config/logger');
const docusignService = require('../services/docusign.service');

async function docusignWebhook(req, res) {
  if (!docusignService.isConfigured()) {
    logger.warn('[Webhook DocuSign] Recibido pero el servicio no está activado, ignorando');
    return res.status(200).json({ ok: true });
  }

  // Verificar firma HMAC
  const signatureHeader = req.headers['x-docusign-signature-1'] || '';
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const valid = docusignService.verifyWebhookSignature(rawBody, signatureHeader);
  if (!valid) {
    logger.warn('[Webhook DocuSign] Firma HMAC inválida');
    return res.status(401).json({ error: 'Firma inválida' });
  }

  const payload = req.body;

  try {
    const envelopeId = payload?.data?.envelopeId || payload?.envelopeId;
    const envelopeStatus = payload?.data?.envelopeSummary?.status || payload?.status;

    if (!envelopeId) {
      logger.warn('[Webhook DocuSign] Payload sin envelopeId, ignorando');
      return res.status(200).json({ ok: true });
    }

    const signature = await prisma.signature.findUnique({
      where: { envelopeId },
      include: { signers: true },
    });

    if (!signature) {
      logger.warn(`[Webhook DocuSign] Firma con envelopeId ${envelopeId} no encontrada, ignorando`);
      return res.status(200).json({ ok: true });
    }

    const recipients = payload?.data?.envelopeSummary?.recipients?.signers
      || payload?.recipients?.signers
      || [];

    // Mapear estados de recipients a signers locales (por recipientId)
    for (const recipient of recipients) {
      const signer = signature.signers.find(s => s.recipientId === recipient.recipientId);
      if (!signer) continue;

      if (recipient.status === 'completed' && !signer.signedAt) {
        await prisma.signatureSigner.update({
          where: { id: signer.id },
          data: { status: 'FIRMADO', signedAt: new Date() },
        });
      } else if (recipient.status === 'declined' && !signer.declinedAt) {
        await prisma.signatureSigner.update({
          where: { id: signer.id },
          data: {
            status: 'RECHAZADO',
            declinedAt: new Date(),
            declinedReason: recipient.declinedReason || null,
          },
        });
      } else if (['sent', 'delivered'].includes(recipient.status) && signer.status === 'PENDIENTE') {
        await prisma.signatureSigner.update({
          where: { id: signer.id },
          data: { status: 'ENVIADO' },
        });
      }
    }

    // Actualizar estado global del envelope
    if (envelopeStatus === 'voided') {
      await prisma.signature.update({
        where: { id: signature.id },
        data: { status: 'CANCELADO' },
      });
    } else if (envelopeStatus === 'declined') {
      await prisma.signature.update({
        where: { id: signature.id },
        data: { status: 'RECHAZADO' },
      });
    } else if (envelopeStatus === 'completed') {
      // Marcar todos los signers como firmados
      await prisma.signatureSigner.updateMany({
        where: { signatureId: signature.id, status: { not: 'FIRMADO' } },
        data: { status: 'FIRMADO', signedAt: new Date() },
      });

      // Descargar el PDF firmado y guardarlo
      let signedDocumentPath = signature.signedDocumentPath;
      if (!signedDocumentPath) {
        try {
          const buffer = await docusignService.downloadSignedDocument(envelopeId);
          const savePath = path.join('backend', 'uploads', 'signed', `${signature.id}.pdf`);
          fs.mkdirSync(path.dirname(path.resolve(savePath)), { recursive: true });
          fs.writeFileSync(savePath, buffer);
          signedDocumentPath = savePath;
        } catch (err) {
          logger.error('[Webhook DocuSign] Error descargando PDF firmado:', err.message);
        }
      }

      await prisma.signature.update({
        where: { id: signature.id },
        data: { status: 'FIRMADO_COMPLETO', signedDocumentPath },
      });
    } else if (['sent', 'delivered'].includes(envelopeStatus)) {
      const updatedSigners = await prisma.signatureSigner.findMany({ where: { signatureId: signature.id } });
      const allSent = updatedSigners.every(s => s.status !== 'PENDIENTE');
      const someSigned = updatedSigners.some(s => s.status === 'FIRMADO');
      if (someSigned) {
        await prisma.signature.update({ where: { id: signature.id }, data: { status: 'EN_PROGRESO' } });
      } else if (allSent) {
        await prisma.signature.update({ where: { id: signature.id }, data: { status: 'ENVIADO' } });
      }
    }

    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('[Webhook DocuSign] Error procesando payload:', err.message);
    // Siempre 200 para que DocuSign no reintente indefinidamente
    res.status(200).json({ ok: true });
  }
}

module.exports = { docusignWebhook };
