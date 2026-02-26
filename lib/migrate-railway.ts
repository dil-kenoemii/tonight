import { Pool } from 'pg';

// DO NOT load .env.local - use Railway environment variables only
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  console.log('Connecting to database...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Creating tables...');

    // Create rooms table (without fk_winner constraint - will be added after options table is created)
    await client.query(`
      CREATE TABLE IF NOT EXISTS rooms (
        id SERIAL PRIMARY KEY,
        code VARCHAR(6) UNIQUE NOT NULL,
        category VARCHAR(10) NOT NULL CHECK (category IN ('eat', 'watch', 'do')),
        status VARCHAR(20) NOT NULL DEFAULT 'gathering' CHECK (status IN ('gathering', 'decided')),
        winner_option_id INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create participants table
    await client.query(`
      CREATE TABLE IF NOT EXISTS participants (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        name VARCHAR(50) NOT NULL,
        is_host BOOLEAN NOT NULL DEFAULT false,
        has_vetoed BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(room_id, name)
      )
    `);

    // Create sessions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        token VARCHAR(64) PRIMARY KEY,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Create options table
    await client.query(`
      CREATE TABLE IF NOT EXISTS options (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        text VARCHAR(100) NOT NULL,
        is_vetoed BOOLEAN NOT NULL DEFAULT false,
        vetoed_by_id INTEGER REFERENCES participants(id) ON DELETE SET NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Now add the foreign key constraint for winner_option_id
    // (We had to create options table first)
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'fk_winner'
        ) THEN
          ALTER TABLE rooms
          ADD CONSTRAINT fk_winner
          FOREIGN KEY (winner_option_id)
          REFERENCES options(id)
          ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    console.log('Creating indexes...');

    // Create indexes for performance
    await client.query('CREATE INDEX IF NOT EXISTS idx_rooms_code ON rooms(code)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_rooms_created_at ON rooms(created_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_participants_room_id ON participants(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_options_room_id ON options(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_options_participant_id ON options(participant_id)');

    await client.query('COMMIT');

    console.log('Migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate().catch((error) => {
  console.error('Fatal error during migration:', error);
  process.exit(1);
});
