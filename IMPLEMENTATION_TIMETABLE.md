# Timetable Implementation — Backend (`soma-backend`)

Implementation guide for the class timetable feature. Build from this doc directly.

- **Status:** to implement
- **Module:** principal/admin configures; teacher reads own timetable
- **Scope in:** weekly recurring per-class timetable, title + breaks, subject allocation metadata, conflict detection
- **Scope out:** rooms, teacher request-change, per-day time overrides (future)

---

## 1. Data model & migration

### New `Timetable` model

One per class:

```prisma
model Timetable {
  id        String          @id @default(cuid())
  schoolId  String
  classId   String
  title     String
  breaks    Json?          // [{ day: "MONDAY", label: "Long Break", start: "13:00", end: "14:00" }]
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  school School           @relation(fields: [schoolId], references: [id], onDelete: Cascade)
  class  Class            @relation(fields: [classId], references: [id], onDelete: Cascade)
  entries TimetableEntry[]

  @@unique([schoolId, classId])
  @@index([schoolId])
}
```

### `TimetableEntry` change

Add a **nullable** `timetableId` FK so existing rows stay valid:

```prisma
model TimetableEntry {
  id          String    @id @default(cuid())
  schoolId    String
  classId     String
  subjectId   String
  teacherId   String
  day         String
  period      Int
  startTime   String
  endTime     String
  room        String?
  timetableId String?                    // NEW
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  timetable   Timetable? @relation(fields: [timetableId], references: [id], onDelete: Cascade)  // NEW

  @@unique([schoolId, classId, day, period])
  // existing indexes unchanged
}
```

Create a new migration folder, e.g. `prisma/migrations/<timestamp>_timetable_header/`, containing:

```sql
CREATE TABLE "Timetable" (
  "id" TEXT NOT NULL,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "breaks" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Timetable_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "Timetable_schoolId_classId_key" ON "Timetable"("schoolId", "classId");
CREATE INDEX "Timetable_schoolId_idx" ON "Timetable"("schoolId");
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Timetable" ADD CONSTRAINT "Timetable_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TimetableEntry" ADD COLUMN "timetableId" TEXT;
ALTER TABLE "TimetableEntry" ADD CONSTRAINT "TimetableEntry_timetableId_fkey" FOREIGN KEY ("timetableId") REFERENCES "Timetable"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Run via standard flow (this repo uses `prisma.config.ts`).

---

## 2. Controllers

### `src/controllers/timetableController/publishTimetable.ts` — `POST /timetable/publish` (admin)

Request:

```jsonc
{
  "classId": "cls_1",
  "title": "SS1A Term 1",
  "breaks": [
    { "day": "MONDAY", "label": "Short Break", "start": "10:30", "end": "10:45" },
    { "day": "MONDAY", "label": "Long Break",  "start": "13:00", "end": "14:00" },
    { "day": "FRIDAY", "label": "Long Break",  "start": "12:30", "end": "13:15" }
  ],
  "entries": [
    { "subjectId": "sub_1", "day": "MONDAY", "period": 1, "startTime": "08:00", "endTime": "08:40" },
    // ...one flat entry per class-day-period
  ]
}
```

Behavior (in a `prisma.$transaction`):

1. Validate `classId` belongs to `req.user.schoolId` → 404 if not.
2. Validate every entry: `subjectId`, `teacherId` optional resolution happens client-side but server must **resolve teacherId** — look up the teacher assigned to `subjectId + classId` via `TeacherAssignment` (type `subject`) + `TeacherAssignmentClass`. If none → collect an error `{ subjectId, reason: "no-teacher" }`.
3. Validate uniqueness: no two entries share `(classId, day, period)`.
4. **Conflict check vs other classes**: for each entry, check `TimetableEntry` rows in *other* classes (same school) where `day` + overlapping `[startTime, endTime)` and `teacherId` matches. Collect as `conflicts`.
5. Upsert `Timetable` header (`title`, `breaks` = array of `{day,label,start,end}`), delete existing entries for `classId`, insert new entries (set `timetableId`).
6. Response:

```jsonc
{
  "timetable": {
    "id": "tbl_1",
    "classId": "cls_1",
    "className": "SS1A",
    "title": "SS1A Term 1",
    "breaks": [{ "day": "MONDAY", "label": "Short Break", "start": "10:30", "end": "10:45" }],
    "entries": [ /* full entry shape incl. subjectName, teacherName */ ]
  },
  "conflicts": [ /* empty if clean */ ]
}
```

Conflicts shape:

```jsonc
{
  "teacherId": "usr_2",
  "teacherName": "Mrs Adeyemi",
  "day": "MONDAY",
  "startTime": "08:00",
  "endTime": "08:40",
  "currentClassId": "cls_1",
  "currentSubjectId": "sub_1",
  "clashesWithClassId": "cls_2",
  "clashesWithClassName": "SS1B",
  "clashesWithSubjectId": "sub_9",
  "clashesWithSubjectName": "Mathematics"
}
```

Decide policy: **block publish** (400 + `conflicts`) by default — matches "block + guide to adjust". Return them so the wizard can render the amber panel and Suggest Fix.

### `src/controllers/timetableController/getTimetableBuild.ts` — `GET /timetable/build/:classId` (admin)

Response:

```jsonc
{
  "classId": "cls_1",
  "className": "SS1A",
  "title": "SS1A Term 1",              // null if none yet
  "breaks": [/* existing [] */],
  "entries": [/* existing flat entries */],
  "subjects": [
    { "subjectId": "sub_1", "name": "Mathematics", "teacherId": "usr_2", "teacherName": "Mrs Adeyemi" }
  ],
  "busyTeachers": [
    { "teacherId": "usr_2", "teacherName": "Mrs Adeyemi", "classId": "cls_2", "className": "SS1B",
      "day": "MONDAY", "startTime": "08:00", "endTime": "08:40" }
  ]
}
```

- `subjects` = distinct subjects from `TeacherAssignment` (type `subject`) joined through `TeacherAssignmentClass.classId = classId` in this school. Grouped by subject; one subject = one row (first teacher; multiple teachers for the same subject+class return one row per teacher — the frontend may dedupe).
- `busyTeachers` = all `TimetableEntry` rows in this school **excluding** `classId`, mapped to teacher+day+time, so the scheduler can avoid them.

### `src/controllers/timetableController/teacherTimetable.ts` — modify

- Route changes from `requireAdmin()` to `authenticateToken` only.
- Controller: if `req.user.role === "TEACHER"`, force `teacherId = req.user.userId` (403 if the path `teacherId` differs). Admins keep the old behavior (view any teacher).
- Also include the `Timetable.title` + `breaks` (group the returned entries by their header).

### `listTimetable.ts` — modify

`GET /timetable` (admin): include the class's `Timetable` header. Return:

```jsonc
{
  "timetables": [
    {
      "id": "tbl_1", "classId": "cls_1", "className": "SS1A", "title": "SS1A Term 1",
      "breaks": [],
      "entries": [/* full entry shape */]
    }
  ]
}
```

Empty classes still surface via a separate query of classes without a Timetable (so the admin page can show "Build timetable" CTA per class).

Add all new handlers to `timetableController/index.ts`.

---

## 3. Routes (`src/routes/timetable.ts`)

```ts
import { listTimetable, publishTimetable, getTimetableBuild, teacherTimetable } from "../controllers/timetableController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

router.get("/teacher/:teacherId", authenticateToken, teacherTimetable);        // relaxed
router.get("/build/:classId", authenticateToken, requireAdmin(), getTimetableBuild);
router.post("/publish", authenticateToken, requireAdmin(), publishTimetable);
router.get("/", authenticateToken, requireAdmin(), listTimetable);
// existing create/update/delete/bulk kept for back-compat
```

---

## 4. Validation rules (server side, mirror of frontend `allocate.ts`)

- `weeklySlots = Σ entries per class` must be > 0.
- Every entry needs a resolvable teacher (else "no teacher assigned to this subject for this class").
- No `(day, period)` duplicate within the class.
- Teacher busy check across other classes uses **time overlap** on the same `day`:
  `entry.startTime < other.endTime && entry.endTime > other.startTime`.

---

## 5. Errors

Reuse `createErrorResponse` from `utils/errorHandler.ts` (already returns friendly DB-unavailable messaging when Prisma/DB is down).

---

## 6. QA checklist (backend)

1. `POST /timetable/publish` creates header + entries in one transaction; re-publishing replaces cleanly.
2. `breaks` JSON round-trips.
3. Publish blocks when the same teacher is booked in another class at the same day+time.
4. `GET /timetable/build/:classId` returns subjects resolved with teachers and correct `busyTeachers` (excluding own class).
5. Teacher token calling `GET /timetable/teacher/:id` with someone else's id → 403; own id → 200.
6. Old `TimetableEntry` rows (no `timetableId`) still list fine.