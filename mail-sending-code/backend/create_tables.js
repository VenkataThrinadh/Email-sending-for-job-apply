const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function createTables() {
  console.log('Connecting to MySQL...');
  let connection;
  const hosts = ['::1', 'localhost', '127.0.0.1'];

  for (const host of hosts) {
    try {
      connection = await mysql.createConnection({
        host,
        port: 3306,
        user: 'root',
        password: '',
        database: 'bulkmail_sending',
        multipleStatements: true,
        connectTimeout: 3000
      });
      console.log(`Connected to MySQL on ${host}!`);
      break;
    } catch (err) {
      // try next host
    }
  }

  if (!connection) {
    console.error('Failed to connect to MySQL on any host.');
    process.exit(1);
  }

  try {
    const sqlPath = path.join(__dirname, '../database/schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Executing schema.sql...');
    await connection.query(sql);

    console.log('✅ Tables verified/created successfully.');

    const [tables] = await connection.query('SHOW TABLES;');
    console.log('\n--- Current tables in bulkmail_sending ---');
    tables.forEach(row => {
      console.log(' - ' + Object.values(row)[0]);
    });
    console.log('-------------------------------------------\n');

  } catch (err) {
    console.error('Error executing SQL:', err.message);
  } finally {
    if (connection) await connection.end();
  }
}

createTables();
