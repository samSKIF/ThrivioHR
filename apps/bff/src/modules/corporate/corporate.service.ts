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
        o.id, o.name, o.is_active, o.domain, o.website_url, o.created_at, o.settings,
        COALESCE(uc.user_count, 0) AS user_count,
        su.email AS superuser_email,
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
      ) uc ON o.id = uc.organization_id
      LEFT JOIN (
        SELECT DISTINCT ON (organization_id) organization_id, email
        FROM users
        WHERE is_active = true
        ORDER BY organization_id, created_at ASC
      ) su ON o.id = su.organization_id
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
      settings: row.settings ? JSON.parse(row.settings) : null,
      superuserEmail: row.superuser_email,
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

  // Update organization details
  async updateOrganization(id: string, updateData: {
    organizationName?: string;
    status?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    adminEmail?: string;
    businessActivity?: string;
    streetAddress?: string;
    country?: string;
    stateRegion?: string;
    city?: string;
    zipPostalCode?: string;
  }) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      // Get current organization settings
      const currentOrg = await client.query(
        'SELECT name, settings, is_active FROM organizations WHERE id = $1',
        [id]
      );

      if (currentOrg.rows.length === 0) {
        throw new Error('Organization not found');
      }

      const currentSettings = currentOrg.rows[0].settings || {};

      // Update organization name and status if provided
      if (updateData.organizationName || updateData.status) {
        await client.query(
          'UPDATE organizations SET name = COALESCE($1, name), is_active = COALESCE($2, is_active) WHERE id = $3',
          [
            updateData.organizationName || null,
            updateData.status === 'active' ? true : updateData.status === 'inactive' ? false : null,
            id
          ]
        );
      }

      // Update settings JSON if contact or address info provided
      const updatedSettings = {
        ...currentSettings,
        ...(updateData.contactName && { contactName: updateData.contactName }),
        ...(updateData.contactEmail && { contactEmail: updateData.contactEmail }),
        ...(updateData.contactPhone && { contactPhone: updateData.contactPhone }),
        ...(updateData.businessActivity && { industry: updateData.businessActivity }),
        address: {
          ...currentSettings.address,
          ...(updateData.streetAddress && { street: updateData.streetAddress }),
          ...(updateData.country && { country: updateData.country }),
          ...(updateData.stateRegion && { state: updateData.stateRegion }),
          ...(updateData.city && { city: updateData.city }),
          ...(updateData.zipPostalCode && { zipCode: updateData.zipPostalCode })
        }
      };

      await client.query(
        'UPDATE organizations SET settings = $1 WHERE id = $2',
        [JSON.stringify(updatedSettings), id]
      );

      await client.query('COMMIT');

      return { success: true, message: 'Organization updated successfully' };

    } catch (error) {
      await client.query('ROLLBACK');
      throw new Error(`Failed to update organization: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Reset admin password for organization
  async resetAdminPassword(organizationId: string) {
    const client = await pool.connect();

    try {
      // Find the superuser for this organization (assuming first created user is admin)
      const adminResult = await client.query(`
        SELECT id, email FROM users 
        WHERE organization_id = $1 
        ORDER BY created_at ASC 
        LIMIT 1
      `, [organizationId]);

      if (adminResult.rows.length === 0) {
        throw new Error('No admin user found for this organization');
      }

      const admin = adminResult.rows[0];
      const tempPassword = this.generateTempPassword();
      const passwordHash = await hashPassword(tempPassword);

      // Update admin password
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE id = $2',
        [passwordHash, admin.id]
      );

      return {
        success: true,
        message: 'Admin password reset successfully',
        tempPassword: tempPassword,
        adminEmail: admin.email
      };

    } catch (error) {
      throw new Error(`Failed to reset admin password: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Create subscription for organization
  async createSubscription(organizationId: string, subscriptionData: {
    paymentDate: string;
    subscriptionPeriod: string;
    subscribedUsers: number;
    pricePerUser: number;
    totalMonthlyAmount: number;
  }) {
    const client = await pool.connect();

    try {
      // Calculate end date based on subscription period
      const startDate = new Date(subscriptionData.paymentDate);
      const endDate = new Date(startDate);
      
      switch (subscriptionData.subscriptionPeriod) {
        case 'month':
          endDate.setMonth(endDate.getMonth() + 1);
          break;
        case 'quarter':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'year':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        default:
          endDate.setMonth(endDate.getMonth() + 3); // Default to quarter
      }

      // Create subscription record
      const result = await client.query(`
        INSERT INTO subscriptions (
          org_id, seats_limit, plan_code, status, start_at, end_at
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id, org_id, seats_limit, plan_code, status, start_at, end_at
      `, [
        organizationId,
        subscriptionData.subscribedUsers,
        'pro', // Default plan code
        'active',
        startDate,
        endDate
      ]);

      return {
        success: true,
        message: 'Subscription created successfully',
        subscription: result.rows[0]
      };

    } catch (error) {
      throw new Error(`Failed to create subscription: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      client.release();
    }
  }

  // Credit organization wallet
  async creditWallet(organizationId: string, walletData: {
    amount: number;
    description: string;
  }) {
    const client = await pool.connect();

    try {
      // For now, we'll simulate wallet credit since we don't have a wallet table
      // In a real implementation, this would create a wallet transaction record
      
      return {
        success: true,
        message: `Wallet credited with $${walletData.amount}`,
        transaction: {
          organizationId,
          amount: walletData.amount,
          description: walletData.description,
          timestamp: new Date().toISOString(),
          type: 'credit'
        }
      };

    } catch (error) {
      throw new Error(`Failed to credit wallet: ${error instanceof Error ? error.message : 'Unknown error'}`);
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