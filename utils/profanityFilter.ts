import { Profanity } from '@2toad/profanity';

const profanity = new Profanity({
  wholeWord: false,
  grawlix: '***',
});

/**
 * Check if a text contains profanity
 * @param text - The text to check
 * @returns true if profanity is detected, false otherwise
 */
export const containsProfanity = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return profanity.exists(text);
};

/**
 * Validate multiple profile fields for profanity
 * @param username - The username to check
 * @param firstName - Optional first name to check
 * @param lastName - Optional last name to check
 * @returns Object with validation results and error messages
 */
export const validateProfileFields = (
  username: string,
  firstName?: string,
  lastName?: string
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];

  // Check username
  if (containsProfanity(username)) {
    errors.push('Username contains inappropriate language');
  }

  // Check first name if provided
  if (firstName?.trim() && containsProfanity(firstName)) {
    errors.push('First name contains inappropriate language');
  }

  // Check last name if provided
  if (lastName?.trim() && containsProfanity(lastName)) {
    errors.push('Last name contains inappropriate language');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

export const censor = (text: string): string =>
  profanity.censor(text)