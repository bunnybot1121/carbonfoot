import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Clearing database...');
  await prisma.logItem.deleteMany({});
  await prisma.log.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Seeding user...');
  const hashedPassword = await bcrypt.hash('password', 10);
  const user = await prisma.user.create({
    data: {
      id: 'default-user',
      email: 'user@gmail.com',
      password: hashedPassword,
      name: 'Eco Warrior',
      homeLat: 37.7749,
      homeLng: -122.4194,
      country: 'US',
      monthlyGoal: 400.0, // kg CO2e
    },
  });
  console.log(`Created user: ${user.id} (${user.email} / password)`);
  console.log('Database initialized with clean default user!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
