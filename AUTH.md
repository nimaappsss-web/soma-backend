# Nima Authentication Architecture

## Overview

Nima uses a multi-tenant, role-based authentication system designed specifically for Nigerian secondary schools. The architecture supports offline-first sync with multiple devices per user.

---

## User Roles & Access Model

### Three Core Roles

1. **Admin (Principal)**
   - Full access to school's entire database
   - Manages teachers, students, classes, and all academic data
   - Account owner for the school tenant
   - Can invite teachers and manage school settings

2. **Teacher**
   - Access scoped by assignments only
   - Can view/edit data for assigned classes and subjects
   - Two types of assignments: form teacher + subject teacher
   - Cannot see other teachers' data or unassigned classes

3. **Bursar (Finance Officer)**
   - Read-only access to academic data
   - Full access to fee records and payment tracking
   - Cannot modify grades or attendance
   - Finance-focused dashboard

### Teacher Assignments Model

Teachers don't have a single role—they have **multiple assignments**. One teacher can be:

- **Form Teacher** for JSS 1A (take attendance, see full student profiles)
- **Subject Teacher** for Mathematics in JSS 1A, JSS 1B, JSS 2A (enter grades for each)
- Or any combination

**Database Model:**
```
Teacher {
  id: string
  schoolId: string
  name: string
  email: string
  role: 'teacher' | 'admin' | 'bursar'
  passwordHash: string
  createdAt: number
}

TeacherAssignment {
  id: string
  teacherId: string
  schoolId: string
  type: 'form' | 'subject'
  subjectId?: string        // only for subject assignments
  // Classes are linked via TeacherAssignmentClass (many-to-many)
}

TeacherAssignmentClass {
  id: string
  assignmentId: string
  classId: string
}
```

**Access Example:**
```
Mr Adeyemi has 2 assignment records:
1. {
     type: 'form',
     classes: ['jss1a']           // form teacher = one class
   }
2. {
     type: 'subject',
     subjectId: 'mathematics',
     classes: ['jss1a', 'jss1b']  // one subject, multiple classes
   }

He can:
✅ Take attendance in JSS 1A (form teacher)
✅ Enter grades for Math in JSS 1A and JSS 1B (subject teacher)
❌ View or edit any data in JSS 2A
```

---

## Registration & Onboarding Flows

### Flow 1: Principal Registration (School Onboarding)

The principal's registration **is** the school onboarding. When a principal signs up, they're creating a new school tenant.

**Step 1: Personal Details**
- Full Name
- Email
- Phone
- Password

**Step 2: School Details**
- School Name
- School Address
- State (dropdown)
- LGA (dropdown)
- School Type (Secondary/Primary)
- School Code (optional)
- **Subdomain** (principal chooses, e.g., `greenfield` → `greenfield.nimaapp.com`)

**Step 3: School Structure**
- Define which classes exist (JSS 1-3, SS 1-3)
- Define number of arms per class (e.g., JSS 1 has 3 arms: A, B, C)
- System auto-generates class records (JSS 1A, JSS 1B, JSS 1C, etc.)

**Step 4: Confirmation**
- Review school setup
- Redirect to principal dashboard

**Backend Creates:**
- School record with unique `schoolId`
- Principal account with `role: 'admin'` tied to `schoolId`
- Class records (JSS 1A, 1B, 1C, etc.) all scoped to `schoolId`
- Default subjects that principal can edit later

### Flow 2: Teacher Invite & Onboarding

Teachers **never** self-register. The principal invites them.

**Principal Action:**
1. Principal goes to "Add Teacher" in dashboard
2. Enters teacher's name, email, phone, and their assignments
3. Clicks "Send Invite"

**Backend Creates:**
- Teacher record with `role: 'teacher'`, NOT YET active
- Invitation token (one-time, expires in 48 hours)
- Sends email with accept link: `nima.com/invite/token123?school=greenfield`

**Teacher Action:**
1. Teacher clicks link from email
2. Lands on "Set Your Password" page showing which school invited them
3. Sets password and clicks "Accept Invite"
4. Teacher record is now `active: true`
5. Teacher logs in normally

**Page:**
```
You've been invited to join
Greenfield Secondary School on Nima

Set your password to get started
─────────────────────────────
Password          [                    ]
Confirm Password  [                    ]

[Accept Invite]
```

---

## Login Flows

### Principal/Admin Login

```
POST /api/auth/login
{
  "email": "principal@greenfield.com",
  "password": "password123",
  "schoolSubdomain": "greenfield"  // optional, helps with multi-tenant
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "principal_1",
    "name": "Mr Taiwo Adebayo",
    "email": "principal@greenfield.com",
    "role": "admin",
    "schoolId": "school_1"
  }
}
```

### Teacher Login

Same endpoint, but response includes teacher's assignments:

```
POST /api/auth/login
{
  "email": "adeyemi@greenfield.com",
  "password": "password123",
  "schoolSubdomain": "greenfield"
}

Response:
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "user": {
    "id": "teacher_1",
    "name": "Mr Adeyemi",
    "email": "adeyemi@greenfield.com",
    "role": "teacher",
    "schoolId": "school_1",
    "assignments": [
      { "id": "assign_1", "type": "form", "classId": "jss1a" },
      { "id": "assign_2", "type": "subject", "classId": "jss1a", "subjectId": "mathematics" },
      { "id": "assign_3", "type": "subject", "classId": "jss1b", "subjectId": "mathematics" }
    ]
  }
}
```

---

## Token Management

### Token Strategy: Refresh Tokens with Offline Grace Period

**Two Token Types:**

1. **Access Token**
   - Short-lived: 1 hour expiry
   - Sent in every API request (`Authorization: Bearer {accessToken}`)
   - Used to verify user is still active and haven't been deactivated

2. **Refresh Token**
   - Long-lived: 30 days expiry
   - Stored securely in HTTP-only cookie
   - Used to silently refresh access token when it expires
   - Only sent back to server, never exposed to client-side JavaScript

### Offline Grace Period

**Problem:** Teacher marking attendance offline, token expires, they get logged out and lose work.

**Solution:** When offline and token expires, **keep the user logged in locally** until they come back online. Then:

1. Try to refresh the token
2. If refresh succeeds, update access token
3. If refresh fails (still offline), retry silently in background
4. Only force logout if offline for 30 days (extremely unlikely)

**Implementation:**
```typescript
// When access token expires but user is offline
if (!isOnline && tokenExpired) {
  // Keep working locally, queue a refresh for when online
  keepUserLoggedIn();
  queueTokenRefresh();
} else if (isOnline) {
  // Online: must refresh before continuing
  refreshToken();
}
```

### Endpoint: Refresh Token

```
POST /api/auth/refresh
{
  "refreshToken": "eyJhbGc..."
}

Response:
{
  "accessToken": "eyJhbGc...",  // new short-lived token
  "expiresIn": 3600             // seconds until expiry
}
```

---

## Password Reset

### Forgot Password Flow

1. User lands on "Forgot Password" page
2. Enters email
3. Backend sends email with reset link (token valid for 1 hour)
4. User clicks link, lands on password reset form
5. User enters new password
6. Backend verifies token, updates password
7. User redirected to login

**Endpoints:**
```
POST /api/auth/forgot-password
{ "email": "teacher@greenfield.com" }

POST /api/auth/reset-password
{
  "token": "reset_token_123",
  "newPassword": "newPassword123"
}
```

---

## Multi-Device Sync Strategy

### Device Model

```
Device {
  id: string              // unique per device
  userId: string
  schoolId: string
  type: 'phone' | 'tablet' | 'web'
  isPrimary: boolean      // only one primary per user
  lastSyncAt: number      // when last sync occurred
  createdAt: number
}
```

### Rules

1. **Primary Device** (usually phone)
   - Can write offline, sync later
   - Used in classroom for attendance
   - Teacher sets on first login

2. **Secondary Devices** (laptop, tablet)
   - Can read offline
   - Writes require connectivity
   - Show warning if trying to write offline: "Your primary device is [Phone]. Changes here will sync when both devices are online."

### Sync Flow on Device Login/Connectivity Return

```
1. Identify device (localStorage or IndexedDB)
2. Check if primary or secondary
3. Push all local pending changes to server
4. Pull all server changes since lastSyncAt
5. Run conflict detection
6. Resolve conflicts (majority: last-write-wins)
7. Update local Dexie with server state
8. Update lastSyncAt timestamp
9. Mark sync complete
```

### Conflict Resolution (MVP)

For MVP, use **last-write-wins silently** with logging:

```
If two devices edit the same record while offline:
- Compare updatedAt timestamp
- Keep version with most recent timestamp
- Log conflict to server table for later analysis
```

Later iteration: Show conflict UI to teacher for significant conflicts (>30 min apart suggests genuine simultaneous edits).

### Session Management

Teacher can view and revoke active sessions:

```
Active Sessions
─────────────────────────────
iPhone 13          Lagos    Now
Samsung Galaxy     Lagos    2 days ago
Chrome, MacBook    Lagos    5 days ago

[Log out all other devices]
```

---

## Teacher Deactivation

When principal removes a teacher, access revokes immediately:

1. Principal clicks "Remove Teacher"
2. Backend sets `Teacher.active = false`
3. On next API request from that teacher, validate `active` status (don't just trust token)
4. Teacher gets logged out and shown "Your access has been revoked"

---

## Security Considerations

### Password Hashing
- Use **bcryptjs** with salt rounds 10+
- Never store plaintext passwords

### Token Secrets
- Store `JWT_SECRET` in environment variables only
- Different secrets for access vs refresh tokens in production

### School Isolation (Multi-tenant)
- Every query filters by `schoolId`
- Teachers can only access their own school
- No cross-school data leakage

### Invite Token Expiry
- Invite tokens expire in 48 hours
- Principal can resend if teacher doesn't accept in time

### Password Reset Token Expiry
- Reset tokens expire in 1 hour
- One-time use only

---

## Endpoints Summary

| Endpoint | Method | Auth | Purpose |
|----------|--------|------|---------|
| `/api/auth/register` | POST | No | Principal creates school |
| `/api/auth/login` | POST | No | Any user login |
| `/api/auth/refresh` | POST | No | Refresh access token |
| `/api/auth/logout` | POST | Yes | Invalidate tokens |
| `/api/auth/forgot-password` | POST | No | Request password reset |
| `/api/auth/reset-password` | POST | No | Complete password reset |
| `/api/auth/me` | GET | Yes | Get current user info |
| `/api/auth/invite-teacher` | POST | Yes (Admin) | Principal invites teacher |
| `/api/auth/accept-invite` | POST | No | Teacher accepts invite |
| `/api/auth/sessions` | GET | Yes | List active sessions |
| `/api/auth/sessions/:id/revoke` | POST | Yes | Revoke a session |

---

## Data Flow Diagram

```
Teacher Opens App (Offline)
        ↓
Check localStorage for tokens
        ↓
Tokens valid? YES → Load Dashboard
                    ↓
                Pull Dexie (local data)
                ↓
                Show cached data
                
Tokens valid? NO → Show Login Screen

Teacher Logs In
        ↓
POST /api/auth/login (email, password)
        ↓
Backend validates credentials
        ↓
Generates accessToken (1h) + refreshToken (30d)
        ↓
Returns user data + assignments
        ↓
Frontend stores tokens
        ↓
Frontend syncs user data + assignments to Dexie
        ↓
Dashboard loads

Connection Returns After Offline Work
        ↓
Sync engine wakes up
        ↓
Access token expired? YES → POST /api/auth/refresh
                              ↓
                              Backend validates refreshToken
                              ↓
                              Returns new accessToken
                              ↓
                              Sync continues
                              
Access token valid? YES → Sync attendance/grades
                           ↓
                           Push to server
                           ↓
                           Pull latest from server
                           ↓
                           Conflict check
                           ↓
                           Update Dexie
```

---

## Environment Variables Required

```
DATABASE_URL=postgresql://...
JWT_SECRET=your_jwt_secret_key_here
JWT_REFRESH_SECRET=your_refresh_secret_here
INVITE_TOKEN_EXPIRY=48h
PASSWORD_RESET_EXPIRY=1h
ACCESS_TOKEN_EXPIRY=1h
REFRESH_TOKEN_EXPIRY=30d
NODE_ENV=development|production
```

---

## Next Steps

1. ✅ Understand this authentication model
2. Build Prisma schema with all these models
3. Create auth endpoints (register, login, refresh, etc.)
4. Test locally with Neon database
5. Build device sync logic
6. Integrate with frontend Dexie

Ready to proceed?
