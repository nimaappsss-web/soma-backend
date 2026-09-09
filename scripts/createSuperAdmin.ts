import { prisma } from "../src/utils/prisma";
import { hashPassword } from "../src/utils/password";

// Creates (or updates) a SUPER_ADMIN user from CLI args:
//   npm run create-super-admin -- --email admin@checksoma.com --name "Soma Admin" --password "supersecret"
async function main() {
  const args = process.argv.slice(2);
  const get = (flag: string) => {
    const idx = args.indexOf(flag);
    return idx >= 0 ? args[idx + 1] : undefined;
  };

  const email = get("--email");
  const name = get("--name") || "Soma Admin";
  const password = get("--password");

  if (!email || !password) {
    console.error(
      "Usage: npm run create-super-admin -- --email admin@example.com --password 'secret' [--name 'Soma Admin']",
    );
    process.exit(1);
  }

  const passwordHash = await hashPassword(password);

  const existing = await prisma.user.findFirst({ where: { email } });

  if (existing) {
    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: "SUPER_ADMIN",
        passwordHash,
        emailVerified: true,
        active: true,
        name,
        schoolId: null,
      },
    });
    console.log(`Updated existing user ${updated.email} to SUPER_ADMIN`);
  } else {
    const created = await prisma.user.create({
      data: {
        name,
        email,
        role: "SUPER_ADMIN",
        passwordHash,
        emailVerified: true,
        active: true,
        approvalStatus: "APPROVED",
      },
    });
    console.log(`Created SUPER_ADMIN ${created.email}`);
  }
}

main()
  .catch((err) => {
    console.error("Failed to create super admin:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });