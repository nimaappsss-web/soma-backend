import { validateEmail, validatePhoneNumber } from "./validation";
import { localPhoneNumber } from "./whatsapp";
import { prisma } from "./prisma";

export interface ParentContactInput {
  parentEmail?: string | null;
  parentPhone?: string | null;
}

export interface ParentContactResult {
  ok: boolean;
  error?: string;
  normalizedPhone?: string | null;
}

/**
 * Validates a parent's contact info on a student record.
 * Rules:
 *  - A parent must be reachable: require a phone when no email is provided.
 *  - Email, when provided, must be a valid email format.
 *  - Phone, when provided, must be a valid Nigerian phone number.
 * Returns the normalized phone (or null) so callers store a consistent value.
 */
export const validateParentContact = ({
  parentEmail,
  parentPhone,
}: ParentContactInput): ParentContactResult => {
  const email = parentEmail?.trim();
  const rawPhone = parentPhone?.trim();

  if (email) {
    if (!validateEmail(email)) {
      return { ok: false, error: `Invalid email address: "${email}"` };
    }
  }

  let normalizedPhone: string | null = null;
  if (rawPhone) {
    if (!validatePhoneNumber(rawPhone)) {
      return {
        ok: false,
        error: `Invalid phone number: "${rawPhone}". Use a valid Nigerian number (e.g. 08123456789 or +2348123456789).`,
      };
    }
    normalizedPhone = localPhoneNumber(rawPhone);
  }

  // Every student must have a way to reach their parent.
  if (!email && !normalizedPhone) {
    return {
      ok: false,
      error: "A parent phone or email is required so the parent can be reached.",
    };
  }

  return { ok: true, normalizedPhone };
};

/**
 * Builds a Prisma where clause matching a parent contact (email OR phone).
 * Used to detect students that already use the same contact (duplicate detection).
 */
export const parentContactWhere = ({
  parentEmail,
  parentPhone,
}: ParentContactInput) => {
  const parts = [];
  if (parentEmail?.trim()) parts.push({ parentEmail: parentEmail.trim() });
  if (parentPhone) parts.push({ parentPhone: localPhoneNumber(parentPhone) });
  return parts.length > 0 ? { OR: parts } : undefined;
};

/**
 * Finds a school member (principal, teacher, or other staff account) whose own
 * contact (email or phone) matches the given parent contact. This blocks using
 * a staff/principal's personal contact as a parent contact.
 *
 * PARENT-role accounts are deliberately excluded: an existing parent account is
 * the intended target of auto-linking when a new child shares the same contact,
 * so it must NOT be treated as a conflict.
 */
export const findUserContactConflict = async (
  schoolId: string,
  { parentEmail, parentPhone }: ParentContactInput,
) => {
  const parts = [];
  if (parentEmail?.trim()) parts.push({ email: parentEmail.trim() });
  if (parentPhone) parts.push({ phone: localPhoneNumber(parentPhone) });
  if (parts.length === 0) return null;

  return prisma.user.findFirst({
    where: { schoolId, role: { not: "PARENT" }, OR: parts },
    select: { id: true, name: true, email: true, phone: true, role: true },
  });
};
