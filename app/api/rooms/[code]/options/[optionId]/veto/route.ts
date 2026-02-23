import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateRoomCode } from '@/lib/validation';
import { verifySession } from '@/lib/session';

export async function POST(
  request: NextRequest,
  { params }: { params: { code: string; optionId: string } }
) {
  try {
    const { code, optionId } = params;

    // Validate room code format
    if (!validateRoomCode(code)) {
      return NextResponse.json(
        { error: 'Invalid room code format', code: 'INVALID_ROOM_CODE' },
        { status: 400 }
      );
    }

    // Validate optionId is a number
    const optionIdNum = parseInt(optionId);
    if (isNaN(optionIdNum)) {
      return NextResponse.json(
        { error: 'Invalid option ID', code: 'INVALID_OPTION_ID' },
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
          { error: 'Room is no longer accepting vetos', code: 'ROOM_LOCKED' },
          { status: 400 }
        );
      }

      // Get option and verify it exists in this room
      const optionResult = await client.query(
        `SELECT id, room_id, participant_id, is_vetoed
         FROM options
         WHERE id = $1 AND room_id = $2`,
        [optionIdNum, room.id]
      );

      if (optionResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Option not found', code: 'OPTION_NOT_FOUND' },
          { status: 404 }
        );
      }

      const option = optionResult.rows[0];

      // Check if participant is trying to veto their own option
      if (option.participant_id === participantId) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You cannot veto your own option', code: 'CANNOT_VETO_OWN' },
          { status: 400 }
        );
      }

      // Check if option is already vetoed
      if (option.is_vetoed) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'This option has already been vetoed', code: 'ALREADY_VETOED' },
          { status: 400 }
        );
      }

      // Check if participant has already vetoed
      const participantResult = await client.query(
        'SELECT has_vetoed FROM participants WHERE id = $1',
        [participantId]
      );

      const participant = participantResult.rows[0];

      if (participant.has_vetoed) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'You have already used your veto', code: 'ALREADY_USED_VETO' },
          { status: 400 }
        );
      }

      // Perform veto: update option and participant atomically
      await client.query(
        `UPDATE options
         SET is_vetoed = true, vetoed_by_id = $1
         WHERE id = $2`,
        [participantId, optionIdNum]
      );

      await client.query(
        `UPDATE participants
         SET has_vetoed = true
         WHERE id = $1`,
        [participantId]
      );

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Option vetoed successfully',
      });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error vetoing option:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
