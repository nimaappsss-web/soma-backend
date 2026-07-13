import { PrismaClient } from '../src/generated/prisma/client/index.js';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const c = new PrismaClient({ adapter });

const classes = await c.class.findMany({ select: { id: true, name: true, level: true } });
console.log('Current classes:', JSON.stringify(classes, null, 2));

const renames = {
  "KG1": "KG 1", "KG2": "KG 2",
  "P1": "Pry 1", "P2": "Pry 2", "P3": "Pry 3",
  "P4": "Pry 4", "P5": "Pry 5", "P6": "Pry 6",
  "JSS1": "JSS 1", "JSS2": "JSS 2", "JSS3": "JSS 3",
  "SS1": "SS 1", "SS2": "SS 2", "SS3": "SS 3"
};

let count = 0;
for (const cls of classes) {
  const newLevel = renames[cls.level];
  if (newLevel && newLevel !== cls.level) {
    const newName = cls.name.replace(cls.level, newLevel);
    console.log(`  ${cls.name} → ${newName}`);
    await c.class.update({
      where: { id: cls.id },
      data: { name: newName, level: newLevel },
    });
    count++;
  }
}

console.log(`Updated ${count} classes`);
await c.$disconnect();
