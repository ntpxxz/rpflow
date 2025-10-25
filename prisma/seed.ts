import { PrismaClient } from '@prisma/client';

// 1. ⚠️ ใช้ path ไปยัง prisma client ของคุณ
// (ถ้าไฟล์ seed.ts อยู่ใน /prisma และ lib อยู่ที่ root, path นี้ควรจะถูก)
import { prisma as db } from '../lib/prisma';

async function main() {
  console.log("Start seeding...");

  // 2. 🔻 สร้าง User ตัวอย่าง 🔻
  // เราใช้ 'upsert' เพื่อให้รันซ้ำได้
  // มันจะ "อัปเดต" ถ้าเจอ ID นี้ หรือ "สร้างใหม่" ถ้าไม่เจอ
  const testUser = await db.user.upsert({
    where: { 
      // ⚠️ คุณต้องมี field ที่เป็น @unique ในโมเดล User
      //    (ถ้าไม่มี id, ให้ใช้ email ที่เป็น @unique แทน)
      id: 'user_test_001' 
    }, 
    update: {}, // ไม่ต้องอัปเดตอะไรถ้าเจอ
    create: {
      id: 'user_test_001', // 👈 นี่คือ ID ที่เราจะใช้
      name: "Sam's Test Account",
    
    email: 'testuser@mail.com' ,
      
      // ⚠️ เพิ่ม field อื่นๆ ที่ "บังคับ" (required) ในโมเดล User ของคุณ
      // เช่น email, password (ถ้ามี)
      // email: 'test@example.com', 
      // password: '...'
    },
  });

  console.log(`Created test user with id: ${testUser.id}`);
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