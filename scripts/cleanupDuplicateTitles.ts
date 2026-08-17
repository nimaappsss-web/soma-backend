import { prisma } from "../src/utils/prisma";
import { normalizePersonName } from "../src/utils/personName";

/**
 * One-off cleanup: collapse doubled leading titles in stored names, e.g.
 * "Mr Mr Jonah Josiah" -> "Mr Jonah Josiah". Fixes rows written before the
 * frontend/backend guard was added.
 */
async function main() {
  let usersUpdated = 0;
  let studentsUpdated = 0;
  let invitesUpdated = 0;

  const users = await prisma.user.findMany({ select: { id: true, name: true } });
  for (const u of users) {
    const clean = normalizePersonName(u.name);
    if (clean !== u.name) {
      await prisma.user.update({ where: { id: u.id }, data: { name: clean } });
      usersUpdated++;
      console.log(`User ${u.id}: "${u.name}" -> "${clean}"`);
    }
  }

  const students = await prisma.student.findMany({ select: { id: true, parentName: true } });
  for (const s of students) {
    if (!s.parentName) continue;
    const clean = normalizePersonName(s.parentName);
    if (clean !== s.parentName) {
      await prisma.student.update({ where: { id: s.id }, data: { parentName: clean } });
      studentsUpdated++;
      console.log(`Student ${s.id}: "${s.parentName}" -> "${clean}"`);
    }
  }

  const invites = await prisma.inviteToken.findMany({ select: { id: true, invitedName: true } });
  for (const i of invites) {
    if (!i.invitedName) continue;
    const clean = normalizePersonName(i.invitedName);
    if (clean !== i.invitedName) {
      await prisma.inviteToken.update({ where: { id: i.id }, data: { invitedName: clean } });
      invitesUpdated++;
      console.log(`Invite ${i.id}: "${i.invitedName}" -> "${clean}"`);
    }
  }

  console.log(`Done. users=${usersUpdated} students=${studentsUpdated} invites=${invitesUpdated}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});