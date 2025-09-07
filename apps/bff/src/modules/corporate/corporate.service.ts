import { Injectable } from '@nestjs/common';
import { Pool } from 'pg';

// Shared PG pool; reuse DATABASE_URL from env.
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

@Injectable()
export class CorporateService {
  // Aggregate dashboard metrics for corporate admins
  async getDashboardMetrics() {
    const orgRes = await pool.query(`SELECT COUNT(*) AS count FROM organizations`);
    const userRes = await pool.query(`SELECT COUNT(*) AS count FROM users`);
    const subRes = await pool.query(`SELECT COUNT(*) AS count FROM subscriptions WHERE status = 'active'`);
    const revenueRes = await pool.query(
      `SELECT COALESCE(SUM(total_monthly_amount), 0) AS revenue FROM subscriptions WHERE status = 'active'`,
    );
    return {
      organizations: parseInt(orgRes.rows[0].count, 10) || 0,
      users: parseInt(userRes.rows[0].count, 10) || 0,
      subscriptions: parseInt(subRes.rows[0].count, 10) || 0,
      revenue: revenueRes.rows[0].revenue || 0,
      status: 'operational',
    };
  }

  // List organizations with user counts and subscription info
  async listOrganizations() {
    const result = await pool.query(`
      SELECT 
        o.id, o.name, o.status, o.industry, o.max_users, o.contact_name, o.contact_email,
        COALESCE(u.user_count, 0) AS user_count,
        s.id AS subscription_id,
        s.seats_limit,
        s.subscribed_users,
        s.total_monthly_amount,
        s.status AS subscription_status,
        s.expiration_date,
        s.subscription_period,
        s.price_per_user_per_month
      FROM organizations o
      LEFT JOIN (
        SELECT organization_id, COUNT(*) AS user_count
        FROM users
        GROUP BY organization_id
      ) u ON o.id = u.organization_id
      LEFT JOIN (
        SELECT DISTINCT ON (organization_id)
          id, organization_id, seats_limit, subscribed_users, total_monthly_amount,
          price_per_user_per_month, subscription_period, expiration_date, status, created_at
        FROM subscriptions
        WHERE status = 'active'
        ORDER BY organization_id, created_at DESC
      ) s ON o.id = s.organization_id
      ORDER BY o.created_at DESC
    `);
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      status: row.status || 'active',
      industry: row.industry,
      maxUsers: row.max_users,
      contactName: row.contact_name,
      contactEmail: row.contact_email,
      userCount: parseInt(row.user_count, 10) || 0,
      subscription: row.subscription_id
        ? {
            id: row.subscription_id,
            seatsLimit: row.seats_limit,
            subscribedUsers: row.subscribed_users,
            totalMonthlyAmount: row.total_monthly_amount,
            status: row.subscription_status,
            expirationDate: row.expiration_date,
            subscriptionPeriod: row.subscription_period,
            pricePerUserPerMonth: row.price_per_user_per_month,
          }
        : null,
    }));
  }
}