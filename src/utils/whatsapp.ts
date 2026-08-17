export const formatWhatsAppMessage = (
  teacherName: string,
  schoolName: string,
  inviteCode: string,
  inviteUrl: string,
): string => {
  return `Hi ${teacherName}! 👋

You've been invited to join *${schoolName}* on Nima 📚

Your invite code: *${inviteCode}*

Click here to join:
${inviteUrl}

- Nima School Management`;
};

// Normalize a phone number to E.164 format (country code first) for WhatsApp.
// Handles all common Nigerian inputs:
//   "08133946674"      -> "2348133946674"
//   "8133946674"       -> "2348133946674"
//   "+2348133946674"   -> "2348133946674"
//   "2348133946674"    -> "2348133946674"
export const cleanPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/[\s\-()+.]+/g, "");

  if (/^0\d{10}$/.test(digits)) {
    return `234${digits.slice(1)}`;
  }

  if (/^[789]\d{9}$/.test(digits)) {
    return `234${digits}`;
  }

  if (/^234[789]\d{9}$/.test(digits)) {
    return digits;
  }

  return digits;
};

// Normalize a phone number to the local Nigerian format for storage/display.
//   "08133946674"      -> "08133946674"
//   "8133946674"       -> "08133946674"
//   "+2348133946674"   -> "08133946674"
//   "2348133946674"    -> "08133946674"
export const localPhoneNumber = (phone: string): string => {
  const digits = phone.replace(/[\s\-()+.]+/g, "");

  if (/^0\d{10}$/.test(digits)) {
    return digits;
  }

  if (/^[789]\d{9}$/.test(digits)) {
    return `0${digits}`;
  }

  if (/^234[789]\d{9}$/.test(digits)) {
    return `0${digits.slice(3)}`;
  }

  return phone;
};

export const generateWhatsAppLink = (
  phone: string,
  message: string,
): string => {
  return `https://wa.me/${cleanPhoneNumber(phone)}?text=${encodeURIComponent(message)}`;
};
