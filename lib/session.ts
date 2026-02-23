import { randomBytes } from 'crypto';
import pool from './db';

/**
 * Creates a new session for a participant
 * @param participantId - The participant's database ID
 * @returns The session token (64-character hex string)
 */
export async function createSession(participantId: number): Promise<string> {
  const token = randomBytes(32).toString('hex'); // 64 characters
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now

  await pool.query(
    'INSERT INTO sessions (token, participant_id, expires_at) VALUES ($1, $2, $3)',
    [token, participantId, expiresAt]
  );

  return token;
}

/**
 * Verifies a session token and returns the participant ID
 * @param token - The session token to verify
 * @returns The participant ID if valid, null if invalid or expired
 */
export async function verifySession(token: string): Promise<number | null> {
  const result = await pool.query(
    `SELECT participant_id
     FROM sessions
     WHERE token = $1 AND expires_at > NOW()`,
    [token]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return result.rows[0].participant_id;
}

/**
 * Deletes a session by token
 * @param token - The session token to delete
 */
export async function deleteSession(token: string): Promise<void> {
  await pool.query('DELETE FROM sessions WHERE token = $1', [token]);
}
