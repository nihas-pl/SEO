import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Cleaning up database...');

    // Delete in order to respect foreign key constraints
    await prisma.article.deleteMany();
    await prisma.contentPlan.deleteMany();
    await prisma.discoveredKeyword.deleteMany();
    await prisma.emailVerificationToken.deleteMany();
    await prisma.workspaceMember.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ All users and related data have been successfully deleted.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
