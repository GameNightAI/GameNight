// Only blocks exact words, not substrings

import { Filter } from 'bad-words';

// Initialize the bad-words filter
const filter = new Filter();

// Example: Add custom words specific to our app
// addCustomWords('cheater');

// Example: Remove words that might be too strict for usernames/real names  
// removeCustomWords('damn');

// Can run filter.isProfane('') to check if a string contains profanity
// Can run filter.clean('') to check if a string is cleaned of profanity

/**
 * Check if a text contains profanity
 * @param text - The text to check
 * @returns true if profanity is detected, false otherwise
 */
export const containsProfanity = (text: string): boolean => {
  if (!text || typeof text !== 'string') {
    return false;
  }

  return filter.isProfane(text.trim());
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
  if (firstName && firstName.trim() && containsProfanity(firstName)) {
    errors.push('First name contains inappropriate language');
  }

  // Check last name if provided
  if (lastName && lastName.trim() && containsProfanity(lastName)) {
    errors.push('Last name contains inappropriate language');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Add custom words to the profanity filter
 * @param words - Words to add to the filter
 */
export const addCustomWords = (...words: string[]): void => {
  if (words.length > 0) {
    filter.addWords(...words);
  }
};

/**
 * Remove words from the profanity filter
 * @param words - Words to remove from the filter
 */
export const removeCustomWords = (...words: string[]): void => {
  if (words.length > 0) {
    filter.removeWords(...words);
  }
};

/**
 * Get the current list of bad words (for debugging purposes)
 * @returns Array of bad words
 */
export const getBadWords = (): string[] => {
  return filter.list;
};

/**
 * Example of how to use the profanity filter utility
 
import { addCustomWords, removeCustomWords, containsProfanity, validateProfileFields } from './profanityFilter';

// ========================================
// EXAMPLE 1: Adding words to the filter
// ========================================

// Add 'word' as a blocked word
addCustomWords('word');

// Test it
console.log('Testing "word":');
console.log('containsProfanity("word"):', containsProfanity('word')); // true
console.log('containsProfanity("word123"):', containsProfanity('word123')); // true
console.log('containsProfanity("gamer"):', containsProfanity('gamer')); // false

// Test with profile validation
const wordValidation = validateProfileFields('word', 'John', 'Doe');
console.log('Profile with word username:', wordValidation);
// Output: { isValid: false, errors: ['Username contains inappropriate language'] }

// ========================================
// EXAMPLE 2: Removing 'damn' from the filter
// ========================================

// Remove 'damn' from the blocked words (allows legitimate names like "Damien")
removeCustomWords('damn');

// Test it
console.log('\nTesting "damn" removal:');
console.log('containsProfanity("damn"):', containsProfanity('damn')); // false (now allowed)
console.log('containsProfanity("damien"):', containsProfanity('damien')); // false (legitimate name)
console.log('containsProfanity("damnation"):', containsProfanity('damnation')); // false (now allowed)

// Test with profile validation
const damienValidation = validateProfileFields('damien', 'Damien', 'Smith');
console.log('Profile with Damien name:', damienValidation);
// Output: { isValid: true, errors: [] } - Now allowed!

// ========================================
// EXAMPLE 3: Multiple words at once
// ========================================

// Add multiple game-related inappropriate terms
addCustomWords('hacker', 'exploiter', 'spammer');

// Remove multiple words that might be too strict
removeCustomWords('ass', 'hell'); // Allow names like "Cassandra" or "Hellen"

// Test multiple words
console.log('\nTesting multiple words:');
console.log('containsProfanity("hacker"):', containsProfanity('hacker')); // true
console.log('containsProfanity("exploiter"):', containsProfanity('exploiter')); // true
console.log('containsProfanity("cassandra"):', containsProfanity('cassandra')); // false (now allowed)
console.log('containsProfanity("hellen"):', containsProfanity('hellen')); // false (now allowed)

// ========================================
// EXAMPLE 4: Real-world usage in your app
// ========================================

// In your registration or profile edit components, you would use:

export const checkUserProfile = (username: string, firstName?: string, lastName?: string) => {
  // This is what your components actually call
  const validation = validateProfileFields(username, firstName, lastName);

  if (!validation.isValid) {
    // Show error messages to user
    console.log('Profile validation failed:', validation.errors.join('. '));
    return false;
  }

  console.log('Profile validation passed!');
  return true;
};

// Example usage:
checkUserProfile('cheater', 'John', 'Doe'); // false - blocked
checkUserProfile('damien', 'Damien', 'Smith'); // true - allowed
checkUserProfile('gamer123', 'John', 'Doe'); // true - allowed

 */