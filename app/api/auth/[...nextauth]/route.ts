// app/api/auth/[...nextauth]/route.ts

import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma"; // 👈 Import singleton client

// 1. นิยาม authOptions ที่เราจะใช้
export const authOptions: NextAuthOptions = {
  // 2. เชื่อมต่อ Prisma
  adapter: PrismaAdapter(prisma),

  // 3. ตั้งค่า Provider (ตัวอย่างคือ Google)
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // (คุณสามารถเพิ่ม Provider อื่นๆ เช่น Email, GitHub ที่นี่)
  ],

  // 4. ตั้งค่า Session
  session: {
    strategy: "jwt", // 👈 ใช้ JWT
  },

  // 5. (สำคัญมาก) เพิ่ม Role และ ID เข้าไปใน Session Token
  callbacks: {
    async jwt({ token, user }) {
      // (หลังจาก Login ครั้งแรก user object จะถูกส่งมา)
      if (user) {
        token.id = user.id;
        token.role = (user as any).role; // 👈 (Schema ของเรามี 'role' อยู่แล้ว)
      }
      return token;
    },
    async session({ session, token }) {
      // (ส่งข้อมูลจาก token ไปยัง session ที่ Client/Server Component เห็น)
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as any; // 👈 (เช่น "REQUESTER", "ADMIN")
      }
      return session;
    },
  },

  // (Optional) หน้า Login (ถ้าไม่ใส่ จะใช้หน้า default ของ NextAuth)
  // pages: {
  //   signIn: '/auth/signin',
  // }
};

// 6. Export handler
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };