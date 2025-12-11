// create-user.mjs
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createUser() {
    try {
        const hashedPassword = await bcrypt.hash('123456', 10);

        const user = await prisma.user.upsert({
            where: { email: 'requester@it' },
            update: {
                password: hashedPassword,
            },
            create: {
                id: 'user_requester_it',
                name: 'Requester IT',
                email: 'requester@it',
                password: hashedPassword,
                role: 'Requester',
            },
        });

        console.log('✅ User created/updated:', user.email);
        console.log('Password: 123456');
    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

createUser();
