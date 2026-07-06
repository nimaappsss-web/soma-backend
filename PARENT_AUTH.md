# Parent Authentication & Onboarding

## Overview

Parents are lightweight users in Nima. They don't register themselves — they're added to the system by the school (principal or teacher) through the student's profile. Their access is **read-only**: they can view their child's attendance, grades, and academic records but cannot make changes.

---

## Data Model

```prisma
model Parent {
  id            String   @id @default(cuid())
  schoolId      String
  name          String?
  email         String?
  phone         String?
  passwordHash  String?
  active        Boolean  @default(true)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  school   School         @relation(fields: [schoolId], references: [id])
  children ParentStudent[]
}

model ParentStudent {
  id           String   @id @default(cuid())
  parentId     String
  studentId    String
  relationship String? // "father", "mother", "guardian"

  parent  Parent  @relation(fields: [parentId], references: [id], onDelete: Cascade)
  student Student @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([parentId, studentId])
}
```

### Key Decisions

- One parent account can be linked to multiple students (siblings at the same school)
- A student can have multiple parents linked (father + mother)
- `relationship` field is optional — just a label for display
- Parents are optional users — they don't need to verify immediately
- `name` and `passwordHash` are nullable — null until the parent completes registration

---

## Contact Detection: Email or Phone

The student profile has a single field: **`parentContact`**.

The backend detects the type:

```
"parent@gmail.com"   → email  → send OTP via SendGrid
"08012345678"        → phone  → send OTP via SMS (future)
```

**Rule:** If the string contains `@`, treat as email. Otherwise, treat as phone.

Both `email` and `phone` are stored on the `Parent` model. Whichever was provided gets filled. The other stays null until the parent optionally adds it later.

### SMS Not Ready Yet

If a phone number is provided but SMS integration isn't live yet:
- The invite is still created (stored in DB)
- The UI shows a note: *"Parent will be able to log in using this phone number when SMS is available"*
- The parent can still log in later via email if one is attached, or via phone once SMS is live
- No schema changes needed when SMS arrives — just add the send call next to the email send call

---

## Flows

### Flow 1: School Adds Parent to Student

**Who:** Principal or Teacher

**Action:** On the student's profile page, add `parentContact`.

**Request:**
```
PATCH /api/students/:studentId/parent
{
  "parentContact": "ade.mother@gmail.com",
  "relationship": "mother"
}
```

**Backend does:**
1. Detect contact type (email vs phone)
2. Find or create `Parent` record by email/phone + schoolId
3. Create `ParentStudent` link
4. Send notification to parent:
   - Email: *"Your child Ade's school records are ready to view on Nima. Set up your parent account."*
   - Phone (future): SMS with invite link
5. Return the parent info

**Response:**
```json
{
  "message": "Parent linked successfully",
  "parent": {
    "id": "parent-uuid",
    "email": "ade.mother@gmail.com",
    "isNew": true
  }
}
```

### Flow 2: Parent Onboarding (Self-Service)

**Step 1 — Request OTP:**
```
POST /api/auth/send-otp
{ "email": "ade.mother@gmail.com" }
// OR
{ "phone": "08012345678" }
```

OTP is sent to the contact on file. If no account is found with that contact, the OTP is still sent — the system will create the account on verification (see step 2).

**Step 2 — Verify OTP:**
```
POST /api/auth/verify-email-otp
{
  "email": "ade.mother@gmail.com",
  "code": "123456",
  "deviceId": "device-abc",
  "deviceName": "Chrome Browser"
}
```

If no `Parent` user exists but there's a matching `Parent` record (with linked students), the system auto-creates the user account. Returns `needsRegistration: true`.

**Response:**
```json
{
  "message": "Email verified. Please complete your registration.",
  "user": {
    "id": "parent-uuid",
    "name": "ade.mother@gmail.com",
    "email": "ade.mother@gmail.com",
    "role": "PARENT",
    "schoolId": "school-uuid",
    "schoolName": "Greenfield Secondary School",
    "needsRegistration": true
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

**Step 3 — Complete Registration:**
```
POST /api/auth/complete-registration
{
  "name": "Mrs. Adebayo",
  "password": "SecurePass123"
}
```

No assignments needed — parents don't get `TeacherAssignment` records. Their access is derived from `ParentStudent` links.

**Step 4 — View Children:**
```
GET /api/parents/children
```

**Response:**
```json
{
  "children": [
    {
      "id": "student-uuid",
      "name": "Ade Adebayo",
      "class": "JSS 1A",
      "admissionNo": "GF001",
      "relationship": "mother"
    }
  ]
}
```

### Flow 3: Parent Login (After Registration)

Same as teacher login — uses email/password or OTP.

```
POST /api/auth/login
{ "identifier": "ade.mother@gmail.com", "password": "SecurePass123" }
```

Response includes `role: "PARENT"`. The frontend should check the role and route to the parent dashboard instead of the teacher dashboard.

---

## Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|---|---|---|---|
| `/api/students/:studentId/parent` | PATCH | Yes (Principal/Teacher) | Add parent to student |
| `/api/parents/children` | GET | Yes (Parent) | Get linked students |
| `/api/auth/send-otp` | POST | No | Request OTP |
| `/api/auth/verify-email-otp` | POST | No | Verify OTP + login |
| `/api/auth/complete-registration` | POST | Yes | Set name + password |

---

## Frontend Notes

### Detecting Contact Type

```typescript
function detectContactType(input: string): "email" | "phone" {
  return input.includes("@") ? "email" : "phone";
}
```

### New Parent vs Existing Check

After OTP verification, check `user.needsRegistration`:
- `true` → redirect to parent registration form (name + password only, no assignments)
- `false` → normal login, redirect to parent dashboard

### Parent Dashboard

- Shows list of linked children (from `GET /api/parents/children`)
- Each child card shows: name, class, admission number
- Clicking a child opens their records (attendance, grades) — read-only

### School UI (Adding Parent)

- Student profile has a "Parent" section
- Single input field: `parentContact`
- Optional dropdown: relationship (Father, Mother, Guardian)
- After saving, show the linked parent's info
- Allow adding a second parent (same or different contact)

---

## Reusing Teacher Auth Code

The parent flow intentionally reuses the same auth endpoints:

| Component | Teacher | Parent |
|---|---|---|
| `send-otp` | ✅ Same | ✅ Same |
| `verify-email-otp` | ✅ Same | ✅ Same |
| `complete-registration` | ✅ Same | ✅ Same (no assignments) |
| `login` | ✅ Same | ✅ Same |

The only difference is the `complete-registration` body — parents don't send `assignments`.

---

## Future: SMS Integration

When a WhatsApp/SMS provider is integrated, the changes are minimal:

1. Add SMS send function in `src/utils/sms.ts`
2. In `sendOTP.ts`, add an `else if (phone)` branch that sends via SMS instead of email
3. Update the parent contact detection to trigger SMS for phone numbers
4. Add `POST /api/auth/verify-otp` as an alternative verify endpoint for phone-based parents

No schema or model changes needed.
