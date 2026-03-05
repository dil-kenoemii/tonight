import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables from .env.local
config({ path: '.env.local' });

// Create pool directly here to ensure env vars are loaded
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

async function migrateAi() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Adding AI columns to options table...');

    // Add source column to track whether option was user-submitted or AI-generated
    await client.query(`
      ALTER TABLE options ADD COLUMN IF NOT EXISTS source VARCHAR(10) DEFAULT 'user'
    `);

    // Add ai_metadata column to store reasoning and confidence for AI options
    await client.query(`
      ALTER TABLE options ADD COLUMN IF NOT EXISTS ai_metadata JSONB DEFAULT NULL
    `);

    console.log('Creating quiz_responses table...');

    // Store quiz answers so we can regenerate suggestions without retaking quiz
    await client.query(`
      CREATE TABLE IF NOT EXISTS quiz_responses (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        category VARCHAR(10) NOT NULL CHECK (category IN ('eat', 'watch', 'do')),
        responses JSONB NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(room_id, participant_id)
      )
    `);

    console.log('Creating ai_suggestions table...');

    // Track AI API usage for monitoring and cost tracking
    await client.query(`
      CREATE TABLE IF NOT EXISTS ai_suggestions (
        id SERIAL PRIMARY KEY,
        room_id INTEGER NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
        participant_id INTEGER NOT NULL REFERENCES participants(id) ON DELETE CASCADE,
        suggestions JSONB NOT NULL,
        prompt_tokens INTEGER,
        completion_tokens INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    console.log('Creating indexes...');

    await client.query('CREATE INDEX IF NOT EXISTS idx_quiz_responses_room_id ON quiz_responses(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_quiz_responses_participant_id ON quiz_responses(participant_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_suggestions_room_id ON ai_suggestions(room_id)');
    await client.query('CREATE INDEX IF NOT EXISTS idx_ai_suggestions_participant_id ON ai_suggestions(participant_id)');

    await client.query('COMMIT');

    console.log('AI migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('AI migration failed:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

migrateAi().catch((error) => {
  console.error('Fatal error during AI migration:', error);
  process.exit(1);
});
