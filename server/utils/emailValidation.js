import dns from 'dns/promises';
import { config } from '../config/config.js';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export const normalizeEmail = (email) => email?.trim().toLowerCase();

export const validateEmailAddress = async (email) => {
  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
    return {
      isValid: false,
      normalizedEmail,
      message: 'Please provide a valid email address'
    };
  }

  if (!config.emailMxCheckEnabled) {
    return {
      isValid: true,
      normalizedEmail
    };
  }

  const domain = normalizedEmail.split('@')[1];

  try {
    const records = await dns.resolveMx(domain);

    if (!records.length) {
      return {
        isValid: false,
        normalizedEmail,
        message: 'Email domain cannot receive mail'
      };
    }

    return {
      isValid: true,
      normalizedEmail
    };
  } catch (error) {
    return {
      isValid: false,
      normalizedEmail,
      message: 'Email domain could not be verified'
    };
  }
};
