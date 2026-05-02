const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

const USER_SELECT = {
  id: true, name: true, email: true, phone: true, active: true, createdAt: true,
  userRoles: { select: { id: true, role: true, assignedAt: true } }
};

async function list(req, res) {
  const users = await prisma.user.findMany({
    select: USER_SELECT,
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function getById(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: USER_SELECT,
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
}

async function create(req, res) {
  try {
    const { email, name, password, role, phone, active } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const data = {
      email, name, password: hashed,
      phone, active: active !== undefined ? Boolean(active) : true,
    };
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const user = await prisma.user.create({
      data: {
        ...data,
        // Si se pasa role, crearlo como UserRoleAssignment
        ...(role && {
          userRoles: {
            create: { role }
          }
        })
      },
      select: USER_SELECT,
    });
    res.status(201).json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const { email, name, password, phone, active } = req.body;
    const data = { email, name, phone };
    if (active !== undefined) data.active = Boolean(active);
    if (password) data.password = await bcrypt.hash(password, 12);
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: USER_SELECT,
    });
    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  await prisma.user.update({
    where: { id: req.params.id },
    data: { active: false },
  });
  res.status(204).send();
}

module.exports = { list, getById, create, update, remove };
