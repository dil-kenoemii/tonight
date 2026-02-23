import { cookies } from 'next/headers';
import { verifySession } from '@/lib/session';
import pool from '@/lib/db';
import JoinForm from '@/components/JoinForm';
import RoomView from '@/components/RoomView';

interface RoomPageProps {
  params: {
    code: string;
  };
}

export default async function RoomPage({ params }: RoomPageProps) {
  const { code } = params;

  // Check for session cookie
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('spin_session');

  let participantId: number | null = null;
  let belongsToRoom = false;

  if (sessionCookie) {
    // Verify session
    const verifiedParticipantId = await verifySession(sessionCookie.value);

    if (verifiedParticipantId) {
      participantId = verifiedParticipantId;

      // Check if participant belongs to this room
      const result = await pool.query(
        `SELECT p.id, r.code
         FROM participants p
         JOIN rooms r ON p.room_id = r.id
         WHERE p.id = $1 AND r.code = $2`,
        [participantId, code]
      );

      if (result.rows.length > 0) {
        belongsToRoom = true;
      }
    }
  }

  // Decide which view to show
  if (belongsToRoom && participantId) {
    // Show room view for authenticated participant
    return <RoomView roomCode={code} participantId={participantId} />;
  } else {
    // Show join form for new participants
    return <JoinForm roomCode={code} />;
  }
}
