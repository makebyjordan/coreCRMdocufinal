const { prisma } = require('../config/db');
const bcrypt = require('bcryptjs');

const USER_SELECT = {
  id: true, name: true, email: true, phone: true, active: true, createdAt: true,
  userRoles: { select: { id: true, role: true, assignedAt: true } },
};

async function list(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: USER_SELECT,
      orderBy: { name: 'asc' },
    });
    res.json(users);
  } catch (err) {
    console.error('[Users] list error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function getById(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: USER_SELECT,
    });
    if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
    res.json(user);
  } catch (err) {
    console.error('[Users] getById error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function create(req, res) {
  try {
    const { email, name, password, role, phone, active } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: 'email, name y password son obligatorios' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const data = {
      email: email.trim().toLowerCase(),
      name: name.trim(),
      password: hashed,
      active: active !== undefined ? Boolean(active) : true,
    };
    if (phone) data.phone = phone;

    const user = await prisma.user.create({
      data: {
        ...data,
        // Si se pasa role válido, crear la asignación
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
    console.error('[Users] create error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function update(req, res) {
  try {
    const { email, name, password, phone, active } = req.body;
    const data = {};
    if (email) data.email = email.trim().toLowerCase();
    if (name) data.name = name.trim();
    if (phone !== undefined) data.phone = phone || null;
    if (active !== undefined) data.active = Boolean(active);
    if (password) data.password = await bcrypt.hash(password, 12);

    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: USER_SELECT,
    });
    res.json(user);
  } catch (err) {
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Ya existe un usuario con ese email' });
    }
    console.error('[Users] update error:', err);
    res.status(500).json({ error: err.message });
  }
}

async function remove(req, res) {
  try {
    await prisma.user.update({
      where: { id: req.params.id },
      data: { active: false },
    });
    res.status(204).send();
  } catch (err) {
    console.error('[Users] remove error:', err);
    res.status(500).json({ error: err.message });
  }
}

module.exports = { list, getById, create, update, remove };
