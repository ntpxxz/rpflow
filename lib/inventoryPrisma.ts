// lib/inventoryPrisma.ts
import { PrismaClient } from '@prisma/inventory-client';


const inventoryPrisma = new PrismaClient({
  datasources: {
    inventoryDb: { // ชื่อ datasource ที่ตั้งใน inventory.prisma
      url: process.env.INVENTORY_DATABASE_URL,
    },
  },
});

export default inventoryPrisma;