// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client'; // 👈 Import UserRole

// 1. ⚠️ ใช้ path ไปยัง prisma client ของคุณ
// (ถ้าไฟล์ seed.ts อยู่ใน /prisma และ lib อยู่ที่ root, path นี้ควรจะถูก)
import { prisma as db } from '../lib/prisma';

async function main() {
  console.log("Start seeding...");

  // --- สร้าง User ตัวอย่าง ---
  const requesterUser = await db.user.upsert({
    where: { email: 'requester@example.com' }, // 👈 ใช้ email เป็น unique key
    update: {},
    create: {
      id: 'user_requester_001', // กำหนด ID หรือปล่อยให้ Prisma สร้าง cuid()
      name: 'Test Requester',
      email: 'requester@example.com',
      role: UserRole.REQUESTER, // 👈 กำหนด Role
    },
  });
  console.log(`Created requester user: ${requesterUser.email} (Role: ${requesterUser.role})`);

  const approverUser = await db.user.upsert({
    where: { email: 'approver@example.com' },
    update: {},
    create: {
      id: 'user_approver_001',
      name: 'Test Approver',
      email: 'approver@example.com',
      role: UserRole.APPROVER, // 👈 กำหนด Role
    },
  });
  console.log(`Created approver user: ${approverUser.email} (Role: ${approverUser.role})`);

  const purchaserUser = await db.user.upsert({
    where: { email: 'purchaser@example.com' },
    update: {},
    create: {
      id: 'user_purchaser_001',
      name: 'Test Purchaser',
      email: 'purchaser@example.com',
      role: UserRole.PURCHASER, // 👈 กำหนด Role
    },
  });
  console.log(`Created purchaser user: ${purchaserUser.email} (Role: ${purchaserUser.role})`);

  const adminUser = await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: 'user_admin_001',
      name: 'Test Admin',
      email: 'admin@example.com',
      role: UserRole.ADMIN, // 👈 กำหนด Role
    },
  });
  console.log(`Created admin user: ${adminUser.email} (Role: ${adminUser.role})`);

  console.log("Seeding finished.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });