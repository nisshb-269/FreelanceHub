import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const configuredEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  // Admin creation is opt-in. Never create a publicly predictable default account.
  if (!configuredEmail && !password) {
    console.log('Admin seed skipped: set ADMIN_EMAIL and ADMIN_PASSWORD explicitly to create the first administrator.');
    return;
  }

  if (!configuredEmail || !password) {
    throw new Error('Both ADMIN_EMAIL and ADMIN_PASSWORD must be configured together.');
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configuredEmail)) {
    throw new Error('ADMIN_EMAIL must be a valid email address.');
  }

  if (password.length < 12) {
    throw new Error('ADMIN_PASSWORD must contain at least 12 characters.');
  }

  const existing = await prisma.user.findUnique({ where: { email: configuredEmail } });
  if (existing) {
    if (existing.role !== 'ADMIN') {
      throw new Error('ADMIN_EMAIL belongs to an existing non-admin account. Use a separate administrator email.');
    }

    // A deploy must not silently reset an existing admin password or reactivate a suspended admin.
    console.log('Administrator already exists; existing credentials and account status were left unchanged.');
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      name: 'FreelanceHub Admin',
      email: configuredEmail,
      passwordHash,
      role: 'ADMIN',
      isVerified: true,
    },
  });

  console.log('FreelanceHub administrator account created.');
}

main()
  .catch((error) => {
    console.error('Administrator seed failed:', error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
