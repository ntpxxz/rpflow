# Migration Summary: approverEmail → userMail

## วันที่: 2025-12-10

## การเปลี่ยนแปลง

### 1. Database Schema
- ✅ เพิ่ม column `user_mail` (VARCHAR) ใน table `users`
- ✅ Migrate ข้อมูลจาก `approver_email` → `user_mail`
- ✅ ลบ column `approver_email` ออกจาก database

### 2. Prisma Schema (`prisma/schema.prisma`)
- ✅ เปลี่ยนจาก `approverEmail String?` เป็น `userMail String? @map("user_mail")`
- ✅ Regenerate Prisma Client

### 3. API Updates

#### `app/api/purchase-requests/route.ts`
- ✅ อัปเดต comments จาก `approverEmail` → `userMail`
- ✅ ใช้ `approver.userMail` แทน `approver.approverEmail`
- ✅ Console logs แสดง `userMail` แทน `approverEmail`

#### `app/api/users/route.ts`
- ✅ รองรับ `userMail` field ในการสร้างและแก้ไข user

### 4. UI Components

#### `app/(app)/settings/page.tsx`
- ✅ Form input สำหรับ "Notification Email" ใช้ `userMail`
- ✅ แสดง `userMail` ใน user list table

### 5. Docker Deployment
- ✅ Rebuild Docker image ด้วย Prisma schema ใหม่
- ✅ ทดสอบการทำงานใน production environment

## ผลลัพธ์

### Database Structure (Final)
```sql
Table: users
- id (text)
- name (text)
- email (text)
- role (USER-DEFINED)
- password (text)
- user_mail (character varying) ← Field เดียวสำหรับ notification email
```

### API Behavior
- ระบบจะส่ง email notification ไปที่ `user_mail` ถ้ามีการตั้งค่า
- ถ้าไม่มี `user_mail` จะใช้ `email` (login email) แทน
- ใช้ได้กับทุก role (Requester, Approver, Purchaser, Admin)

## การทดสอบ
- ✅ TypeScript compilation: No errors
- ✅ Next.js build: Success
- ✅ Docker build: Success
- ✅ API `/api/users`: Status 200
- ✅ Login functionality: Working

## ข้อมูล Login (Testing)
- Email: `requester@it` / Password: `123456`
- Email: `approver@it` / Password: `123456`
- Email: `purchaser@it` / Password: `123456`
- Email: `admin@it.spd` / Password: `123456`

## Notes
- Field `user_mail` เป็น optional (nullable)
- ระบบจะ fallback ไปใช้ login email ถ้าไม่มีการตั้งค่า `user_mail`
- การเปลี่ยนแปลงนี้ทำให้ระบบมีความยืดหยุ่นมากขึ้น เพราะ user ทุก role สามารถตั้งค่า notification email ได้
