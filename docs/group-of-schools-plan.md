# Group of Schools — Future Plan

## Concept
A super-admin (`GROUP_ADMIN`) registers a school group, then invites principals to manage individual branches under that group.

## New Role Hierarchy
```
GROUP_ADMIN  →  PRINCIPAL  →  SCHOOL_ADMIN  →  TEACHER / BURSAR
```

## Prisma Changes
```prisma
model SchoolGroup {
  id        String   @id @default(cuid())
  name      String
  logo      String?
  createdAt DateTime @default(now())

  schools   School[]
  users     User[]
}

model School {
  // existing fields...
  groupId   String?  // ← new, nullable for standalone schools
  group     SchoolGroup? @relation(fields: [groupId], references: [id])
}
```

`User.role` gets `"GROUP_ADMIN"` as a new enum value.

## Auth / Middleware
- `requireGroupAdmin()` — checks `role === "GROUP_ADMIN"`
- `GROUP_ADMIN` JWT carries `groupId` instead of `schoolId`
- Data queries: if user has `groupId`, filter by `school.groupId` instead of `schoolId`
- Existing per-school queries unchanged for principals/teachers

## Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/auth/register-group` | Registers group + creates `GROUP_ADMIN` user |
| `POST /api/auth/invite-principal` | Invites a principal + creates a new school branch under the group |
| `GET /api/groups/me` | Group admin dashboard — aggregated stats across all branches |
| `GET /api/groups/schools` | List all branches under the group |
| `GET /api/groups/schools/:id/stats` | Per-branch stats |
| `GET /api/groups/principals` | List principals across branches |

## Invite Flow (matches current pattern)
```
GROUP_ADMIN creates invite → invite token stored
Principal clicks link → accepts with name + password
New school branch created with the groupId + principal assigned
```

## Data Isolation Rules
- `GROUP_ADMIN` sees everything under their `groupId`
- `PRINCIPAL` sees only their `schoolId` (unchanged)
- All existing queries remain the same — just add `groupId` filter at the group admin level
- Admission counters unique per school (already the case)

## What Breaks / Needs Migration
- JWTs without `groupId` — group admin needs a new token with `groupId` field
- Existing standalone schools — `groupId` is null, they continue working as-is
- Rate limiters keyed by `req.user.userId` — unaffected

## What Doesn't Change
- Class/subject seeding per `schoolType`
- All existing endpoints for teachers, students, attendance, lesson notes
- Offline sync scoping

## Status
- [ ] Design review
- [ ] Prisma schema migration
- [ ] Auth middleware updates
- [ ] Registration + invite endpoints
- [ ] Group admin dashboard endpoints
- [ ] Permission cleanup on existing controllers
