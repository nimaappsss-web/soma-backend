require('dotenv').config();
const { Client } = require('pg');
(async () => {
  const conn = process.env.DATABASE_URL + '&uselibpqcompat=true&sslmode=require';
  const c = new Client({ connectionString: conn, connectionTimeoutMillis: 20000, keepAlive: true });
  await c.connect();
  console.log('CONNECTED');
  const teachers = await c.query(`SELECT id, name, role, "schoolId", "formClassId" FROM "User" WHERE role='TEACHER' LIMIT 5`);
  console.log('TEACHERS:', JSON.stringify(teachers.rows, null, 1));
  const t = teachers.rows[0];
  if (t) {
    const cls = await c.query(`SELECT id, name, "schoolId" FROM "Class" WHERE id = $1`, [t.formClassId]);
    console.log('FORM CLASS:', JSON.stringify(cls.rows));
    const students = await c.query(`SELECT status, COUNT(*) FROM "Student" WHERE "classId" = $1 GROUP BY status`, [t.formClassId]);
    console.log('STUDENTS BY STATUS:', JSON.stringify(students.rows));
    const att = await c.query(`SELECT date, status, "studentId" FROM "Attendance" WHERE "classId" = $1 ORDER BY date DESC LIMIT 10`, [t.formClassId]);
    console.log('LATEST ATTENDANCE:', JSON.stringify(att.rows, null, 1));
    const all = await c.query(`SELECT date::date, status, COUNT(*) FROM "Attendance" WHERE "classId" = $1 GROUP BY date::date, status ORDER BY 1 DESC LIMIT 15`, [t.formClassId]);
    console.log('ALL ATTENDANCE AGG:', JSON.stringify(all.rows, null, 1));
  }
  await c.end();
  process.exit(0);
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
