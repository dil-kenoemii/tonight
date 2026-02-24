import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    // Query recent decided rooms with winner information
    const result = await pool.query(
      `SELECT
        r.id,
        r.code,
        r.category,
        r.created_at,
        o.text as winner_text,
        p.name as winner_participant,
        COUNT(DISTINCT part.id)::int as participant_count
      FROM rooms r
      JOIN options o ON r.winner_option_id = o.id
      JOIN participants p ON o.participant_id = p.id
      JOIN participants part ON part.room_id = r.id
      WHERE r.status = $1
      GROUP BY r.id, o.id, o.text, p.id, p.name
      ORDER BY r.created_at DESC
      LIMIT 10`,
      ['decided']
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching recent decisions:', error);
    return NextResponse.json(
      { error: 'Internal server error', code: 'SERVER_ERROR' },
      { status: 500 }
    );
  }
}
