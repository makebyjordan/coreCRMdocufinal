/**
 * Variables de plantilla disponibles para rellenar documentos
 * Organizadas por categoría para mejor UX
 */

const TEMPLATE_VARIABLES = {
  // ─── Cliente ────────────────────────────────────────────────────────────────
  cliente: {
    label: 'Datos del Cliente',
    variables: [
      { key: 'cliente.nombre', label: 'Nombre', required: false, example: 'Juan' },
      { key: 'cliente.apellidos', label: 'Apellidos', required: false, example: 'García López' },
      { key: 'cliente.nombreCompleto', label: 'Nombre Completo', required: false, example: 'Juan García López' },
      { key: 'cliente.dni', label: 'DNI/NIE/NIF', required: true, example: '12345678A' },
      { key: 'cliente.email', label: 'Email', required: false, example: 'juan@email.com' },
      { key: 'cliente.telefono', label: 'Teléfono', required: false, example: '612345678' },
      { key: 'cliente.telefono2', label: 'Teléfono 2', required: false, example: '912345678' },
      { key: 'cliente.direccion', label: 'Dirección', required: false, example: 'Calle Mayor 123' },
      { key: 'cliente.ciudad', label: 'Ciudad', required: false, example: 'Madrid' },
      { key: 'cliente.cp', label: 'Código Postal', required: false, example: '28001' },
      { key: 'cliente.provincia', label: 'Provincia', required: false, example: 'Madrid' },
      { key: 'cliente.tipo', label: 'Tipo de Cliente', required: false, example: 'COMPRADOR' },
      { key: 'cliente.empresa', label: 'Nombre Empresa', required: false, example: 'Inversiones SL' },
      { key: 'cliente.nifEmpresa', label: 'NIF Empresa', required: false, example: 'B12345678' },
      { key: 'cliente.personaContacto', label: 'Persona de Contacto', required: false, example: 'María López' },
      { key: 'cliente.estadoCicloVida', label: 'Estado en Ciclo de Vida', required: false, example: 'ACTIVO' },
    ]
  },

  // ─── Expediente ────────────────────────────────────────────────────────────
  expediente: {
    label: 'Datos del Expediente',
    variables: [
      { key: 'expediente.codigo', label: 'Código Expediente', required: true, example: 'EXP-2024-001' },
      { key: 'expediente.tipoOperacion', label: 'Tipo de Operación', required: true, example: 'VENTA' },
      { key: 'expediente.faseActual', label: 'Fase Actual', required: false, example: 'ARRAS' },
      { key: 'expediente.estado', label: 'Estado', required: false, example: 'ACTIVO' },
      { key: 'expediente.fechaApertura', label: 'Fecha Apertura', required: false, example: '15/01/2024' },
      { key: 'expediente.fechaCierre', label: 'Fecha Cierre', required: false, example: '15/03/2024' },
      { key: 'expediente.comisionFija', label: 'Comisión Fija (€)', required: false, example: '5000' },
      { key: 'expediente.comisionPorcentaje', label: 'Comisión %', required: false, example: '3' },
    ]
  },

  // ─── Inmueble ───────────────────────────────────────────────────────────────
  inmueble: {
    label: 'Datos del Inmueble',
    variables: [
      { key: 'inmueble.direccion', label: 'Dirección', required: true, example: 'Calle Alcalá 456, 3ºB' },
      { key: 'inmueble.ciudad', label: 'Ciudad', required: false, example: 'Madrid' },
      { key: 'inmueble.referencia', label: 'Referencia', required: false, example: 'REF-12345' },
      { key: 'inmueble.precio', label: 'Precio (€)', required: true, example: '350000' },
      { key: 'inmueble.precioLetras', label: 'Precio en Letras', required: false, example: 'trescientos cincuenta mil euros' },
      { key: 'inmueble.m2', label: 'Metros Cuadrados', required: false, example: '120' },
      { key: 'inmueble.habitaciones', label: 'Habitaciones', required: false, example: '3' },
      { key: 'inmueble.banos', label: 'Baños', required: false, example: '2' },
      { key: 'inmueble.catastral', label: 'Referencia Catastral', required: false, example: '1234567AB1234N0123WX' },
      { key: 'inmueble.anoConstruccion', label: 'Año Construcción', required: false, example: '2005' },
      { key: 'inmueble.planta', label: 'Planta', required: false, example: '3º' },
      { key: 'inmueble.ascensor', label: 'Tiene Ascensor', required: false, example: 'Sí' },
      { key: 'inmueble.parking', label: 'Tiene Parking', required: false, example: 'Sí' },
      { key: 'inmueble.trastero', label: 'Tiene Trastero', required: false, example: 'Sí' },
      { key: 'inmueble.orientacion', label: 'Orientación', required: false, example: 'Sur' },
    ]
  },

  // ─── Arras ──────────────────────────────────────────────────────────────────
  arras: {
    label: 'Datos de Arras',
    variables: [
      { key: 'arras.importe', label: 'Importe Arras (€)', required: true, example: '10000' },
      { key: 'arras.importeLetras', label: 'Importe en Letras', required: false, example: 'diez mil euros' },
      { key: 'arras.fecha', label: 'Fecha Arras', required: true, example: '01/03/2024' },
      { key: 'arras.fechaLimite', label: 'Fecha Límite', required: false, example: '01/05/2024' },
      { key: 'arras.porcentajePenalizacion', label: 'Porcentaje Penalización', required: false, example: '10%' },
      { key: 'arras.formaPago', label: 'Forma de Pago', required: false, example: 'Transferencia bancaria' },
    ]
  },

  // ─── Notaría ─────────────────────────────────────────────────────────────────
  notaria: {
    label: 'Datos de Notaría',
    variables: [
      { key: 'notaria.nombre', label: 'Nombre Notaría', required: false, example: 'Notaría de Madrid' },
      { key: 'notaria.nombreNotario', label: 'Nombre del Notario', required: false, example: 'D. Antonio Martínez' },
      { key: 'notaria.direccion', label: 'Dirección Notaría', required: false, example: 'Calle Serrano 42' },
      { key: 'notaria.ciudad', label: 'Ciudad Notaría', required: false, example: 'Madrid' },
      { key: 'notaria.fechaFirma', label: 'Fecha de Firma', required: false, example: '15/03/2024' },
      { key: 'notaria.horaFirma', label: 'Hora de Firma', required: false, example: '10:00' },
    ]
  },

  // ─── Agente ─────────────────────────────────────────────────────────────────
  agente: {
    label: 'Datos del Agente',
    variables: [
      { key: 'agente.nombre', label: 'Nombre Agente', required: false, example: 'Carlos Ruiz' },
      { key: 'agente.email', label: 'Email Agente', required: false, example: 'carlos@inmobiliaria.com' },
      { key: 'agente.telefono', label: 'Teléfono Agente', required: false, example: '687654321' },
      { key: 'agente.rol', label: 'Rol del Agente', required: false, example: 'Comercial' },
    ]
  },

  // ─── Vendedor (desde ExpedientClient) ────────────────────────────────────────
  vendedor: {
    label: 'Datos del Vendedor',
    variables: [
      { key: 'vendedor.nombre', label: 'Nombre Vendedor', required: false, example: 'María Sánchez' },
      { key: 'vendedor.apellidos', label: 'Apellidos Vendedor', required: false, example: 'Sánchez Ruiz' },
      { key: 'vendedor.dni', label: 'DNI Vendedor', required: false, example: '87654321B' },
      { key: 'vendedor.email', label: 'Email Vendedor', required: false, example: 'maria@email.com' },
      { key: 'vendedor.telefono', label: 'Teléfono Vendedor', required: false, example: '698765432' },
    ]
  },

  // ─── Comprador (desde ExpedientClient) ───────────────────────────────────────
  comprador: {
    label: 'Datos del Comprador',
    variables: [
      { key: 'comprador.nombre', label: 'Nombre Comprador', required: false, example: 'Pedro Martínez' },
      { key: 'comprador.apellidos', label: 'Apellidos Comprador', required: false, example: 'Martínez López' },
      { key: 'comprador.dni', label: 'DNI Comprador', required: false, example: '23456789C' },
      { key: 'comprador.email', label: 'Email Comprador', required: false, example: 'pedro@email.com' },
      { key: 'comprador.telefono', label: 'Teléfono Comprador', required: false, example: '687123456' },
    ]
  },

  // ─── Fechas ──────────────────────────────────────────────────────────────────
  fecha: {
    label: 'Fechas',
    variables: [
      { key: 'fecha.hoy', label: 'Fecha de Hoy', required: false, example: '25/04/2026' },
      { key: 'fecha.hoyLargo', label: 'Fecha Larga', required: false, example: '25 de abril de 2026' },
      { key: 'fecha.mes', label: 'Mes Actual', required: false, example: 'abril' },
      { key: 'fecha.ano', label: 'Año Actual', required: false, example: '2026' },
    ]
  },

  // ─── Inmobiliaria (configuración) ────────────────────────────────────────────
  inmobiliaria: {
    label: 'Datos de la Inmobiliaria',
    variables: [
      { key: 'inmobiliaria.nombre', label: 'Nombre', required: false, example: 'Inmo360 SL' },
      { key: 'inmobiliaria.cif', label: 'CIF', required: false, example: 'B12345678' },
      { key: 'inmobiliaria.direccion', label: 'Dirección', required: false, example: 'Calle Gran Vía 1' },
      { key: 'inmobiliaria.ciudad', label: 'Ciudad', required: false, example: 'Madrid' },
      { key: 'inmobiliaria.cp', label: 'CP', required: false, example: '28013' },
      { key: 'inmobiliaria.telefono', label: 'Teléfono', required: false, example: '915123456' },
      { key: 'inmobiliaria.email', label: 'Email', required: false, example: 'info@inmo360.com' },
    ]
  },
};

/**
 * Obtiene todas las variables como array plano
 * @returns {Array} Lista de todas las variables con prefijo
 */
function getAllVariables() {
  const all = [];
  Object.keys(TEMPLATE_VARIABLES).forEach(category => {
    const cat = TEMPLATE_VARIABLES[category];
    cat.variables.forEach(v => {
      all.push({
        ...v,
        category: category,
        categoryLabel: cat.label,
      });
    });
  });
  return all;
}

/**
 * Busca una variable por su clave
 * @param {string} key - Clave de la variable (ej: "cliente.nombre")
 * @returns {Object|null} Definición de la variable
 */
function getVariableByKey(key) {
  return getAllVariables().find(v => v.key === key) || null;
}

/**
 * Obtiene variables de una categoría específica
 * @param {string} category - Nombre de la categoría
 * @returns {Array} Variables de la categoría
 */
function getVariablesByCategory(category) {
  const cat = TEMPLATE_VARIABLES[category];
  if (!cat) return [];
  return cat.variables.map(v => ({ ...v, category, categoryLabel: cat.label }));
}

module.exports = {
  TEMPLATE_VARIABLES,
  getAllVariables,
  getVariableByKey,
  getVariablesByCategory,
};
