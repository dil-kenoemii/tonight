const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:gkkVEmlQrzhSQEyQGbzydwbcofeSZzFd@nozomi.proxy.rlwy.net:55839/railway',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 5000,
});

async function testConnection() {
  try {
    console.log('Attempting to connect to Railway...');
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
