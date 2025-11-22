// middleware.ts
import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login", // ถ้าไม่มี Session ให้ดีดไปหน้านี้
  },
});

export const config = {
  // ระบุหน้าที่ต้องการป้องกัน (ห้ามเข้าถ้าไม่ Login)
  matcher: [
    "/dashboard/:path*", 
    "/purchase-requests/:path*", 
    "/purchase-orders/:path*", 
    "/approval/:path*",
    "/procurement/:path*",
    "/reports/:path*",
    "/settings/:path*",
    // หรือ "/" ถ้าคุณอยากให้หน้าแรกก็ต้อง Login
  ],
};