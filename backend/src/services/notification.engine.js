const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const emailService = require('./email.service');
const logger = require('../config/logger');

// ─── Helper: obtener responsables de un expediente por rol ────────────────────
async function getResponsibles(expedientId) {
  const assignments = await prisma.expedientAssignment.findMany({
    where: { expedientId },
    include: { user: true },
  });

  const byRole = assignments.reduce((acc, a) => {
    acc[a.role] = acc[a.role] || [];
    acc[a.role].push(a.user);
    return acc;
  }, {});

  return byRole;
}

// ─── Helper: obtener datos completos del expediente ───────────────────────────
async function getExpedient(expedientId) {
  return prisma.expedient.findUnique({
    where: { id: expedientId },
    include: { client: true, assignments: { include: { user: true } } },
  });
}

// ─── Helper: cargar plantilla de email ───────────────────────────────────────
async function loadTemplate(type) {
  return prisma.emailTemplate.findFirst({ where: { type, active: true } });
}

// ─── Helper: reemplazar variables en el HTML del template ────────────────────
function renderTemplate(html, vars) {
  let result = html;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replace(new RegExp(`{{${key}}}`, 'g'), String(value ?? ''));
  }
  return result;
}

// ─── Helper: registrar y enviar notificación ─────────────────────────────────
async function sendNotification({ expedientId, userId, type, toEmail, toName, subject, bodyHtml, metadata, scheduledFor }) {
  const notification = await prisma.notification.create({
    data: {
      expedientId, userId, type,
      toEmail, toName, subject, bodyHtml,
      status: 'PENDIENTE',
      metadata,
      scheduledFor,
    },
  });

  if (!scheduledFor || scheduledFor <= new Date()) {
    try {
      await emailService.send({ to: toEmail, subject, html: bodyHtml });
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'ENVIADO', sentAt: new Date() },
      });
    } catch (error) {
      await prisma.notification.update({
        where: { id: notification.id },
        data: { status: 'FALLIDO', errorMessage: error.message },
      });
      logger.error('[NotificationEngine] Error al enviar:', error.message);
    }
  }

  return notification;
}

// ─── Funciones de notificación por evento ────────────────────────────────────

async function onExpedientCreated(expedientId) {
  const exp = await getExpedient(expedientId);
  const template = await loadTemplate('APERTURA_EXPEDIENTE');
  const responsible = exp.assignments.find(a => a.role === 'COMERCIAL');
  if (!responsible) return;

  const vars = buildVars(exp, responsible.user);
  const html = template ? renderTemplate(template.bodyHtml, vars) : defaultAperturaHtml(vars);
  const subject = template ? renderTemplate(template.subject, vars) : `Nuevo expediente abierto: ${exp.code}`;

  await sendNotification({
    expedientId, type: 'APERTURA_EXPEDIENTE',
    toEmail: responsible.user.email, toName: responsible.user.name,
    subject, bodyHtml: html,
  });
}

async function onPhaseTransition(expedient, fromPhase, toPhase, decision) {
  const responsibles = await getResponsibles(expedient.id);
  const template = await loadTemplate('FASE_COMPLETADA');

  // REGLA 1: Al completar cada fase → notificar al departamento siguiente
  const phaseNotifications = {
    FORMULARIO: ['FIRMAS', 'MARKETING'],
    DOCUMENTACION: ['FIRMAS'],
    VALIDACION: ['COMERCIAL', 'MARKETING'],
    ACUERDO: ['COMERCIAL', 'FIRMAS'],
    MARKETING_FORMULARIO: ['MARKETING'],
    MARKETING_EJECUCION: ['COMERCIAL', 'FIRMAS'],
    BUSQUEDA_ACTIVA: toPhase === 'ACUERDO_INTERESADO' ? ['MARKETING', 'COMERCIAL'] : ['COMERCIAL'],
    ACUERDO_INTERESADO: ['COMERCIAL', 'FIRMAS'],
    CIERRE: ['COMERCIAL', 'FIRMAS', 'MARKETING', 'DIRECCION'],
  };

  const rolesToNotify = phaseNotifications[toPhase] || ['COMERCIAL'];

  for (const role of rolesToNotify) {
    const users = responsibles[role] || [];
    for (const user of users) {
      const vars = buildVars(expedient, user, { fromPhase, toPhase });
      const html = template ? renderTemplate(template.bodyHtml, vars) : defaultFaseHtml(vars);
      const subject = template
        ? renderTemplate(template.subject, vars)
        : `[${expedient.code}] Nueva fase: ${toPhase}`;

      await sendNotification({
        expedientId: expedient.id, userId: user.id,
        type: 'FASE_COMPLETADA', toEmail: user.email, toName: user.name,
        subject, bodyHtml: html,
      });
    }
  }

  // Aviso al propietario/cliente en fases específicas
  const avisoClientePhases = ['MARKETING_EJECUCION', 'ACUERDO_INTERESADO'];
  if (avisoClientePhases.includes(toPhase) && expedient.client?.email) {
    const vars = buildVars(expedient, expedient.client);
    const html = defaultAvisoPropietarioHtml(vars, toPhase);

    await sendNotification({
      expedientId: expedient.id,
      type: 'AVISO_PROPIETARIO',
      toEmail: expedient.client.email,
      toName: expedient.client.firstName || expedient.client.companyName,
      subject: `Actualización de su expediente ${expedient.code}`,
      bodyHtml: html,
    });
  }

  // Notificación específica si no hay interesado (REGLA 2)
  if (fromPhase === 'BUSQUEDA_ACTIVA' && decision === 'NO') {
    await onNoInteresado(expedient.id);
  }
}

async function onBlocked(expedientId, reason) {
  const exp = await getExpedient(expedientId);
  const responsibles = await getResponsibles(expedientId);
  const comerciales = responsibles['COMERCIAL'] || [];
  const template = await loadTemplate('BLOQUEO_DETECTADO');

  for (const user of comerciales) {
    const vars = { ...buildVars(exp, user), blockReason: reason || 'No especificado' };
    const html = template ? renderTemplate(template.bodyHtml, vars) : defaultBloqueadoHtml(vars);
    await sendNotification({
      expedientId, userId: user.id,
      type: 'BLOQUEO_DETECTADO', toEmail: user.email, toName: user.name,
      subject: `⚠️ Expediente ${exp.code} bloqueado - Acción requerida`,
      bodyHtml: html,
    });
  }
}

async function onDocumentRejected(expedientId, docName, reason) {
  const exp = await getExpedient(expedientId);
  const responsibles = await getResponsibles(expedientId);
  const comerciales = responsibles['COMERCIAL'] || [];

  for (const user of comerciales) {
    const vars = { ...buildVars(exp, user), docName, rejectedReason: reason };
    await sendNotification({
      expedientId, userId: user.id,
      type: 'AVISO_COMERCIAL', toEmail: user.email, toName: user.name,
      subject: `[${exp.code}] Documento rechazado: ${docName}`,
      bodyHtml: defaultDocRechazadoHtml(vars),
    });
  }
}

async function onNoInteresado(expedientId) {
  const exp = await getExpedient(expedientId);
  const responsibles = await getResponsibles(expedientId);
  const comerciales = responsibles['COMERCIAL'] || [];

  for (const user of comerciales) {
    const vars = buildVars(exp, user);
    await sendNotification({
      expedientId, userId: user.id,
      type: 'AVISO_COMERCIAL', toEmail: user.email, toName: user.name,
      subject: `[${exp.code}] Sin interesados - Revisar estrategia`,
      bodyHtml: defaultNoInteresadoHtml(vars),
    });
  }
}

async function onRenovarExclusividad(expedientId) {
  const exp = await getExpedient(expedientId);
  const responsibles = await getResponsibles(expedientId);
  const firmas = responsibles['FIRMAS'] || [];

  for (const user of firmas) {
    const vars = buildVars(exp, user);
    await sendNotification({
      expedientId, userId: user.id,
      type: 'RENOVAR_EXCLUSIVIDAD', toEmail: user.email, toName: user.name,
      subject: `[${exp.code}] Renovación de exclusividad`,
      bodyHtml: defaultRenovarHtml(vars),
    });
  }
}

async function onOperacionCerrada(expedientId) {
  const exp = await getExpedient(expedientId);
  const responsibles = await getResponsibles(expedientId);
  const template = await loadTemplate('OPERACION_CERRADA');

  // Notificar a todos los departamentos
  const allUsers = Object.values(responsibles).flat();
  for (const user of allUsers) {
    const vars = buildVars(exp, user);
    const html = template ? renderTemplate(template.bodyHtml, vars) : defaultCierreHtml(vars);
    await sendNotification({
      expedientId, userId: user.id,
      type: 'OPERACION_CERRADA', toEmail: user.email, toName: user.name,
      subject: `✅ [${exp.code}] Operación cerrada con éxito`,
      bodyHtml: html,
    });
  }

  // Notificar al cliente
  if (exp.client?.email) {
    await sendNotification({
      expedientId, type: 'OPERACION_CERRADA',
      toEmail: exp.client.email, toName: exp.client.firstName || exp.client.companyName,
      subject: `Enhorabuena - Su operación ha concluido`,
      bodyHtml: defaultCierreClienteHtml(buildVars(exp, exp.client)),
    });
  }
}

// ─── Postventa ────────────────────────────────────────────────────────────────

async function sendPostventa3(expedientId) {
  const exp = await getExpedient(expedientId);
  if (!exp?.client?.email) return;

  const template = await loadTemplate('POSVENTA_3_MESES');
  const vars = buildVars(exp, exp.client);
  const html = template ? renderTemplate(template.bodyHtml, vars) : defaultPostventa3Html(vars);
  const subject = template ? renderTemplate(template.subject, vars) : `¡3 meses de su operación! ${exp.code}`;

  await sendNotification({
    expedientId, type: 'POSVENTA_3_MESES',
    toEmail: exp.client.email, toName: exp.client.firstName || exp.client.companyName,
    subject, bodyHtml: html,
  });

  await prisma.expedient.update({ where: { id: expedientId }, data: { postventa3At: null } });
}

async function sendPostventa6(expedientId) {
  const exp = await getExpedient(expedientId);
  if (!exp?.client?.email) return;

  const template = await loadTemplate('POSVENTA_6_MESES');
  const vars = buildVars(exp, exp.client);
  const html = template ? renderTemplate(template.bodyHtml, vars) : defaultPostventa6Html(vars);
  const subject = template ? renderTemplate(template.subject, vars) : `¡6 meses de su operación! ${exp.code}`;

  await sendNotification({
    expedientId, type: 'POSVENTA_6_MESES',
    toEmail: exp.client.email, toName: exp.client.firstName || exp.client.companyName,
    subject, bodyHtml: html,
  });

  await prisma.expedient.update({ where: { id: expedientId }, data: { postventa6At: null } });
}

async function sendPostventa12(expedientId) {
  const exp = await getExpedient(expedientId);
  if (!exp?.client?.email) return;

  const template = await loadTemplate('POSVENTA_12_MESES');
  const vars = buildVars(exp, exp.client);
  const html = template ? renderTemplate(template.bodyHtml, vars) : defaultPostventa12Html(vars);
  const subject = template ? renderTemplate(template.subject, vars) : `¡Un año de su operación! ${exp.code}`;

  await sendNotification({
    expedientId, type: 'POSVENTA_12_MESES',
    toEmail: exp.client.email, toName: exp.client.firstName || exp.client.companyName,
    subject, bodyHtml: html,
  });

  await prisma.expedient.update({ where: { id: expedientId }, data: { postventa12At: null } });
}

// ─── Helpers para variables de plantilla ─────────────────────────────────────

function buildVars(expedient, user, extra = {}) {
  const clientName = expedient.client?.firstName
    ? `${expedient.client.firstName} ${expedient.client.lastName || ''}`.trim()
    : expedient.client?.companyName || 'Cliente';

  return {
    expedientCode: expedient.code,
    clientName,
    operationType: expedient.operationType,
    propertyAddress: expedient.propertyAddress || 'No especificada',
    currentPhase: expedient.currentPhase,
    agencyName: process.env.EMAIL_FROM_NAME || 'CRM Inmobiliaria',
    recipientName: user?.name || user?.firstName || 'Equipo',
    recipientEmail: user?.email || '',
    reviewUrl: process.env.GOOGLE_BUSINESS_URL || '#',
    trustpilotUrl: process.env.TRUSTPILOT_URL || '#',
    year: new Date().getFullYear(),
    ...extra,
  };
}

// ─── Plantillas HTML por defecto (fallback si no hay plantilla en BD) ─────────

const baseHtml = (content) => `
<!DOCTYPE html><html><head><meta charset="utf-8">
<style>
  body { font-family: Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
  .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
  .header { background: #1a56db; color: white; padding: 24px; text-align: center; }
  .header h1 { margin: 0; font-size: 20px; }
  .body { padding: 28px; color: #374151; line-height: 1.6; }
  .footer { background: #f9fafb; padding: 16px; text-align: center; color: #9ca3af; font-size: 12px; border-top: 1px solid #e5e7eb; }
  .badge { display: inline-block; background: #dbeafe; color: #1e40af; padding: 4px 10px; border-radius: 20px; font-size: 13px; font-weight: bold; }
  .btn { display: inline-block; background: #1a56db; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 16px 0; }
  .alert { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; border-radius: 4px; margin: 16px 0; }
  .success { background: #d1fae5; border-left: 4px solid #10b981; padding: 12px; border-radius: 4px; margin: 16px 0; }
</style></head><body>
<div class="container">
  <div class="header"><h1>{{agencyName}}</h1></div>
  <div class="body">${content}</div>
  <div class="footer">© {{year}} {{agencyName}} · Este es un mensaje automático del CRM</div>
</div></body></html>`;

function defaultAperturaHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <p>Se ha abierto un nuevo expediente en el CRM:</p>
    <p><span class="badge">{{expedientCode}}</span></p>
    <ul>
      <li><strong>Cliente:</strong> {{clientName}}</li>
      <li><strong>Operación:</strong> {{operationType}}</li>
      <li><strong>Inmueble:</strong> {{propertyAddress}}</li>
      <li><strong>Fase actual:</strong> {{currentPhase}}</li>
    </ul>
    <p>Por favor, accede al CRM para continuar con el proceso.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultFaseHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <div class="success">
      <p>El expediente <strong>{{expedientCode}}</strong> ha avanzado de fase:</p>
      <p>{{fromPhase}} → <strong>{{toPhase}}</strong></p>
    </div>
    <ul>
      <li><strong>Cliente:</strong> {{clientName}}</li>
      <li><strong>Operación:</strong> {{operationType}}</li>
    </ul>
    <p>Accede al CRM para ver el estado actual y las tareas pendientes.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultBloqueadoHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <div class="alert">
      <p><strong>⚠️ El expediente {{expedientCode}} está BLOQUEADO</strong></p>
      <p><strong>Motivo:</strong> {{blockReason}}</p>
    </div>
    <p>Es necesaria tu intervención para desbloquear el proceso.</p>
    <p>Por favor, accede al CRM y resuelve la incidencia.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultDocRechazadoHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <div class="alert">
      <p>El documento <strong>{{docName}}</strong> del expediente <strong>{{expedientCode}}</strong> ha sido rechazado.</p>
      <p><strong>Motivo:</strong> {{rejectedReason}}</p>
    </div>
    <p>Sube el documento corregido desde el CRM.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultNoInteresadoHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <div class="alert">
      <p>El expediente <strong>{{expedientCode}}</strong> lleva tiempo sin interesados.</p>
    </div>
    <p>Es recomendable revisar la estrategia de marketing o las condiciones de la oferta.</p>
    <p>Opciones disponibles en el CRM: <strong>Renovar exclusividad</strong> o <strong>Ajustar precio</strong>.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultAvisoPropietarioHtml(v, phase) {
  const messages = {
    MARKETING_EJECUCION: 'El material de marketing de su propiedad está listo y publicado en los portales.',
    ACUERDO_INTERESADO: 'Tenemos noticias sobre su propiedad — hay un interesado serio. Su comercial le contactará pronto.',
  };
  const msg = messages[phase] || 'Hay novedades en su expediente.';

  return baseHtml(`
    <p>Estimado/a <strong>{{recipientName}}</strong>,</p>
    <p>${msg}</p>
    <p>Su expediente de referencia: <span class="badge">{{expedientCode}}</span></p>
    <p>No dude en contactar con su agente comercial para cualquier consulta.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultRenovarHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <p>El expediente <strong>{{expedientCode}}</strong> requiere renovación del contrato de exclusividad.</p>
    <p>Por favor, prepara la documentación necesaria y contacta con el cliente.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultCierreHtml(v) {
  return baseHtml(`
    <p>Hola <strong>{{recipientName}}</strong>,</p>
    <div class="success">
      <p>🎉 <strong>La operación {{expedientCode}} ha sido cerrada con éxito.</strong></p>
    </div>
    <ul>
      <li><strong>Cliente:</strong> {{clientName}}</li>
      <li><strong>Operación:</strong> {{operationType}}</li>
      <li><strong>Inmueble:</strong> {{propertyAddress}}</li>
    </ul>
    <p>Accede al CRM para completar los trámites de cierre y archivo.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultCierreClienteHtml(v) {
  return baseHtml(`
    <p>Estimado/a <strong>{{recipientName}}</strong>,</p>
    <div class="success">
      <p>🎉 <strong>Enhorabuena por el cierre de su operación.</strong></p>
    </div>
    <p>Ha sido un placer trabajar con usted. Todo el equipo de <strong>{{agencyName}}</strong> le desea lo mejor en esta nueva etapa.</p>
    <p>Su expediente de referencia: <span class="badge">{{expedientCode}}</span></p>
    <p>Si tiene cualquier consulta posterior, no dude en contactarnos.</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultPostventa3Html(v) {
  return baseHtml(`
    <p>Estimado/a <strong>{{recipientName}}</strong>,</p>
    <p>¡Han pasado ya <strong>3 meses</strong> desde el cierre de su operación!</p>
    <p>Desde <strong>{{agencyName}}</strong> queremos felicitarle y esperar que todo vaya estupendamente.</p>
    <p>Si necesita cualquier gestión adicional o tiene alguna pregunta, estamos a su disposición.</p>
    <p>Un cordial saludo,<br>El equipo de {{agencyName}}</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultPostventa6Html(v) {
  return baseHtml(`
    <p>Estimado/a <strong>{{recipientName}}</strong>,</p>
    <p>¡Hoy se cumplen <strong>6 meses</strong> desde el cierre de su operación!</p>
    <p>Esperamos que esté disfrutando de esta nueva etapa. Si en algún momento necesita asesoramiento inmobiliario o conoce a alguien que lo necesite, recuerde que estamos aquí para ayudar.</p>
    <p>Un cordial saludo,<br>El equipo de {{agencyName}}</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

function defaultPostventa12Html(v) {
  return baseHtml(`
    <p>Estimado/a <strong>{{recipientName}}</strong>,</p>
    <p>🎂 ¡Hoy se cumple exactamente <strong>1 año</strong> desde el cierre de su operación!</p>
    <p>Ha sido un año desde que confiaste en nosotros, y queremos que sepas que ese voto de confianza lo recordamos con especial cariño.</p>
    <p>Si tienes un momento, nos encantaría conocer tu opinión. Una reseña nos ayuda a mejorar y llegar a más personas:</p>
    <p style="text-align: center;">
      <a href="{{reviewUrl}}" class="btn" style="margin-right: 10px;">⭐ Dejar reseña en Google</a>
    </p>
    <p>¡Muchas gracias y hasta pronto!</p>
    <p>El equipo de {{agencyName}}</p>
  `).replace(/{{(\w+)}}/g, (m, k) => v[k] ?? m);
}

module.exports = {
  onExpedientCreated,
  onPhaseTransition,
  onBlocked,
  onDocumentRejected,
  onNoInteresado,
  onRenovarExclusividad,
  onOperacionCerrada,
  sendPostventa3,
  sendPostventa6,
  sendPostventa12,
  send: sendNotification, // Export for workflow engine
};
