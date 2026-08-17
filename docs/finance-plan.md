# Soma Finance — Backend Plan (School Fees v1)

> Working reference for the school-fees finance module backend. Last updated: Aug 2026. Frontend counterpart lives in the frontend repo's `docs/FINANCE-PLAN.md`.

## 1. Model

- **School fees only** for now (custom/other fees: phase 2).
- Fees are **per class + term** (`FeeStructure`), invoiced **per student** (`Invoice`).
- Payment flow: parent submits a transaction ID + amount → **PENDING** → bursar confirms → **CONFIRMED** → invoice status recomputed → receipt generated → parent notified.
- Two payment paths: **Manual** (primary, ₦0 fees, bursar-confirmed) and **Paystack** (optional, webhook-driven, fully automatic).

## 2. Existing surface (already built)

Routes live at `/api/finance/*`:

| Route | Controller | Notes |
|-------|-----------|-------|
| `GET /finance/fee-structures` | `listFeeStructures` | Filter by classId/term/session; resolves session |
| `POST /finance/fee-structures` | `createFeeStructure` | classId, term, name, amount, isCompulsory |
| `GET /finance/invoices` | `listInvoices` | Filter classId/status/studentId; paginated |
| `POST /finance/invoices` | `createInvoice` | Single per-student invoice |
| `GET /finance/payments` | `listPayments` | Filter studentId/invoiceId; paginated |
| `POST /finance/payments` | `recordPayment` | Recomputes invoice PARTIAL/PAID from summed payments |
| `GET /finance/summary` | `financeSummary` | Expected/Collected/Outstanding/rate + byClass + recent |

**Existing behavior that must be preserved/adjusted:**
- `recordPayment` recomputes `UNPAID → PARTIAL → PAID` from the sum of payments. **Change: only sum `CONFIRMED` payments** — pending/rejected must never touch the balance.

## 3. Backend additions

### Data model (Prisma migration)

**`Payment` gets a status + timestamps:**
- `status String @default("CONFIRMED")` — `PENDING | CONFIRMED | REJECTED`
- `submittedAt DateTime?` — when the parent sent the txn ID (preserve exactly; never overwritten)
- `confirmedAt DateTime?` — when the bursar confirmed/rejected
- `rejectedReason String?`
- `@@unique([schoolId, reference])` — one txn ID = one payment (dedupe at the DB level)

**`Invoice` unchanged** — status still computed from confirmed payment sums.

### Auth / roles

- `src/types/index.ts` already has `role?: "TEACHER" | "BURSAR"` — promote `BURSAR` as a first-class role.
- **Fix `staffController/inviteStaff.ts`**: line ~52 hardcodes `role: "STAFF"` on the invite token. Pass the body `role` through (default `"STAFF"`). `acceptInvite` already creates the User with `inviteToken.role` — no change there.
- **New guard** in `middleware/auth.ts`: `requireFinance()` = `PRINCIPAL | SCHOOL_ADMIN | BURSAR`. Apply to all finance routes (replace `requireAdmin()`).
- `generateInviteLink` already stamps `role` from the body (`authController/generateInviteLink.ts:33`) — works for BURSAR as-is.

### Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /finance/invoices/bulk` | Generate invoices for a whole class + term from its fee structures |
| `POST /finance/payments` (extend) | Accept `status` (PENDING for parent submit, CONFIRMED for bursar), `submittedAt`; dedupe on reference; clamp overshoot; recompute invoice from confirmed sum; auto-reject sibling pendings when invoice reaches PAID; generate receipt; fan-out notification |
| `PATCH /finance/payments/:id` (new) | Bursar confirm/reject: PENDING → CONFIRMED/REJECTED, sets confirmedAt + rejectedReason, recomputes invoice, generates receipt, notifies parent |
| `GET /finance/receipts?studentId=` (new) | Receipts for a student / parent (per term) |
| `POST /api/webhooks/paystack` (phase 7) | Payment webhook, signature-verified; lookup invoice by reference; create CONFIRMED payment; receipt + notify |
| `GET /school/settings` (extend) | Payment config: mode (`manual`/`paystack`/`both`), manual bank details, Paystack surcharge % + flat fee |

### Notifications

- Add `"FEE"` to `NotificationType` in `src/utils/notifications.ts`.
- Fan-outs (reuse `notifyUser`/`notifyMany`/`parentUserIdsForStudents`):
  - Parent submits payment → notify school admins + bursar ("{parent} submitted ₦X for {child}").
  - Bursar confirms → notify parent ("Payment confirmed for {child}").
  - Bursar rejects → notify parent ("Payment not accepted — reason").
  - "Send reminder" on unpaid invoices → `notifyMany` to linked parents.

### Receipts

- Auto-generate a receipt on every CONFIRMED payment: `receiptNo` (e.g. `{schoolCode}-{year}-{seq}`), student, invoice, amount, method, txn reference, submittedAt/confirmedAt, school details.
- Store `receiptNo` on `Payment` (or a `Receipt` model). Served via `GET /finance/receipts`.

### Conflict prevention (server-enforced)

1. **Duplicate txn ID**: `@@unique([schoolId, reference])` + pre-check in submit/confirm → 409 "transaction already submitted".
2. **Only CONFIRMED counts**: all invoice sums filter `status: "CONFIRMED"`.
3. **Auto-reject siblings**: when a confirm completes an invoice (PAID), other PENDING payments for that invoice → REJECTED ("already paid").
4. **Overshoot clamp**: confirmed amount clamped to remaining balance + flagged in receipt/notification (overpayment→credit is phase 2).
5. **Offline/sync**: PENDING→CONFIRMED is a status flip, idempotent on flush.

### Paystack (phase 7, deferred)

- **Central Soma Paystack account + per-school subaccounts** (recommended; chosen over school-own-keys).
- `percentage_charge` on subaccounts: school nets 100% of the fee; gateway + Soma cut come out of a surcharge (school-configured `% + flat`), always shown as an exact ₦ amount + disclaimer before checkout.
- Initialize checkout with the invoice as reference; webhook verifies signature, looks up invoice by reference, creates CONFIRMED payment.

## 4. Build order (backend)

1. **Data model**: `Payment.status/submittedAt/confirmedAt/rejectedReason` + unique reference; `prisma db push --accept-data-loss` + `prisma generate`.
2. **Roles**: `requireFinance()` guard; `inviteStaff` role passthrough; BURSAR first-class.
3. **Payments**: extend record/parent-submit + confirm/reject endpoint; confirmed-only sums; dedupe; sibling auto-reject; overshoot clamp.
4. **Bulk invoices**: `POST /finance/invoices/bulk`.
5. **Receipts**: receiptNo + `GET /finance/receipts`.
6. **Notifications**: `FEE` type + fan-outs + reminders.
7. **Settings**: payment config in `getSettings`.
8. **Paystack** (deferred): subaccounts + checkout + webhook.

## 5. Decisions locked

- Bursar confirmation required; parent submits txn ID + amount. ✅
- Only CONFIRMED payments count; dedupe + auto-reject + clamp server-side. ✅
- Bursar = non-teacher with `BURSAR` role; `requireFinance()` guard. ✅
- Central Paystack + subaccounts; surcharge with disclaimer (deferred). ✅
- School fees only; custom fees phase 2. ✅

## 6. Notes / pitfalls

- **Never run `prisma migrate dev`** — live DB drifted from the migrations folder; it demands a destructive reset. Use `prisma db push --accept-data-loss` + `prisma generate`, and add a manual migration file under `prisma/migrations/` for the new fields.
- `recordPayment`'s existing status recompute must be updated to filter `CONFIRMED` — otherwise pending submissions will corrupt balances.
- `parentUserIdsForStudents` matches parents by `Student.parentEmail`/`parentPhone` against `User.email`/`User.phone` — confirm these are populated for invoice notifications to reach parents.