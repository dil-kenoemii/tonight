import { randomInt } from 'crypto';

// Character set excludes confusing characters: 0, O, I, 1
const CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

/**
 * Generates a secure random 6-character room code
 * Uses crypto.randomInt for cryptographically secure randomness
 * @returns A 6-character room code
 */
export function generateRoomCode(): string {
  let code = '';

  for (let i = 0; i < 6; i++) {
    const randomIndex = randomInt(0, CHARSET.length);
    code += CHARSET[randomIndex];
  }

  return code;
}
