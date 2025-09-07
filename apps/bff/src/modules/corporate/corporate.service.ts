import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { hashPassword } from '../auth/password.util';

// Shared PG pool; reuse DATABASE_URL from env.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

@Injectable()
export class CorporateService {
  // Aggregate dashboard metrics for corporate admins
  async getDashboardMetrics() {
    const orgRes = await pool.query(`SELECT COUNT(*) AS count FROM organizations WHERE is_active = true`);
    const userRes = await pool.query(`SELECT COUNT(*) AS count FROM users WHERE is_active = true`);
    const subRes = await pool.query(`SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'`);
    const seatsRes = await pool.query(`SELECT COALESCE(SUM(seats_limit), 0) AS total_seats FROM subscriptions WHERE status = 'active'`);
    
    return {
      organizations: parseInt(orgRes.rows[0].count, 10) || 0,
      users: parseInt(userRes.rows[0].count, 10) || 0,
      subscriptions: parseInt(subRes.rows[0].count, 10) || 0,
      totalSeats: parseInt(seatsRes.rows[0].total_seats, 10) || 0,
      status: 'operational',
    };
  }

  // List organizations with user counts and subscription info
  async listOrganizations() {
    const result = await pool.query(`
      SELECT 
        o.id, o.name, o.is_active, o.domain, o.website_url, o.created_at,
        COALESCE(u.user_count, 0) AS user_count,
        s.id AS subscription_id,
        s.seats_limit,
        s.plan_code,
        s.status AS subscription_status,
        s.start_at,
        s.end_at
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id, COUNT(*) AS user_count
        FROM users
        WHERE is_active = true
        GROUP BY organization_id
      ) u ON o.id = u.organization_id
      LEFT JOIN (
        SELECT DISTINCT ON (org_id)
          id, org_id, seats_limit, plan_code, status, start_at, end_at, created_at
        FROM subscriptions
        WHERE status = 'active'
        ORDER BY org_id, created_at DESC
      ) s ON o.id = s.org_id
      WHERE o.is_active = true
      ORDER BY o.created_at DESC
    `);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.is_active ? 'active' : 'inactive',
      domain: row.domain,
      websiteUrl: row.website_url,
      userCount: parseInt(row.user_count, 10) || 0,
      createdAt: row.created_at,
      subscription: row.subscription_id
        ? {
            id: row.subscription_id,
            seatsLimit: row.seats_limit,
            planCode: row.plan_code,
            status: row.subscription_status,
            startAt: row.start_at,
            endAt: row.end_at,
          }
        : null,
    }));
  }

  // Create organization with superuser account
  async createOrganization(orgData: {
    organizationName: string;
    industry: string;
    contactName: string;
    contactEmail: string;
    contactPhone?: string;
    superuserEmail: string;
    streetAddress: string;
    country: string;
    stateProvince: string;
    city: string;
    zipPostalCode: string;
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Generate temporary password for superuser (they'll change on first login)
      const tempPassword = this.generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      // Create organization (store additional info in settings JSON)
      const orgSettings = {
        industry: orgData.industry,
        contactName: orgData.contactName,
        contactEmail: orgData.contactEmail,
        contactPhone: orgData.contactPhone,
        address: {
          street: orgData.streetAddress,
          country: orgData.country,
          state: orgData.stateProvince,
          city: orgData.city,
          zipCode: orgData.zipPostalCode
        }
      };

      const orgResult = await client.query(`
        INSERT INTO organizations (
          name, settings
        ) VALUES ($1, $2)
        RETURNING id, name, created_at
      `, [
        orgData.organizationName,
        JSON.stringify(orgSettings)
      ]);

      const organization = orgResult.rows[0];

      // Extract first and last name from superuser email (basic approach)
      const emailLocalPart = orgData.superuserEmail.split('@')[0];
      const nameParts = emailLocalPart.split('.');
      const firstName = nameParts[0]?.charAt(0).toUpperCase() + (nameParts[0]?.slice(1) || '');
      const lastName = nameParts[1] ? nameParts[1].charAt(0).toUpperCase() + nameParts[1].slice(1) : 'Admin';

      // Create superuser account
      const userResult = await client.query(`
        INSERT INTO users (
          organization_id, email, password_hash, first_name, last_name, display_name
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, email, first_name, last_name
      `, [
        organization.id,
        orgData.superuserEmail,
        passwordHash,
        firstName,
        lastName,
        `${firstName} ${lastName}`
      ]);

      const superuser = userResult.rows[0];

      await client.query('COMMIT');

      // Return organization info and temp password (for initial setup)
      return {
        organization: {
          id: organization.id,
          name: organization.name,
          createdAt: organization.created_at
        },
        superuser: {
          id: superuser.id,
          email: superuser.email,
          firstName: superuser.first_name,
          lastName: superuser.last_name,
          tempPassword: tempPassword // Include temp password for setup
        }
      };

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to create organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Generate a secure temporary password
  private generateTempPassword(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }
}