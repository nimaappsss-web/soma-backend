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

export const generateWhatsAppLink = (
  phone: string,
  message: string,
): string => {
  const cleanPhone = phone.replace(/^0/, "234").replace(/\D/g, "");
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
};

export const cleanPhoneNumber = (phone: string): string => {
  return phone.replace(/^0/, "234").replace(/\D/g, "");
};
