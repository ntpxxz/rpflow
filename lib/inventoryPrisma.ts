// lib/inventoryPrisma.ts
import { PrismaClient } from '@prisma/client';


const inventoryPrisma = new PrismaClient({
  datasources: {
    db: { // Default datasource name expected by Prisma
      url: process.env.INVENTORY_DATABASE_URL,
    },
  },
});

export default inventoryPrisma;