
import { PrismaClient, UserRole } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const hashedPassword = await bcrypt.hash('123456', 10);

    const user = await prisma.user.upsert({
        where: { email: 'EMP-101@example.com' },
        update: {
            password: hashedPassword,
            name: 'EMP-101',
            role: UserRole.Requester,
        },
        create: {
            email: 'EMP-101@example.com',
            name: 'EMP-101',
            password: hashedPassword,
            role: UserRole.Requester,
        },
    });

    console.log('User EMP-101 created/updated:', user);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
