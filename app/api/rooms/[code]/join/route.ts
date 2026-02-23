import { NextRequest, NextResponse } from 'next/server';
import pool from '@/lib/db';
import { validateRoomCode, validateName } from '@/lib/validation';
import { createSession } from '@/lib/session';
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
    if (isRateLimited(ip, RATE_LIMITS.JOIN_ROOM)) {
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

    // Parse request body
    const body = await request.json();
    const { name } = body;

    // Validate name
    const nameValidation = validateName(name);
    if (!nameValidation.isValid) {
      return NextResponse.json(
        { error: 'Name must be between 1 and 50 characters.', code: 'INVALID_NAME' },
        { status: 400 }
      );
    }

    // Query room
    const roomResult = await pool.query(
      'SELECT id FROM rooms WHERE code = $1',
      [code]
    );

    if (roomResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'Room not found', code: 'ROOM_NOT_FOUND' },
        { status: 404 }
      );
    }

    const roomId = roomResult.rows[0].id;

    // Check name uniqueness (case-sensitive)
    const duplicateCheck = await pool.query(
      'SELECT 1 FROM participants WHERE room_id = $1 AND name = $2',
      [roomId, nameValidation.trimmed]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { error: 'This name is already taken', code: 'DUPLICATE_NAME' },
        { status: 400 }
      );
    }

    // Insert participant
    const participantResult = await pool.query(
      'INSERT INTO participants (room_id, name, is_host) VALUES ($1, $2, $3) RETURNING id',
      [roomId, nameValidation.trimmed, false]
    );

    const participantId = participantResult.rows[0].id;

    // Create session
    const sessionToken = await createSession(participantId);

    // Set HTTP-only cookie
    const response = NextResponse.json({ success: true });

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
    console.error('Error joining room:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
