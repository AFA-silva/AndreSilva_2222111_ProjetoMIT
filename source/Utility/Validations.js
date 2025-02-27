export const isEmailValid = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const isPhoneValid = (phone) => {
  // Simples validação de telefone: deve ter exatamente 9 dígitos
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

export const validateRegisterForm = ({ phone, name, email, password, confirmPassword, region }) => {
  if (
    !isFieldNotEmpty(phone) ||
    !isFieldNotEmpty(name) ||
    !isFieldNotEmpty(email) ||
    !isFieldNotEmpty(password) ||
    !isFieldNotEmpty(confirmPassword) ||
    !isFieldNotEmpty(region)
  ) {
    return 'Por favor, preencha todos os campos.';
  }

  if (!isPhoneValid(phone)) {
    return 'Por favor, insira um número de telefone válido (9 dígitos).';
  }

  if (!isNameValid(name)) {
    return 'O nome deve ter no máximo 20 caracteres.';
  }

  if (!isEmailValid(email)) {
    return 'Por favor, insira um email válido.';
  }

  if (!isPasswordValid(password, confirmPassword)) {
    return 'A senha deve ter entre 6 e 16 caracteres e coincidir com a confirmação de senha.';
  }

  return null;
};
