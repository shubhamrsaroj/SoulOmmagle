import pkg from 'pg';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pkg;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Create the connection pool with explicit credentials
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'soulmagle'
});

async function initializeDatabase() {
  const client = await pool.connect();
  try {
    console.log('Initializing database...');
    
    // Read and execute schema.sql
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    await client.query(schema);
    
    console.log('Database schema initialized successfully');

    // Test the connection
    const { rows: [result] } = await client.query('SELECT NOW()');
    console.log('Database connected successfully at:', result.now);

    return true;
  } catch (error) {
    console.error('Error initializing database:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Initialize the database when this module is imported
initializeDatabase().catch(console.error);

// Export a function to test the connection
export async function testConnection() {
  try {
    const { rows: [result] } = await pool.query('SELECT NOW()');
    return true;
  } catch (error) {
    console.error('Database connection test failed:', error);
    return false;
  }
}

export { pool }; 