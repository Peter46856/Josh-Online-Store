import { PrismaClient } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import 'dotenv/config';

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const pipesCategory = await prisma.category.create({
    data: { name: 'Pipes & Fittings' },
  });

  const irrigationCategory = await prisma.category.create({
    data: { name: 'Irrigation' },
  });

  await prisma.product.createMany({
    data: [
      {
        name: 'PVC Pipe 3m - 1 inch',
        description: 'Durable PVC pipe, 1 inch diameter, 3 meter length',
        price: 450,
        quantity: 100,
        categoryId: pipesCategory.id,
      },
      {
        name: 'PVC Elbow Joint 90°',
        description: '1 inch PVC elbow fitting',
        price: 60,
        quantity: 200,
        categoryId: pipesCategory.id,
      },
      {
        name: 'Drip Irrigation Kit - 50m',
        description: 'Complete drip line kit for small farm plots',
        price: 3200,
        quantity: 25,
        categoryId: irrigationCategory.id,
      },
    ],
  });

  console.log('Seed data created.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });