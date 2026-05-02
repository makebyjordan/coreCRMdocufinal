const jwt = require('jsonwebtoken');
const { prisma } = require('../config/db');

async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null) || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { userRoles: true },
    });

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuario no válido o inactivo' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      active: user.active,
      userRoles: user.userRoles,
      // Array de roles para compatibilidad
      roles: user.userRoles.map(ur => ur.role)
    };
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function authorize(...requiredRoles) {
  return (req, res, next) => {
    const userRoles = req.user.roles || [];
    // Verificar si el usuario tiene al menos uno de los roles requeridos
    const hasRole = requiredRoles.some(role => userRoles.includes(role));
    if (!hasRole) {
      return res.status(403).json({ error: 'Sin permisos para esta acción' });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
