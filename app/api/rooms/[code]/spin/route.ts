import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateRoomCode } from '@/lib/validation';
import { verifySession } from '@/lib/session';
import { isRateLimited, RATE_LIMITS } from '@/lib/rateLimit';
import crypto from 'crypto';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    // Get IP for rate limiting
    const ip = request.headers.get('x-forwarded-for') || 'unknown';

    // Check rate limit
    if (isRateLimited(ip, RATE_LIMITS.SPIN)) {
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

    // Start transaction
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get room and verify participant is the host
      const roomResult = await client.query(
        `SELECT r.id, r.status, p.is_host
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

      const { id: roomId, status, is_host: isHost } = roomResult.rows[0];

      // Verify user is the host
      if (!isHost) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Only the host can spin the wheel', code: 'NOT_HOST' },
          { status: 403 }
        );
      }

      // Check room status
      if (status !== 'gathering') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Room has already been spun', code: 'ALREADY_SPUN' },
          { status: 400 }
        );
      }

      // Get non-vetoed options
      const optionsResult = await client.query(
        `SELECT id, text, participant_id
         FROM options
         WHERE room_id = $1 AND is_vetoed = false
         ORDER BY created_at ASC`,
        [roomId]
      );

      const options = optionsResult.rows;

      // Validate minimum options
      if (options.length < 2) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Need at least 2 non-vetoed options to spin', code: 'INSUFFICIENT_OPTIONS' },
          { status: 400 }
        );
      }

      // Select random winner using cryptographically secure random
      const randomIndex = crypto.randomInt(0, options.length);
      const winner = options[randomIndex];

      // Update room status and winner
      await client.query(
        `UPDATE rooms
         SET status = 'decided', winner_option_id = $1
         WHERE id = $2`,
        [winner.id, roomId]
      );

      await client.query('COMMIT');

      // Get participant name for winner
      const winnerParticipant = await client.query(
        'SELECT name FROM participants WHERE id = $1',
        [winner.participant_id]
      );

      return NextResponse.json({
        winner: {
          id: winner.id,
          text: winner.text,
          participant_id: winner.participant_id,
          participant_name: winnerParticipant.rows[0]?.name || 'Unknown',
        },
        winnerIndex: randomIndex,
        totalOptions: options.length,
        allOptions: options,
        message: 'Spin complete!',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error spinning wheel:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
