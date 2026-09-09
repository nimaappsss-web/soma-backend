import { prisma } from "../src/utils/prisma";

async function main() {
  const n = await prisma.user.count();
  console.log("DB REACHABLE, total users:", n);
  const sas = await prisma.user.findMany({
    where: { role: "SUPER_ADMIN" },
    select: { email: true, name: true },
  });
  console.log("super admins:", JSON.stringify(sas));
  process.exit(0);
}
main().catch((e) => {
  console.log("DB UNREACHABLE:", (e.message || "").split("\n")[0]);
  process.exit(1);
});
