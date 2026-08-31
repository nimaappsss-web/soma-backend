require('dotenv').config();
const { PrismaClient } = require('./src/generated/prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL + '?uselibpqcompat=true&sslmode=require', max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
(async () => {
  const c = await prisma.class.findUnique({ where: { id: 'cmsg82b44000y5y1uw49buyle' }, select: { id: true, name: true, level: true, arm: true, schoolId: true } });
  console.log('class:', JSON.stringify(c));
  if (c) {
    const sch = await prisma.school.findUnique({ where: { id: c.schoolId }, select: { id: true, name: true } });
    console.log('school:', JSON.stringify(sch));
    const examSubs = await prisma.examSession.findMany({ where: { schoolId: c.schoolId, classId: c.id, type: 'EXAM' }, select: { subjectId: true }, distinct: ['subjectId'] });
    console.log('exam subjects:', examSubs.length);
    const caSubs = await prisma.examSession.findMany({ where: { schoolId: c.schoolId, classId: c.id, NOT: { type: 'EXAM' } }, select: { subjectId: true }, distinct: ['subjectId'] });
    console.log('ca subjects:', caSubs.length);
  }
  await prisma.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
