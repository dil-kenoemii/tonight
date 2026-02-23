const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:ThCufHNMUmHGURqAHcWAGEurfjRfAwTg@tramway.proxy.rlwy.net:13935/railway',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function testConnection() {
  try {
    console.log('Attempting to connect to Railway (new URL)...');
    await client.connect();
    console.log('✅ Connected successfully!');

    const result = await client.query('SELECT NOW()');
    console.log('✅ Query executed:', result.rows[0]);

    await client.end();
    console.log('✅ Connection closed');
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    process.exit(1);
  }
}

testConnection();
