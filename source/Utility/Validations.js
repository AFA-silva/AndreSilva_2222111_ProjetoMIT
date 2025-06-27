export const isEmailValid = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isPhoneValid = (phone) => {
  // Simple phone validation: must have exactly 9 digits
  const phoneRegex = /^[0-9]{9}$/;
  return phoneRegex.test(phone);
};

export const isPasswordValid = (password, confirmPassword) => {
  const passwordMinLength = 6;
  const passwordMaxLength = 16;
  return password.length >= passwordMinLength && password.length <= passwordMaxLength && password === confirmPassword;
};

export const isFieldNotEmpty = (field) => {
  return field && field.trim().length > 0;
};

export const isNameValid = (name) => {
  const nameMaxLength = 20;
  return name.length <= nameMaxLength;
};