import { PrismaClient } from "./src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    select: { email: true, phone: true, role: true },
  });
  console.log(JSON.stringify(users, null, 2));
  await prisma.$disconnect();
}
main();
