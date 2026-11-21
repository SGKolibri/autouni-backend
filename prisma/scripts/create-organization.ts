/*
 * Cria uma organização (tenant) com o primeiro ADMIN dela.
 *
 *   npm run org:create -- --name "Universidade X" --slug univ-x \
 *     --admin-email admin@univ-x.edu --admin-name "Admin" --admin-password 's3nh4-forte'
 *
 * Não há rota HTTP para isto de propósito: nenhum usuário de uma organização
 * deve poder criar outra. É operação de quem administra a instalação.
 */
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const name = arg('name');
  const slug = arg('slug');
  const email = arg('admin-email');
  const adminName = arg('admin-name') ?? 'Administrador';
  const password = arg('admin-password');

  if (!name || !slug || !email || !password) {
    console.error(
      'Uso: --name <nome> --slug <slug> --admin-email <email> --admin-password <senha> [--admin-name <nome>]',
    );
    process.exit(1);
  }
  if (!/^[a-z0-9-]+$/.test(slug)) {
    console.error('slug deve conter só letras minúsculas, números e hífen');
    process.exit(1);
  }
  if (password.length < 6) {
    console.error('A senha precisa de pelo menos 6 caracteres');
    process.exit(1);
  }

  const prisma = new PrismaClient();
  try {
    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        users: {
          create: {
            email,
            name: adminName,
            role: UserRole.ADMIN,
            password: await bcrypt.hash(password, 10),
          },
        },
      },
    });
    console.log(
      `Organização criada: ${org.name} (${org.slug}, id ${org.id}); ADMIN ${email}`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
