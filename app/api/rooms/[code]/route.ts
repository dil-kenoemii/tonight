import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateRoomCode } from '@/lib/validation';
import type { RoomState } from '@/types';

export async function GET(
  request: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { code } = params;

    // Validate room code format
    if (!validateRoomCode(code)) {
      return NextResponse.json(
        { error: 'Invalid room code format', code: 'INVALID_ROOM_CODE' },
        { status: 400 }
      );
    }

    // Query room
    const roomResult = await pool.query(
      'SELECT * FROM rooms WHERE code = $1',
      [code]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Room not found', code: 'ROOM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const room = roomResult.rows[0];

    // Query participants
    const participantsResult = await pool.query(
      'SELECT * FROM participants WHERE room_id = $1 ORDER BY created_at ASC',
      [room.id]
    );

    // Query options
    const optionsResult = await pool.query(
      'SELECT * FROM options WHERE room_id = $1 ORDER BY created_at ASC',
      [room.id]
    );

    // Construct room state
    const roomState: RoomState = {
      room,
      participants: participantsResult.rows,
      options: optionsResult.rows,
    };

    return NextResponse.json(roomState);
  } catch (error) {
    console.error('Error fetching room state:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
