import { Pool } from 'pg';

let pool: Pool | null = null;

function getPool(): Pool {
  if (!pool) {
    // Only check DATABASE_URL when actually creating the pool (runtime)
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is not set');
    }

    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    });

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return pool;
}

const db = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: function (...args: any[]) {
    // @ts-expect-error - TypeScript strict mode doesn't like spreading any[]
    return getPool().query(...args);
  },
  connect: function () {
    return getPool().connect();
  },
  end: function () {
    return getPool().end();
  },
};

export default db;
