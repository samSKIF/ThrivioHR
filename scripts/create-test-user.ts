import * as bcrypt from 'bcryptjs';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

async function createTestUser() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
  
  const db = drizzle(pool);
  
  try {
    // Hash the password
    const hashedPassword = await bcrypt.hash('test123', 10);
    
    // Create test user with proper UUID
    const result = await pool.query(`
      INSERT INTO users (id, organization_id, email, password_hash, first_name, last_name, display_name, created_at, updated_at)
      VALUES (
          gen_random_uuid(),
          '8194e1c5-0d97-4b4d-b246-339d2b91d4cd',
          'test@example.com',
          $1,
          'Test',
          'User',
          'Test User',
          NOW(),
          NOW()
      )
      ON CONFLICT (organization_id, email) DO UPDATE
      SET password_hash = $1, first_name = 'Test', last_name = 'User', display_name = 'Test User'
      RETURNING id, email, first_name, last_name, display_name;
    `, [hashedPassword]);
    
    console.log('Test user created:', result.rows[0]);
  } catch (error) {
    console.error('Error creating test user:', error);
  } finally {
    await pool.end();
  }
}

createTestUser();