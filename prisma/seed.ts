// prisma/seed.ts
import { PrismaClient, UserRole } from '@prisma/client';
import { prisma as db } from '../lib/prisma';
import * as bcrypt from 'bcryptjs'; // 👈 1. Import bcrypt

async function main() {
  console.log("Start seeding...");

  // 👈 2. เตรียม Hash Password (ใช้ 123456 เหมือนกันหมดเพื่อง่ายต่อการเทส)
  const hashedPassword = await bcrypt.hash('123456', 10);

  // --- 1. Requester ---
  const requesterUser = await db.user.upsert({
    where: { email: 'requester@example.com' },
    update: { 
      role: UserRole.Requester,
      password: hashedPassword // อัปเดตรหัสผ่านด้วยหากรันซ้ำ
    }, 
    create: {
      id: 'user_requester_001', 
      name: 'Test Requester',
      email: 'requester@example.com',
      password: hashedPassword, // 👈 ใส่รหัสผ่าน
      role: UserRole.Requester, 
    },
  });
  console.log(`Created: ${requesterUser.email} (Pass: 123456)`);

  // --- 2. Approver ---
  const approverUser = await db.user.upsert({
    where: { email: 'approver@example.com' },
    update: { 
      role: UserRole.Approver,
      password: hashedPassword 
    },
    create: {
      id: 'user_approver_001',
      name: 'Test Approver',
      email: 'approver@example.com',
      password: hashedPassword, // 👈 ใส่รหัสผ่าน
      role: UserRole.Approver, 
    },
  });
  console.log(`Created: ${approverUser.email} (Pass: 123456)`);

  // --- 3. Purchaser ---
  const purchaserUser = await db.user.upsert({
    where: { email: 'purchaser@example.com' },
    update: { 
      role: UserRole.Purchaser,
      password: hashedPassword 
    },
    create: {
      id: 'user_purchaser_001',
      name: 'Test Purchaser',
      email: 'purchaser@example.com',
      password: hashedPassword, // 👈 ใส่รหัสผ่าน
      role: UserRole.Purchaser, 
    },
  });
  console.log(`Created: ${purchaserUser.email} (Pass: 123456)`);

  // --- 4. Admin ---
  const adminUser = await db.user.upsert({
    where: { email: 'admin@example.com' },
    update: { 
      role: UserRole.Admin,
      password: hashedPassword 
    },
    create: {
      id: 'user_admin_001',
      name: 'Test Admin',
      email: 'admin@example.com',
      password: hashedPassword, // 👈 ใส่รหัสผ่าน
      role: UserRole.Admin, 
    },
  });
  console.log(`Created: ${adminUser.email} (Pass: 123456)`);

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