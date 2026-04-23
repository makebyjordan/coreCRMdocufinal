const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function list(req, res) {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, phone: true, active: true, createdAt: true },
    orderBy: { name: 'asc' },
  });
  res.json(users);
}

async function getById(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.params.id },
    select: { id: true, name: true, email: true, role: true, phone: true, active: true },
  });
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(user);
}

async function create(req, res) {
  try {
    const { email, name, password, role, phone, active } = req.body;
    const hashed = await bcrypt.hash(password, 12);
    const data = {
      email, name, password: hashed, role,
      phone, active: Boolean(active)
    };
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    const user = await prisma.user.create({
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, active: true },
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
    const { email, name, password, role, phone, active } = req.body;
    const data = {
      email, name, role,
      phone, active: Boolean(active)
    };
    if (password !== undefined) {
      data.password = await bcrypt.hash(password, 12);
    }
    Object.keys(data).forEach(k => data[k] === undefined && delete data[k]);
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, name: true, email: true, role: true, phone: true, active: true },
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
