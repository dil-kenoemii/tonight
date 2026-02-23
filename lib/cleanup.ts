import pool from './db';

/**
 * Cleanup job for removing old rooms and expired sessions
 * This script should be run periodically (e.g., via cron job)
 */
async function cleanup() {
  try {
    console.log('Starting cleanup job...');

    // Delete rooms older than 24 hours
    const roomsResult = await pool.query(
      `DELETE FROM rooms
       WHERE created_at < NOW() - INTERVAL '24 hours'`
    );

    console.log(`Deleted ${roomsResult.rowCount} old room(s)`);

    // Delete expired sessions
    const sessionsResult = await pool.query(
      `DELETE FROM sessions
       WHERE expires_at < NOW()`
    );

    console.log(`Deleted ${sessionsResult.rowCount} expired session(s)`);

    console.log('Cleanup job completed successfully');
  } catch (error) {
    console.error('Cleanup job failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

cleanup().catch((error) => {
  console.error('Fatal error during cleanup:', error);
  process.exit(1);
});
