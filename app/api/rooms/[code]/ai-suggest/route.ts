import { NextRequest, NextResponse } from 'next/server';
import { validateRoomCode } from '@/lib/validation';
import { verifySession } from '@/lib/session';
import { generateSuggestions } from '@/lib/ai';
import pool from '@/lib/db';

export async function POST(
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
    const { responses } = body;

    if (!responses || typeof responses !== 'object') {
      return NextResponse.json(
        { error: 'Quiz responses are required', code: 'INVALID_RESPONSES' },
        { status: 400 }
      );
    }

    // Verify room exists, participant belongs to it, and room is in gathering status
    const roomResult = await pool.query(
      `SELECT r.id, r.category, r.status
       FROM rooms r
       JOIN participants p ON p.room_id = r.id
       WHERE r.code = $1 AND p.id = $2`,
      [code, participantId]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Room not found or access denied', code: 'ROOM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const room = roomResult.rows[0];

    if (room.status !== 'gathering') {
      return NextResponse.json(
        { error: 'Room is no longer accepting options', code: 'ROOM_LOCKED' },
        { status: 400 }
      );
    }

    // Generate suggestions using AI
    const suggestions = await generateSuggestions(room.category, responses);

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Error generating AI suggestions:', error);
    return NextResponse.json(
      { error: 'Failed to generate suggestions. Please try again.', code: 'AI_ERROR' },
      { status: 500 }
    );
  }
}
