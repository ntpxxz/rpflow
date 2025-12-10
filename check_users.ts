
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const users = await prisma.user.findMany();
    console.log('All users:', JSON.stringify(users, null, 2));

    const emp101 = users.find(u => u.name === 'EMP-101' || u.email.includes('EMP-101'));
    if (emp101) {
        console.log('Found EMP-101:', emp101);
    } else {
        console.log('EMP-101 not found');
    }
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
