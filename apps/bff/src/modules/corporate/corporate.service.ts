import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

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
}