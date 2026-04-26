/**
 * Motor de plantillas para documentos
 * Maneja detección de placeholders, rellenado de plantillas DOCX
 */

const { prisma } = require('../config/db');
const mammoth = require('mammoth');
const PizZip = require('pizzip');
const Docxtemplater = require('docxtemplater');
const fs = require('fs').promises;
const path = require('path');
const logger = require('../config/logger');
const { getVariableByKey } = require('../constants/template-variables.constants');

/**
 * Detecta placeholders en un documento DOCX
 * Sintaxis soportada: {{variable}}, {{variable.subvariable}}, {{variable | filter}}
 * @param {string} filePath - Ruta al archivo DOCX
 * @returns {Promise<Array>} Lista de placeholders detectados
 */
async function detectPlaceholders(filePath) {
  try {
    const content = await fs.readFile(filePath);
    const zip = new PizZip(content);
    
    // Leer document.xml
    const docXml = zip.files['word/document.xml'];
    if (!docXml) {
      throw new Error('No se encontró document.xml en el DOCX');
    }
    
    const xmlContent = docXml.asText();
    
    // Regex para detectar placeholders {{variable}} o {{variable.subvariable}}
    const regex = /\{\{([a-zA-Z0-9._]+)(?:\s*\|\s*[^}]*)?\}\}/g;
    const matches = [];
    let match;
    
    while ((match = regex.exec(xmlContent)) !== null) {
      const placeholder = match[1].trim();
      if (!matches.includes(placeholder)) {
        matches.push(placeholder);
      }
    }
    
    // También intentar con mammoth para extraer texto plano
    try {
      const mammothResult = await mammoth.extractRawText({ path: filePath });
      const textContent = mammothResult.value;
      
      while ((match = regex.exec(textContent)) !== null) {
        const placeholder = match[1].trim();
        if (!matches.includes(placeholder)) {
          matches.push(placeholder);
        }
      }
    } catch (mammothErr) {
      logger.warn('[TemplateEngine] mammoth extraction failed:', mammothErr.message);
    }
    
    // Convertir a formato de placeholders estructurados
    return matches.map(key => {
      const varDef = getVariableByKey(key);
      return {
        key,
        label: varDef?.label || key,
        required: varDef?.required || false,
        category: varDef?.category || 'otros',
        example: varDef?.example || '',
      };
    });
    
  } catch (err) {
    logger.error('[TemplateEngine] Error detecting placeholders:', err);
    throw err;
  }
}

/**
 * Actualiza los placeholders de una plantilla en la base de datos
 * @param {string} baseDocumentId - ID del BaseDocument
 * @param {Array} placeholders - Lista de placeholders detectados
 */
async function updateTemplatePlaceholders(baseDocumentId, placeholders) {
  await prisma.baseDocument.update({
    where: { id: baseDocumentId },
    data: {
      isTemplate: true,
      templateFormat: 'DOCX',
      placeholders: JSON.stringify(placeholders),
    },
  });
}

/**
 * Construye el contexto de datos para rellenar una plantilla
 * @param {string} expedientId - ID del expediente
 * @param {Object} extraData - Datos adicionales sobrescritos
 * @returns {Promise<Object>} Contexto completo
 */
async function buildTemplateContext(expedientId, extraData = {}) {
  // Cargar expediente con todas las relaciones necesarias
  const expedient = await prisma.expedient.findUnique({
    where: { id: expedientId },
    include: {
      client: true,
      assignments: {
        include: { user: true },
        where: { isPrimary: true },
        take: 1,
      },
      clientRoles: {
        include: { client: true },
      },
    },
  });

  if (!expedient) {
    throw new Error(`Expediente ${expedientId} no encontrado`);
  }

  const client = expedient.client;
  const primaryAgent = expedient.assignments[0]?.user || null;

  // Encontrar vendedor y comprador desde clientRoles
  const vendedor = expedient.clientRoles.find(r => 
    r.role === 'VENDEDOR' || r.role === 'PROPIETARIO'
  )?.client || null;
  
  const comprador = expedient.clientRoles.find(r => 
    r.role === 'COMPRADOR' || r.role === 'INQUILINO'
  )?.client || null;

  // Construir contexto
  const context = {
    // Cliente principal (owner del expediente)
    cliente: {
      nombre: client?.firstName || '',
      apellidos: client?.lastName || '',
      nombreCompleto: `${client?.firstName || ''} ${client?.lastName || ''}`.trim(),
      dni: client?.dni || '',
      email: client?.email || '',
      telefono: client?.phone || '',
      telefono2: client?.phone2 || '',
      direccion: client?.address || '',
      ciudad: client?.city || '',
      cp: client?.postalCode || '',
      provincia: client?.province || '',
      tipo: client?.type || '',
      empresa: client?.companyName || '',
      nifEmpresa: client?.nif || '',
      personaContacto: client?.contactPerson || '',
      estadoCicloVida: client?.lifecycleStage || '',
    },

    // Expediente
    expediente: {
      codigo: expedient.code || '',
      tipoOperacion: expedient.operationType || '',
      faseActual: expedient.currentPhase || '',
      estado: expedient.status || '',
      fechaApertura: expedient.openedAt ? formatDate(expedient.openedAt) : '',
      fechaCierre: expedient.closedAt ? formatDate(expedient.closedAt) : '',
      comisionFija: expedient.commissionFixed?.toString() || '',
      comisionPorcentaje: expedient.commissionPercent?.toString() || '',
    },

    // Inmueble
    inmueble: {
      direccion: expedient.propertyAddress || '',
      ciudad: expedient.propertyCity || '',
      referencia: expedient.propertyRef || '',
      precio: expedient.propertyPrice?.toString() || '',
      precioLetras: expedient.propertyPrice ? numberToWords(expedient.propertyPrice) : '',
      m2: expedient.propertyM2?.toString() || '',
      habitaciones: expedient.propertyRooms?.toString() || '',
      banos: expedient.propertyBaths?.toString() || '',
      catastral: expedient.propertyCatastral || '',
      anoConstruccion: expedient.propertyYear?.toString() || '',
      planta: '', // No existe en schema aún
      ascensor: '', // No existe en schema aún
      parking: expedient.propertyParking ? 'Sí' : 'No',
      trastero: expedient.propertyStorage ? 'Sí' : 'No',
      orientacion: expedient.propertyOrientation || '',
    },

    // Arras
    arras: {
      importe: expedient.arrasAmount?.toString() || '',
      importeLetras: expedient.arrasAmount ? numberToWords(expedient.arrasAmount) : '',
      fecha: expedient.arrasDeadline ? formatDate(expedient.arrasDeadline) : '',
      fechaLimite: expedient.arrasDeadline ? formatDate(expedient.arrasDeadline) : '',
      porcentajePenalizacion: '',
      formaPago: '',
    },

    // Notaría
    notaria: {
      nombre: expedient.notaryName || '',
      nombreNotario: expedient.notaryName || '',
      direccion: expedient.notaryAddress || '',
      ciudad: '',
      fechaFirma: expedient.notaryDate ? formatDate(expedient.notaryDate) : '',
      horaFirma: '',
    },

    // Agente
    agente: {
      nombre: primaryAgent?.name || '',
      email: primaryAgent?.email || '',
      telefono: primaryAgent?.phone || '',
      rol: primaryAgent?.role || '',
    },

    // Vendedor (desde clientRoles)
    vendedor: vendedor ? {
      nombre: vendedor.firstName || '',
      apellidos: vendedor.lastName || '',
      dni: vendedor.dni || '',
      email: vendedor.email || '',
      telefono: vendedor.phone || '',
    } : {},

    // Comprador (desde clientRoles)
    comprador: comprador ? {
      nombre: comprador.firstName || '',
      apellidos: comprador.lastName || '',
      dni: comprador.dni || '',
      email: comprador.email || '',
      telefono: comprador.phone || '',
    } : {},

    // Fechas
    fecha: {
      hoy: formatDate(new Date()),
      hoyLargo: formatDateLong(new Date()),
      mes: getMonthName(new Date()),
      ano: new Date().getFullYear().toString(),
    },

    // Inmobiliaria (desde env vars)
    inmobiliaria: {
      nombre: process.env.COMPANY_NAME || '',
      cif: process.env.COMPANY_CIF || '',
      direccion: process.env.COMPANY_ADDRESS || '',
      ciudad: process.env.COMPANY_CITY || '',
      cp: process.env.COMPANY_CP || '',
      telefono: process.env.COMPANY_PHONE || '',
      email: process.env.COMPANY_EMAIL || '',
    },
  };

  // Aplicar overrides del usuario
  if (extraData) {
    mergeDeep(context, extraData);
  }

  return context;
}

/**
 * Rellena una plantilla DOCX con los datos del contexto
 * @param {string} templatePath - Ruta a la plantilla DOCX
 * @param {Object} context - Contexto de datos
 * @returns {Promise<Buffer>} Buffer del documento generado
 */
async function fillTemplate(templatePath, context) {
  try {
    const content = await fs.readFile(templatePath);
    const zip = new PizZip(content);
    
    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
    });

    // Renderizar con el contexto (docxtemplater espera objeto plano)
    const flatContext = flattenObject(context);
    doc.render(flatContext);

    const buffer = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    return buffer;
    
  } catch (err) {
    logger.error('[TemplateEngine] Error filling template:', err);
    throw err;
  }
}

/**
 * Genera un documento a partir de una plantilla y lo guarda
 * @param {string} templateId - ID del BaseDocument plantilla
 * @param {string} expedientId - ID del expediente
 * @param {Object} overrides - Sobrescrituras de datos
 * @param {string} outputName - Nombre del documento generado
 * @returns {Promise<Object>} Documento creado
 */
async function generateDocument(templateId, expedientId, overrides = {}, outputName = null) {
  // Obtener plantilla
  const template = await prisma.baseDocument.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    throw new Error(`Plantilla ${templateId} no encontrada`);
  }

  if (!template.isTemplate) {
    throw new Error('El documento seleccionado no es una plantilla');
  }

  // Obtener expediente para validar acceso y extraer ownerClientId
  const expedient = await prisma.expedient.findUnique({
    where: { id: expedientId },
    select: { id: true, clientId: true },
  });

  if (!expedient) {
    throw new Error(`Expediente ${expedientId} no encontrado`);
  }

  // Construir contexto y rellenar
  const context = await buildTemplateContext(expedientId, overrides);
  const filledBuffer = await fillTemplate(template.localPath, context);

  // Guardar archivo generado
  const timestamp = Date.now();
  const generatedFileName = outputName || `${template.name}_${timestamp}.docx`;
  const outputPath = path.join(
    process.env.UPLOADS_PATH || './uploads/documents',
    expedientId,
    generatedFileName
  );

  // Asegurar que existe el directorio
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, filledBuffer);

  // Generar HTML editable para el contentHtml
  let contentHtml = null;
  try {
    const mammothResult = await mammoth.convertToHtml({ buffer: filledBuffer });
    contentHtml = `<!DOCTYPE html><html><head><meta charset="utf-8">
      <style>body{font-family:system-ui,-apple-system,sans-serif;line-height:1.6;padding:40px;max-width:800px;margin:0 auto;background:#fff;color:#333;} h1,h2{color:#1a365d;} table{border-collapse:collapse;width:100%;margin:20px 0;} th,td{border:1px solid #e2e8f0;padding:12px;text-align:left;} th{background:#f7fafc;}</style>
      </head><body>${mammothResult.value}</body></html>`;
  } catch (mammothErr) {
    logger.warn('[TemplateEngine] Error generando HTML:', mammothErr.message);
  }

  // Crear registro Document usando raw SQL para evitar problemas del pooler
  const documentId = require('crypto').randomUUID();
  const now = new Date().toISOString();
  const signatureStatus = template.requiresSignature ? 'PENDIENTE' : 'NO_REQUIERE';
  
  await prisma.$executeRawUnsafe(`
    INSERT INTO documents (
      id, "expedientId", "ownerClientId", name, "docType", phase, status,
      "filePath", "fileSize", "mimeType", "sourceTemplateId", "templateData",
      "isGenerated", "signatureStatus", "contentHtml", "createdAt", "updatedAt"
    ) VALUES (
      '${documentId}', '${expedientId}', '${expedient.clientId}', '${generatedFileName.replace(/'/g, "''")}',
      'GENERADO', 'GENERAL', 'PENDIENTE',
      '${outputPath.replace(/'/g, "''")}', ${filledBuffer.length},
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '${templateId}', '${JSON.stringify(context).replace(/'/g, "''")}',
      true, '${signatureStatus}', ${contentHtml ? `'${contentHtml.replace(/'/g, "''")}'` : 'NULL'}, '${now}', '${now}'
    )
  `);

  // Recuperar el documento creado
  const document = await prisma.$queryRawUnsafe(`
    SELECT * FROM documents WHERE id = '${documentId}' LIMIT 1
  `).then(rows => rows[0]);

  logger.info(`[TemplateEngine] Documento generado: ${document.id} para expediente ${expedientId}`);

  return {
    document,
    context,
    filePath: outputPath,
  };
}

/**
 * Convierte un objeto anidado a plano (cliente.nombre → cliente.nombre)
 * @param {Object} obj - Objeto anidado
 * @param {string} prefix - Prefijo para las claves
 * @returns {Object} Objeto plano
 */
function flattenObject(obj, prefix = '') {
  return Object.keys(obj).reduce((acc, k) => {
    const pre = prefix.length ? prefix + '.' : '';
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k));
    } else {
      acc[pre + k] = obj[k] !== undefined && obj[k] !== null ? String(obj[k]) : '';
    }
    return acc;
  }, {});
}

/**
 * Mezcla objetos anidados recursivamente
 * @param {Object} target - Objeto destino
 * @param {Object} source - Objeto fuente
 */
function mergeDeep(target, source) {
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      if (!target[key]) target[key] = {};
      mergeDeep(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
}

/**
 * Formatea una fecha a DD/MM/YYYY
 * @param {Date|string} date - Fecha
 * @returns {string} Fecha formateada
 */
function formatDate(date) {
  const d = new Date(date);
  const day = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Formatea una fecha larga (25 de abril de 2026)
 * @param {Date|string} date - Fecha
 * @returns {string} Fecha formateada
 */
function formatDateLong(date) {
  const d = new Date(date);
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  const day = d.getDate();
  const month = meses[d.getMonth()];
  const year = d.getFullYear();
  return `${day} de ${month} de ${year}`;
}

/**
 * Obtiene el nombre del mes
 * @param {Date} date - Fecha
 * @returns {string} Nombre del mes
 */
function getMonthName(date) {
  const meses = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];
  return meses[date.getMonth()];
}

/**
 * Convierte un número a palabras (simplificado)
 * @param {number|string} num - Número
 * @returns {string} Número en palabras
 */
function numberToWords(num) {
  // Implementación básica - en producción usar library como `numero-a-letras`
  const number = parseFloat(num);
  if (isNaN(number)) return '';
  
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', 'diez', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (number === 0) return 'cero';
  if (number < 0) return 'menos ' + numberToWords(-number);
  
  const euros = Math.floor(number);
  const cents = Math.round((number - euros) * 100);
  
  let result = euros.toString() + ' euros';
  if (cents > 0) {
    result += ` con ${cents} céntimos`;
  }
  
  return result;
}

module.exports = {
  detectPlaceholders,
  updateTemplatePlaceholders,
  buildTemplateContext,
  fillTemplate,
  generateDocument,
  flattenObject,
  formatDate,
  formatDateLong,
  numberToWords,
};
