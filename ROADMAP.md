# API Development Roadmap

Phased implementation plan for the Nima School Management backend.  
Reference: `API_REQUIREMENTS.md` for full endpoint specifications.

---

## Phase 1 — Foundational Models

These models are dependencies for later features (exams, reports, attendance analytics).

### 1a. AcademicTerm
Stores term/session structure. Needed by exams, reports, and attendance analytics.

```
AcademicTerm
  id          String   @id @default(cuid())
  schoolId    String
  term        String   // "1", "2", "3"
  session     String   // "2025/2026"
  startDate   DateTime
  endDate     DateTime
  isCurrent   Boolean  @default(false) // only one active at a time
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([schoolId, term, session])
  @@index([schoolId])
```

Endpoints:
- `GET /academic-terms` — list all terms for the school
- `POST /academic-terms` — create a term (sets isCurrent if it's the only one)
- `PATCH /academic-terms/:id` — update term dates
- `DELETE /academic-terms/:id` — delete term
- `POST /academic-terms/:id/set-current` — set a term as current (unsets others)

### 1b. Holiday
School-wide holidays marked by the principal. Used to exclude holidays from attendance percentage calculations.

```
Holiday
  id          String   @id @default(cuid())
  schoolId    String
  date        DateTime // unique per school (date only, no time)
  reason      String   // "Democracy Day", "Mid-term break"
  createdBy   String   // principal userId
  createdAt   DateTime @default(now())

  school      School   @relation(fields: [schoolId], references: [id], onDelete: Cascade)

  @@unique([schoolId, date])
  @@index([schoolId])
  @@index([schoolId, date])
```

Endpoints:
- `GET /attendance/holidays?from=&to=` — list holidays in date range
- `POST /attendance/holiday` — create holiday `{ date, reason }`
- `DELETE /attendance/holiday/:id` — remove holiday

How holidays flow through the system:
- Attendance calendar: each day has `isHoliday: true/false`
- Attendance analytics: school days count = total weekdays - holidays
- Attendance percentage: `(present / (schoolDays - holidays)) * 100`
- Future exams: check if a date is a holiday before scheduling
- Future reports: attendance percentage excludes holidays

### 1c. Class Endpoints
- `GET /classes/:id` — single class with student count and form teacher
- `PATCH /classes/:id` — update class name, level, arm

### 1d. Subject Endpoints
- `PATCH /subjects/:id` — update subject name and code

---

## Phase 2 — Stats & Aggregation

Dashboard and section-level stats. No new models needed.

### 2a. Dashboard Stats
`GET /dashboard/stats` — aggregate counts for dashboard cards.

Response includes:
- Students: total, active, male, female
- Teachers: total, active, pending invites
- Classes: total
- Parents: total, active, pending
- Subjects: total
- Attendance: today's present/absent/percentage
- Finance: collected this term, outstanding, payment rate (placeholder until Phase 6)

### 2b. Student Stats
`GET /students/stats` — total, active, by class, by gender, by status

### 2c. Teacher Stats
`GET /teachers/stats` — total, active, pending invites, by gender

### 2d. Parent Stats
`GET /parents/stats` — total, active, pending

---

## Phase 3 — Student Enhancements

Depends on: Phase 1 (AcademicTerm for academic snapshot), Phase 2 (stats)

### 3a. Student Timeline
`GET /students/:id/timeline` — admission, promotions, status changes

Requires: `StudentTimeline` model

```
StudentTimeline
  id          String   @id @default(cuid())
  studentId   String
  type        String   // ADMISSION, PROMOTION, STATUS_CHANGE, CLASS_TRANSFER
  description String
  date        DateTime
  createdAt   DateTime @default(now())

  student     Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@index([studentId])
```

### 3b. Student Monthly Attendance
`GET /students/:id/attendance/monthly?month=&year=` — calendar grid with `isHoliday` per day

### 3c. Student Academic Snapshot
`GET /students/:id/academics?term=&session=` — average, best/worst subject, attendance %

Depends on: Phase 5 (Examinations/CA for score data)

---

## Phase 4 — Attendance Upgrades

Depends on: Phase 1 (Holiday model)

### 4a. Attendance Summary
- `GET /attendance/summary?date=` — today's summary across all classes
- `GET /attendance/summary/class/:classId?from=&to=` — per-class stats for date range

### 4b. Attendance Analytics
- `GET /analytics/attendance?date=` — drilldown with absentees list
- `GET /analytics/attendance/calendar?month=&year=&classId=` — monthly grid with `isHoliday`

### 4c. Holiday Management
See Phase 1b endpoints.

---

## Phase 5 — Examinations / Continuous Assessment

New models + 9 endpoints. Depends on: Phase 1 (AcademicTerm), Phase 4 (Holidays)

### Models
```
ExamSession
  id          String   @id @default(cuid())
  schoolId    String
  subjectId   String
  name        String   // "First Term Exam", "Mid-term Test"
  type        String   // QUIZ, TEST, ASSIGNMENT, PROJECT, EXAM
  term        String
  session     String
  maxScore    Int
  date        DateTime
  status      String   @default("DRAFT") // DRAFT, PUBLISHED, COMPLETED
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

ExamScore
  id          String   @id @default(cuid())
  examId      String
  studentId   String
  score       Float
  remarks     String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([examId, studentId])
```

### Endpoints
- `GET /exams` — list exam sessions
- `POST /exams` — create exam session
- `GET /exams/:id` — exam detail
- `PATCH /exams/:id` — update exam session
- `DELETE /exams/:id` — delete exam session
- `GET /exams/:id/scores` — get all scores for an exam
- `POST /exams/:id/scores` — submit scores (bulk)
- `GET /exams/:id/student/:studentId` — single student's scores
- `GET /results/term?classId=&term=&session=` — compute term results

---

## Phase 6 — Non-Teaching Staff

New model + 6 endpoints.

### Model
```
Staff
  id          String   @id @default(cuid())
  schoolId    String
  userId      String?  // linked user account (if they accept invite)
  name        String
  email       String?
  phone       String?
  gender      String?
  role        String   // "Bursar", "Librarian", "Cleaner", etc.
  department  String?
  designation String?
  status      String   @default("INVITED") // ACTIVE, INVITED, INACTIVE
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
```

### Endpoints
- `GET /staff` — list staff
- `GET /staff/:id` — staff detail
- `POST /staff` — create staff
- `POST /staff/invite` — invite by email
- `PATCH /staff/:id` — update staff
- `DELETE /staff/:id` — remove staff

---

## Phase 7 — Timetable

New model + 6 endpoints.

### Model
```
TimetableEntry
  id          String   @id @default(cuid())
  schoolId    String
  classId     String
  subjectId   String
  teacherId   String
  day         String   // MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY
  period      Int
  startTime   String   // "08:00"
  endTime     String   // "08:45"
  room        String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@unique([schoolId, classId, day, period])
```

### Endpoints
- `GET /timetable?classId=&day=` — list entries
- `POST /timetable` — create entry
- `PUT /timetable/:id` — update entry
- `DELETE /timetable/:id` — delete entry
- `POST /timetable/bulk` — bulk set timetable for a class
- `GET /timetable/teacher/:teacherId` — teacher's schedule

---

## Phase 8 — Announcements

New model + 5 endpoints.

### Model
```
Announcement
  id          String   @id @default(cuid())
  schoolId    String
  title       String
  message     String
  audience    String   // ALL_STAFF, TEACHING_ONLY, NON_TEACHING_ONLY, ALL_PARENTS, ALL_USERS
  priority    String   @default("NORMAL") // NORMAL, IMPORTANT, URGENT
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
```

### Endpoints
- `GET /announcements` — list (paginated, filterable by audience, priority)
- `POST /announcements` — create
- `GET /announcements/:id` — detail
- `PATCH /announcements/:id` — update
- `DELETE /announcements/:id` — delete

---

## Phase 9 — Calendar & Term Dates

New models + 7 endpoints. Uses AcademicTerm from Phase 1.

### Model
```
CalendarEvent
  id          String   @id @default(cuid())
  schoolId    String
  title       String
  description String?
  date        DateTime
  type        String   // HOLIDAY, EVENT, EXAM, MEETING, SPORTS
  audience    String   @default("ALL") // ALL, TEACHERS, PARENTS, STAFF
  createdBy   String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
```

### Endpoints
- `GET /calendar/events?from=&to=&type=` — list events
- `POST /calendar/events` — create event
- `GET /calendar/events/:id` — event detail
- `PATCH /calendar/events/:id` — update event
- `DELETE /calendar/events/:id` — delete event
- `GET /calendar/terms` — get term dates for current session
- `POST /calendar/terms` — set term dates

---

## Phase 10 — Finance

New models + 8 endpoints.

### Models
```
FeeStructure
  id          String   @id @default(cuid())
  schoolId    String
  classId     String
  term        String
  session     String
  name        String   // "Tuition", "Science Fee", etc.
  amount      Float
  isCompulsory Boolean @default(true)
  createdAt   DateTime @default(now())

Invoice
  id          String   @id @default(cuid())
  schoolId    String
  studentId   String
  feeStructureId String
  amount      Float
  status      String   @default("UNPAID") // UNPAID, PARTIAL, PAID
  dueDate     DateTime?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

Payment
  id          String   @id @default(cuid())
  schoolId    String
  invoiceId   String
  studentId   String
  amount      Float
  method      String   // CASH, TRANSFER, POS, ONLINE
  reference   String?
  recordedBy  String
  createdAt   DateTime @default(now())
```

### Endpoints
- `GET /finance/fee-structures` — list fee structures
- `POST /finance/fee-structures` — create
- `GET /finance/invoices` — list invoices (filter by class, status, student)
- `POST /finance/invoices` — generate invoice
- `PATCH /finance/invoices/:id` — update payment status
- `GET /finance/payments` — list payments
- `POST /finance/payments` — record payment
- `GET /finance/summary` — overall financial summary

---

## Phase 11 — Reports (PDF Generation)

New model + 4 endpoints. Depends on: Phase 5 (Exams), Phase 1 (AcademicTerm), Phase 4 (Attendance)

### Model
```
Report
  id          String   @id @default(cuid())
  schoolId    String
  classId     String
  term        String
  session     String
  type        String   // REPORT_CARD, CLASS_SUMMARY, ATTENDANCE, FULL
  status      String   @default("PENDING") // PENDING, GENERATED, FAILED
  downloadUrl String?
  generatedBy String
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
```

### Endpoints
- `GET /reports/available` — list available report types
- `POST /reports/generate` — generate report
- `GET /reports/:id/download` — download PDF
- `GET /reports/history` — previously generated reports

---

## Phase 12 — Celebrations / Moments

No new model. Derived from User dateOfBirth and createdAt (employment date).

### Endpoint
- `GET /celebrations` — upcoming birthdays and work anniversaries (next 30 days)

---

## Current Status

| Phase | Status |
|-------|--------|
| Phase 1 — Foundational | ✅ Complete |
| Phase 2 — Stats & Aggregation | ✅ Complete |
| Phase 3 — Student Enhancements | ✅ Complete |
| Phase 4 — Attendance Upgrades | ✅ Complete |
| Phase 5 — Examinations/CA | ✅ Complete |
| Phase 6 — Non-Teaching Staff | ✅ Complete |
| Phase 7 — Timetable | ✅ Complete |
| Phase 8 — Announcements | ✅ Complete |
| Phase 9 — Calendar & Terms | ✅ Complete |
| Phase 10 — Finance | ✅ Complete |
| Phase 11 — Reports | ✅ Complete |
| Phase 12 — Celebrations | ✅ Complete |

---

## Key Design Decisions

1. **Holiday model is school-wide only** — principal marks holidays, no class-specific holidays
2. **Holidays exclude from attendance %** — denominator is `schoolDays - holidays`, not total weekdays
3. **Attendance responses include `isHoliday` flag** — each day in calendar/summary indicates if it was a holiday
4. **AcademicTerm has `isCurrent` flag** — only one term active at a time, used for "this term" context
5. **Exams reference term/session** — scores are tied to a specific term
6. **Finance is term-based** — fee structures, invoices, payments tied to term/session
7. **All list endpoints use `{ data, total, page, totalPages }` envelope**
8. **All errors use `{ error, message, statusCode }` shape**
