import { Injectable, Inject } from '@nestjs/common';
import { NormalizedRow, CommitResponse, CommitOverview, CommitRecord } from '../types';
import type { IdentityPort } from '../ports/identity.port';
import { IDENTITY_PORT } from '../ports/identity.port';

export type PlanningOptions = {
  allowDuplicateEmails?: boolean;
  createMissingDepartments?: boolean;
  createMissingLocations?: boolean;
  validateManagerReferences?: boolean;
};

export type UserComparisonResult = {
  hasChanges: boolean;
  changes: Array<{
    field: string;
    from: any;
    to: any;
  }>;
};

@Injectable()
export class PlanningService {
  constructor(@Inject(IDENTITY_PORT) private readonly identityPort: IdentityPort) {}

  /**
   * Create import plan from normalized data
   */
  async createImportPlan(
    normalizedData: NormalizedRow[],
    orgId: string,
    options: PlanningOptions = {}
  ): Promise<CommitResponse> {
    const opts = {
      allowDuplicateEmails: false,
      createMissingDepartments: true,
      createMissingLocations: true,
      validateManagerReferences: true,
      ...options
    };

    if (normalizedData.length === 0) {
      return {
        overview: {
          creates: 0, updates: 0, skips: 0, duplicates: 0, invalid: 0,
          newDepartments: [], newLocations: []
        },
        records: []
      };
    }

    // Detect CSV duplicates
    const emailDuplicates = this.findDuplicateEmails(normalizedData);
    
    // Get existing organizational data
    const [existingDepartments, existingLocations] = await Promise.all([
      this.identityPort.listDistinctDepartments(orgId),
      this.identityPort.listDistinctLocations(orgId)
    ]);

    const existingDepts = new Set(existingDepartments.map(d => d.trim().toLowerCase()));
    const existingLocs = new Set(existingLocations.map(l => l.trim().toLowerCase()));

    // Analyze what new departments and locations will be created
    const newDepartments = this.collectNewDepartments(normalizedData, existingDepts);
    const newLocations = this.collectNewLocations(normalizedData, existingLocs);

    // Process each row to determine action
    const records: CommitRecord[] = [];
    let creates = 0, updates = 0, skips = 0, invalid = 0;

    for (let i = 0; i < normalizedData.length; i++) {
      const row = normalizedData[i];
      const rowNumber = i + 2; // +2 for header and 1-indexed

      // Validate required fields
      const validationErrors = this.validateRowFields(row);
      if (validationErrors.length > 0) {
        invalid++;
        records.push({
          action: 'invalid',
          reason: validationErrors,
          incoming: row
        });
        continue;
      }

      const reasons: string[] = [];

      // Check for duplicates in the CSV
      if (emailDuplicates.has(row.email!.toLowerCase())) {
        reasons.push('Duplicate email in CSV');
      }

      try {
        // Check if user already exists
        const existingUser = await this.identityPort.findUserByEmailOrg(row.email!, orgId);

        if (!existingUser) {
          creates++;
          records.push({
            action: 'create',
            reason: reasons.length > 0 ? reasons : undefined,
            incoming: row
          });
        } else {
          // Determine if update is needed
          const comparison = this.compareUserData(existingUser, row);
          
          if (!comparison.hasChanges && !row.managerEmail) {
            skips++;
            records.push({
              action: 'skip',
              reason: reasons.length > 0 ? reasons : ['No changes detected'],
              incoming: row
            });
          } else {
            updates++;
            records.push({
              action: 'update',
              changes: comparison.changes.length > 0 ? comparison.changes : undefined,
              reason: reasons.length > 0 ? reasons : undefined,
              incoming: row
            });
          }
        }
      } catch (error) {
        invalid++;
        records.push({
          action: 'invalid',
          reason: [`Database error: ${error.message}`],
          incoming: row
        });
      }
    }

    // Manager relationship analysis
    const managerAnalysis = opts.validateManagerReferences 
      ? await this.analyzeManagerRelationships(normalizedData, orgId)
      : { managerMissing: 0, managerCycles: 0, managerSelf: 0 };

    // Enhance records with manager information
    const enhancedRecords = await this.enhanceRecordsWithManagerInfo(
      records, 
      normalizedData, 
      orgId,
      opts.validateManagerReferences
    );

    const overview: CommitOverview = {
      creates,
      updates,
      skips,
      duplicates: emailDuplicates.size,
      invalid,
      newDepartments,
      newLocations,
      ...managerAnalysis
    };

    return {
      overview,
      records: enhancedRecords
    };
  }

  /**
   * Find duplicate email addresses in the data
   */
  private findDuplicateEmails(data: NormalizedRow[]): Set<string> {
    const emailCounts = new Map<string, number>();
    const duplicates = new Set<string>();

    for (const row of data) {
      if (row.email) {
        const email = row.email.toLowerCase().trim();
        const count = (emailCounts.get(email) || 0) + 1;
        emailCounts.set(email, count);
        
        if (count > 1) {
          duplicates.add(email);
        }
      }
    }

    return duplicates;
  }

  /**
   * Collect new departments that need to be created
   */
  private collectNewDepartments(data: NormalizedRow[], existingDepts: Set<string>): string[] {
    const newDepts = new Set<string>();
    
    for (const row of data) {
      if (row.department) {
        const dept = row.department.trim();
        const deptLower = dept.toLowerCase();
        
        if (!existingDepts.has(deptLower) && !newDepts.has(dept)) {
          newDepts.add(dept);
        }
      }
    }
    
    return Array.from(newDepts).sort();
  }

  /**
   * Collect new locations that need to be created
   */
  private collectNewLocations(data: NormalizedRow[], existingLocs: Set<string>): string[] {
    const newLocs = new Set<string>();
    
    for (const row of data) {
      if (row.location) {
        const loc = row.location.trim();
        const locLower = loc.toLowerCase();
        
        if (!existingLocs.has(locLower) && !newLocs.has(loc)) {
          newLocs.add(loc);
        }
      }
    }
    
    return Array.from(newLocs).sort();
  }

  /**
   * Validate that required fields are present for a row
   */
  private validateRowFields(row: NormalizedRow): string[] {
    const errors: string[] = [];
    const requiredFields = ['email', 'givenName', 'jobTitle', 'department', 'hireDate'];

    for (const field of requiredFields) {
      const value = row[field as keyof NormalizedRow];
      if (!value || String(value).trim() === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }

    // Additional validation
    if (row.email && !this.isValidEmail(row.email)) {
      errors.push('Invalid email format');
    }

    if (row.hireDate && !this.isValidDate(row.hireDate)) {
      errors.push('Invalid hire date format (use YYYY-MM-DD)');
    }

    if (row.managerEmail && !this.isValidEmail(row.managerEmail)) {
      errors.push('Invalid manager email format');
    }

    return errors;
  }

  /**
   * Compare existing user data with incoming data
   */
  private compareUserData(existingUser: any, incomingRow: NormalizedRow): UserComparisonResult {
    const changes: Array<{ field: string; from: any; to: any }> = [];
    
    // Compare relevant fields
    const fieldMappings = {
      givenName: 'firstName',
      familyName: 'lastName',
      jobTitle: 'jobTitle',
      department: 'department',
      location: 'location',
      hireDate: 'hireDate'
    };

    for (const [incomingField, existingField] of Object.entries(fieldMappings)) {
      const incomingValue = incomingRow[incomingField as keyof NormalizedRow];
      const existingValue = existingUser[existingField];

      // Normalize values for comparison
      const normalizedIncoming = incomingValue ? String(incomingValue).trim() : null;
      const normalizedExisting = existingValue ? String(existingValue).trim() : null;

      if (normalizedIncoming !== normalizedExisting) {
        changes.push({
          field: incomingField,
          from: normalizedExisting,
          to: normalizedIncoming
        });
      }
    }

    return {
      hasChanges: changes.length > 0,
      changes
    };
  }

  /**
   * Analyze manager relationships for potential issues
   */
  private async analyzeManagerRelationships(
    data: NormalizedRow[], 
    orgId: string
  ): Promise<{ managerMissing: number; managerCycles: number; managerSelf: number }> {
    const emailsInCsv = new Set(
      data
        .map(row => row.email?.toLowerCase().trim())
        .filter(Boolean)
    );

    let managerMissing = 0;
    let managerSelf = 0;
    let managerCycles = 0; // This would require more complex graph analysis

    for (const row of data) {
      if (row.managerEmail) {
        const managerEmailLower = row.managerEmail.toLowerCase().trim();
        const userEmailLower = row.email?.toLowerCase().trim();

        // Check for self-management
        if (managerEmailLower === userEmailLower) {
          managerSelf++;
          continue;
        }

        // Check if manager exists in database or CSV
        const managerInCsv = emailsInCsv.has(managerEmailLower);
        let managerInDb = false;

        if (!managerInCsv) {
          try {
            const existingManager = await this.identityPort.findUserByEmailOrg(row.managerEmail, orgId);
            managerInDb = !!existingManager;
          } catch {
            // If error checking database, assume manager doesn't exist
            managerInDb = false;
          }
        }

        if (!managerInCsv && !managerInDb) {
          managerMissing++;
        }
      }
    }

    // TODO: Implement cycle detection if needed
    // This would require building a graph of manager relationships and detecting cycles

    return { managerMissing, managerSelf, managerCycles };
  }

  /**
   * Enhance records with manager information
   */
  private async enhanceRecordsWithManagerInfo(
    records: CommitRecord[],
    normalizedData: NormalizedRow[],
    orgId: string,
    validateManagerReferences: boolean
  ): Promise<CommitRecord[]> {
    if (!validateManagerReferences) {
      return records;
    }

    const emailsInCsv = new Set(
      normalizedData
        .map(row => row.email?.toLowerCase().trim())
        .filter(Boolean)
    );

    const enhancedRecords: CommitRecord[] = [];

    for (const record of records) {
      const managerEmail = record.incoming.managerEmail;
      const updatedReasons = [...(record.reason || [])];

      if (managerEmail) {
        const managerEmailLower = managerEmail.toLowerCase().trim();
        const userEmailLower = record.incoming.email?.toLowerCase().trim();

        if (managerEmailLower === userEmailLower) {
          updatedReasons.push('Self-management detected');
        } else {
          const managerInCsv = emailsInCsv.has(managerEmailLower);
          
          if (managerInCsv) {
            updatedReasons.push('Manager will be created from CSV');
          } else {
            try {
              const existingManager = await this.identityPort.findUserByEmailOrg(managerEmail, orgId);
              if (existingManager) {
                updatedReasons.push('Manager found in database');
              } else {
                updatedReasons.push('Manager not found - will be ignored');
              }
            } catch {
              updatedReasons.push('Error checking manager - will be ignored');
            }
          }
        }
      }

      enhancedRecords.push({
        ...record,
        reason: updatedReasons.length > 0 ? updatedReasons : undefined
      });
    }

    return enhancedRecords;
  }

  /**
   * Basic email validation
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Basic date validation (YYYY-MM-DD format)
   */
  private isValidDate(date: string): boolean {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) return false;
    
    const dateObj = new Date(date.trim());
    return !isNaN(dateObj.getTime()) && dateObj.toISOString().split('T')[0] === date.trim();
  }

  /**
   * Get planning summary
   */
  getPlanSummary(response: CommitResponse): string {
    const { overview } = response;
    const total = overview.creates + overview.updates + overview.skips + overview.invalid;
    
    const parts = [];
    if (overview.creates > 0) parts.push(`${overview.creates} creates`);
    if (overview.updates > 0) parts.push(`${overview.updates} updates`);
    if (overview.skips > 0) parts.push(`${overview.skips} skips`);
    if (overview.invalid > 0) parts.push(`${overview.invalid} invalid`);
    
    let summary = `Plan: ${parts.join(', ')} (${total} total rows)`;
    
    if (overview.newDepartments.length > 0) {
      summary += `\nNew departments: ${overview.newDepartments.join(', ')}`;
    }
    
    if (overview.newLocations.length > 0) {
      summary += `\nNew locations: ${overview.newLocations.join(', ')}`;
    }
    
    const managerIssues = [];
    if (overview.managerMissing) managerIssues.push(`${overview.managerMissing} missing managers`);
    if (overview.managerSelf) managerIssues.push(`${overview.managerSelf} self-management`);
    if (overview.managerCycles) managerIssues.push(`${overview.managerCycles} manager cycles`);
    
    if (managerIssues.length > 0) {
      summary += `\nManager issues: ${managerIssues.join(', ')}`;
    }
    
    return summary;
  }
}