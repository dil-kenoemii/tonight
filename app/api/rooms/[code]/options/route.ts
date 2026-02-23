import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateRoomCode, validateOptionText } from '@/lib/validation';
import { verifySession } from '@/lib/session';
import { isRateLimited, RATE_LIMITS } from '@/lib/rateLimit';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    if (isRateLimited(ip, RATE_LIMITS.SUBMIT_OPTION)) {
      return NextResponse.json(
        { error: 'Too many requests. Please try again later.', code: 'RATE_LIMITED' },
        { status: 429 }
      );
    }

    // Validate room code format
    if (!validateRoomCode(code)) {
      return NextResponse.json(
        { error: 'Invalid room code format', code: 'INVALID_ROOM_CODE' },
        { status: 400 }
      );
    }

    // Verify session
    const cookies = request.cookies;
    const sessionCookie = cookies.get('spin_session');

    if (!sessionCookie) {
      return NextResponse.json(
        { error: 'Not authenticated', code: 'NOT_AUTHENTICATED' },
        { status: 401 }
      );
    }

    const participantId = await verifySession(sessionCookie.value);

    if (!participantId) {
      return NextResponse.json(
        { error: 'Invalid or expired session', code: 'INVALID_SESSION' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const { text } = body;

    // Validate option text
    const textValidation = validateOptionText(text);
    if (!textValidation.isValid) {
      return NextResponse.json(
        { error: 'Option text must be between 1 and 100 characters.', code: 'INVALID_OPTION_TEXT' },
        { status: 400 }
      );
    }

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get room and verify participant belongs to it
      const roomResult = await client.query(
        `SELECT r.id, r.status
         FROM rooms r
         JOIN participants p ON p.room_id = r.id
         WHERE r.code = $1 AND p.id = $2`,
        [code, participantId]
      );

      if (roomResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Room not found or access denied', code: 'ROOM_NOT_FOUND' },
          { status: 404 }
        );
      }

      const room = roomResult.rows[0];

      // Check room status
      if (room.status !== 'gathering') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Room is no longer accepting options', code: 'ROOM_LOCKED' },
          { status: 400 }
        );
      }

      // Count existing options for this participant
      const countResult = await client.query(
        'SELECT COUNT(*) as count FROM options WHERE room_id = $1 AND participant_id = $2',
        [room.id, participantId]
      );

      const optionCount = parseInt(countResult.rows[0].count);

      if (optionCount >= 3) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You have already added 3 options', code: 'OPTION_LIMIT_REACHED' },
          { status: 400 }
        );
      }

      // Insert option
      const optionResult = await client.query(
        `INSERT INTO options (room_id, participant_id, text, is_vetoed, vetoed_by_id)
         VALUES ($1, $2, $3, false, NULL)
         RETURNING id, room_id, participant_id, text, is_vetoed, vetoed_by_id, created_at`,
        [room.id, participantId, textValidation.trimmed]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        option: optionResult.rows[0],
        message: 'Option added successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error adding option:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
