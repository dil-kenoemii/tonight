import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateCategory, validateName } from '@/lib/validation';
import { generateRoomCode } from '@/lib/generateRoomCode';
import { createSession } from '@/lib/session';
import { isRateLimited, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(request: NextRequest) {
  try {
    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    if (isRateLimited(ip, RATE_LIMITS.CREATE_ROOM)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { category, hostName } = body;

    // Validate category
    if (!category || !validateCategory(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be eat, watch, or do.', code: 'INVALID_CATEGORY' },
        { status: 400 }
      );
    }

    // Validate host name
    const nameValidation = validateName(hostName);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 50 characters.', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    // Generate room code with retry logic (up to 3 attempts)
    let roomCode: string | null = null;
    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts && !roomCode) {
      attempts++;
      const candidate = generateRoomCode();

      // Check if code already exists
      const existing = await pool.query(
        'SELECT id FROM rooms WHERE code = $1',
        [candidate]
      );

      if (existing.rows.length === 0) {
        roomCode = candidate;
      }
    }

    // If all attempts failed, return error
    if (!roomCode) {
      return NextResponse.json(
        { error: 'Failed to generate unique room code. Please try again.', code: 'CODE_GENERATION_FAILED' },
        { status: 409 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Insert room
      const roomResult = await client.query(
        'INSERT INTO rooms (code, category, status) VALUES ($1, $2, $3) RETURNING id',
        [roomCode, category, 'gathering']
      );

      const roomId = roomResult.rows[0].id;

      // Insert host participant
      const participantResult = await client.query(
        'INSERT INTO participants (room_id, name, is_host) VALUES ($1, $2, $3) RETURNING id',
        [roomId, nameValidation.trimmed, true]
      );

      const participantId = participantResult.rows[0].id;

      // Commit transaction
      await client.query('COMMIT');

      // Create session
      const sessionToken = await createSession(participantId);

      // Set HTTP-only cookie
      const response = NextResponse.json({ code: roomCode });

      const isProduction = process.env.NODE_ENV === 'production';
      const cookieOptions = [
        `spin_session=${sessionToken}`,
        'HttpOnly',
        'Path=/',
        'Max-Age=86400', // 24 hours
        'SameSite=Lax',
      ];

      if (isProduction) {
        cookieOptions.push('Secure');
      }

      response.headers.set('Set-Cookie', cookieOptions.join('; '));

      return response;
    } catch (error) {
      // Rollback transaction on error
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error creating room:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
