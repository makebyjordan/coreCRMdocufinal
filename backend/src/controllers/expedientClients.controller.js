const { prisma } = require('../config/db');

async function addParticipant(req, res) {
  const { expedientId } = req.params;
  const { clientId, role } = req.body;
  
  try {
    const participant = await prisma.expedientClient.create({
      data: { expedientId, clientId, role },
      include: { client: true }
    });
    res.status(201).json(participant);
  } catch (error) {
    res.status(400).json({ error: 'El cliente ya tiene asignado ese rol en este expediente' });
  }
}

async function removeParticipant(req, res) {
  const { id } = req.params;
  await prisma.expedientClient.delete({ where: { id } });
  res.status(204).send();
}

module.exports = { addParticipant, removeParticipant };
