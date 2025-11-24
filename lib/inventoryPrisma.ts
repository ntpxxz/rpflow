// lib/inventoryPrisma.ts
// @ts-ignore
import { PrismaClient } from '@prisma/inventory-client';

const globalForPrisma = global as unknown as { inventoryPrisma: PrismaClient };

export const inventoryPrisma =
  globalForPrisma.inventoryPrisma ||
  new PrismaClient({
    datasources: {
      // 👇 แก้ตรงนี้จาก 'db' เป็น 'inventoryDb' ให้ตรงกับ schema
      inventoryDb: { 
        url: process.env.INVENTORY_DATABASE_URL,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.inventoryPrisma = inventoryPrisma;

export default inventoryPrisma;