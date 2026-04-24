/**
 * Script para crear usuario admin inicial
 * Ejecutar: node scripts/create-admin.js
 */
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@crm.com';
  const password = 'admin123';
  
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log('✅ Usuario admin ya existe:', email);
    process.exit(0);
  }

  const hashed = await bcrypt.hash(password, 12);
  
  const user = await prisma.user.create({
    data: {
      email,
      name: 'Administrador',
      password: hashed,
      role: 'DIRECCION',
      active: true,
    },
  });

  console.log('✅ Usuario admin creado:');
  console.log('   Email:', email);
  console.log('   Password:', password);
  console.log('   Rol: DIRECCION');
}

main()
  .catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
