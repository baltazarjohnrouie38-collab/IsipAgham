export interface UsernameValidationResult {
  valid: boolean;
  clean: string;
  error?: string;
}

export interface EmailValidationResult {
  valid: boolean;
  normalized: string;
  error?: string;
}

export interface PasswordChecks {
  minLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  notCommonOrPersonal: boolean;
}

export interface PasswordStrengthResult {
  valid: boolean;
  score: number;
  checks: PasswordChecks;
  errors: string[];
}

const COMMON_WEAK_PASSWORDS = new Set([
  'password',
  'password1',
  'password123',
  'password123!',
  'p@ssword1',
  '12345678',
  '123456789',
  '1234567890',
  'qwerty123',
  'qwerty123!',
  'admin123',
  'admin123!',
  'welcome1',
  'welcome123',
  'letmein1',
  'iloveyou1',
  'isipagham',
  'isipagham1',
  'isipagham123',
  'physics1',
  'physics123',
  'abc12345',
  'changeme1',
]);

export function validateUsername(raw: string): UsernameValidationResult {
  const clean = raw.trim();

  if (clean.length < 3 || clean.length > 24) {
    return {
      valid: false,
      clean,
      error: 'Username must be between 3 and 24 characters.',
    };
  }

  if (!/^[a-zA-Z0-9._-]+$/.test(clean)) {
    return {
      valid: false,
      clean,
      error: 'Username can only use letters, numbers, underscores (_), dots (.), or hyphens (-).',
    };
  }

  if (/^[._-]|[._-]$/.test(clean) || /[._-]{2,}/.test(clean)) {
    return {
      valid: false,
      clean,
      error: 'Username cannot start, end, or repeat dots, underscores, or hyphens.',
    };
  }

  if (!/[a-zA-Z]/.test(clean)) {
    return {
      valid: false,
      clean,
      error: 'Username must include at least one letter.',
    };
  }

  return { valid: true, clean };
}

export function validateEmail(raw: string): EmailValidationResult {
  const normalized = raw.trim().toLowerCase();

  if (!normalized || normalized.length > 254) {
    return {
      valid: false,
      normalized,
      error: 'Please enter a valid email address.',
    };
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalized)) {
    return {
      valid: false,
      normalized,
      error: 'Please enter a valid email address (for example, student@school.edu.ph).',
    };
  }

  if (normalized.endsWith('@users.isipagham.app')) {
    return {
      valid: false,
      normalized,
      error: 'Please use your real personal or school email address.',
    };
  }

  return { valid: true, normalized };
}

export function evaluatePasswordStrength(
  password: string,
  context?: { username?: string; email?: string }
): PasswordStrengthResult {
  const minLength = password.length >= 8 && password.length <= 128;
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasSpecial = /[^A-Za-z0-9\s]/.test(password);

  const lowerPassword = password.toLowerCase();
  const cleanUser = (context?.username || '').trim().toLowerCase();
  const emailLocal = (context?.email || '').trim().toLowerCase().split('@')[0] || '';

  const matchesCommon = COMMON_WEAK_PASSWORDS.has(lowerPassword);
  const containsUsername = cleanUser.length >= 3 && lowerPassword.includes(cleanUser);
  const containsEmailLocal = emailLocal.length >= 3 && lowerPassword.includes(emailLocal);
  const notCommonOrPersonal =
    password.length > 0 && !matchesCommon && !containsUsername && !containsEmailLocal;

  const checks: PasswordChecks = {
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    notCommonOrPersonal,
  };

  const errors: string[] = [];
  if (!minLength) {
    errors.push('Password must be 8 to 128 characters long.');
  }
  if (!hasUpper) {
    errors.push('Include at least one uppercase letter (A-Z).');
  }
  if (!hasLower) {
    errors.push('Include at least one lowercase letter (a-z).');
  }
  if (!hasNumber) {
    errors.push('Include at least one number (0-9).');
  }
  if (!hasSpecial) {
    errors.push('Include at least one special character (e.g., ! @ # $ % & *).');
  }
  if (password.length > 0 && !notCommonOrPersonal) {
    if (matchesCommon) {
      errors.push('Choose a stronger password rather than a commonly guessed phrase.');
    } else {
      errors.push('Password must not contain your username or email name.');
    }
  }

  const score = [
    minLength,
    hasUpper,
    hasLower,
    hasNumber,
    hasSpecial,
    notCommonOrPersonal,
  ].filter(Boolean).length;

  return {
    valid: errors.length === 0,
    score,
    checks,
    errors,
  };
}
