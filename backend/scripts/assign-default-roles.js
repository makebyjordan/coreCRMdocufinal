/**
 * Script para asignar roles por defecto a usuarios sin roles
 * Ejecutar: node scripts/assign-default-roles.js
 */

const { prisma } = require('../src/config/db');

async function assignDefaultRoles() {
  try {
    console.log('🔍 Buscando usuarios sin roles...');

    // Obtener todos los usuarios
    const users = await prisma.user.findMany({
      include: { userRoles: true }
    });

    let updated = 0;

    for (const user of users) {
      // Si el usuario no tiene roles, asignar COMERCIAL por defecto
      if (user.userRoles.length === 0) {
        await prisma.userRoleAssignment.create({
          data: {
            userId: user.id,
            role: 'COMERCIAL',
            assignedAt: new Date(user.createdAt),
          }
        });
        console.log(`✅ Asignado COMERCIAL a ${user.name} (${user.email})`);
        updated++;
      }
    }

    console.log(`\n✨ Listo! ${updated} usuarios actualizados`);
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

assignDefaultRoles();
