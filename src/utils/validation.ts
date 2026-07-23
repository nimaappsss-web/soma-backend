export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validatePhoneNumber = (phone: string): boolean => {
  const phoneRegex = /^\+?(0[789][01]\d{8}|234[789][01]\d{8})$/;
  return phoneRegex.test(phone.replace(/[\s-]/g, ""));
};
