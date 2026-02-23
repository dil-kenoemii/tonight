/**
 * Input validation utilities for SpinDecide
 */

/**
 * Validates a room code format
 * Must be exactly 6 characters, uppercase alphanumeric excluding 0, O, I, 1
 * @param code - The room code to validate
 * @returns true if valid, false otherwise
 */
export function validateRoomCode(code: string): boolean {
  const roomCodeRegex = /^[A-HJ-NP-Z2-9]{6}$/;
  return roomCodeRegex.test(code);
}

/**
 * Validates a participant name
 * Must be 1-50 characters after trimming
 * @param name - The name to validate
 * @returns An object with isValid boolean and trimmed name
 */
export function validateName(name: string): { isValid: boolean; trimmed: string } {
  const trimmed = name.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 50;
  return { isValid, trimmed };
}

/**
 * Validates option text
 * Must be 1-100 characters after trimming
 * @param text - The option text to validate
 * @returns An object with isValid boolean and trimmed text
 */
export function validateOptionText(text: string): { isValid: boolean; trimmed: string } {
  const trimmed = text.trim();
  const isValid = trimmed.length >= 1 && trimmed.length <= 100;
  return { isValid, trimmed };
}

/**
 * Validates a category
 * Must be one of: 'eat', 'watch', 'do'
 * @param category - The category to validate
 * @returns true if valid, false otherwise
 */
export function validateCategory(category: string): category is 'eat' | 'watch' | 'do' {
  return category === 'eat' || category === 'watch' || category === 'do';
}
