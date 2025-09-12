import { Injectable, BadRequestException, Inject } from '@nestjs/common';
import type { IdentityPort } from './ports/identity.port';
import { IDENTITY_PORT } from './ports/identity.port';
import { 
  ValidationResult, 
  CommitResponse, 
  ApplyReport, 
  ImportSessionData,
  NormalizedRow,
  CommitOverview,
  CommitRecord,
  ApplyResultRow
} from './types';
import * as crypto from 'crypto';
import { DRIZZLE_DB } from '../db/db.module';
import { importSessions } from '../../../../../services/identity/src/db/schema/import_sessions';
import { eq, and, gt } from 'drizzle-orm';
import { FileProcessorService, ParsedFileResult, FileProcessorOptions } from './services/file-processor.service';
import { ValidationService, DataValidationResult } from './services/validation.service';
import { PlanningService, PlanningOptions } from './services/planning.service';

const SESSION_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

@Injectable()
export class ImportService {
  constructor(
    @Inject(IDENTITY_PORT) private readonly identityPort: IdentityPort,
    @Inject(DRIZZLE_DB) private readonly db: any,
    private readonly fileProcessor: FileProcessorService,
    private readonly validationService: ValidationService,
    private readonly planningService: PlanningService
  ) {}

  /**
   * Process uploaded file and validate structure
   */
  processFileUpload(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    options?: Partial<FileProcessorOptions>
  ): ParsedFileResult {
    return this.fileProcessor.processFile(buffer, mimetype, filename, options);
  }

  /**
   * Validate CSV format and structure (legacy method for backwards compatibility)
   */
  validateCsv(csv: string): ValidationResult {
    return this.validationService.validateCsvStructure(csv);
  }

  /**
   * Validate parsed data from file
   */
  validateData(fileResult: ParsedFileResult): DataValidationResult {
    return this.validationService.validateData(
      fileResult.rows,
      fileResult.headers,
      { allowDuplicateEmails: false, strictDateValidation: true }
    );
  }

  /**
   * Create import plan from validated data
   */
  async createImportPlan(
    validationResult: DataValidationResult,
    orgId: string,
    options?: Partial<PlanningOptions>
  ): Promise<CommitResponse> {
    if (!validationResult.isValid) {
      return {
        overview: {
          creates: 0, updates: 0, skips: 0, duplicates: validationResult.duplicateEmails.length, 
          invalid: validationResult.invalidRows,
          newDepartments: [], newLocations: []
        },
        records: validationResult.sampleErrors.map(error => ({
          action: 'invalid' as const,
          reason: [error.message],
          incoming: { email: '', givenName: '', familyName: '' }
        }))
      };
    }

    return this.planningService.createImportPlan(validationResult.normalizedData, orgId, options);
  }

  /**
   * Create import plan from CSV (legacy method for backwards compatibility)
   */
  async createImportPlanFromCsv(csv: string, orgId: string): Promise<CommitResponse> {
    // Use legacy CSV parsing for backwards compatibility
    try {
      const fileResult = this.fileProcessor.processFile(
        Buffer.from(csv, 'utf-8'),
        'text/csv',
        'data.csv'
      );
      const validationResult = this.validateData(fileResult);
      return this.createImportPlan(validationResult, orgId);
    } catch (error) {
      return {
        overview: {
          creates: 0, updates: 0, skips: 0, duplicates: 0, invalid: 1,
          newDepartments: [], newLocations: []
        },
        records: [{
          action: 'invalid',
          reason: [error instanceof Error ? error.message : 'Failed to process CSV'],
          incoming: { email: '', givenName: '', familyName: '' }
        }]
      };
    }
  }

  /**
   * Create import session from file upload
   */
  async createImportSession(
    buffer: Buffer,
    mimetype: string,
    filename: string,
    orgId: string,
    userId: string
  ): Promise<{ sessionId: string; overview: CommitOverview; validation: DataValidationResult }> {
    // Process and validate file
    const fileResult = this.processFileUpload(buffer, mimetype, filename);
    const validationResult = this.validateData(fileResult);
    
    // Create import plan
    const plan = await this.createImportPlan(validationResult, orgId);
    
    // Create session hash from file content
    const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const result = await this.db.insert(importSessions).values({
      orgId,
      userId,
      filename,
      fileSize: buffer.length,
      csvSha256: fileHash,
      planJson: JSON.stringify(plan),
      status: 'pending',
      expiresAt
    }).returning({ id: importSessions.id });

    return {
      sessionId: result[0].id,
      overview: plan.overview,
      validation: validationResult
    };
  }

  /**
   * Create import session from CSV string (legacy method)
   */
  async createImportSessionFromCsv(csv: string, orgId: string, userId: string, filename: string): Promise<{ sessionId: string; overview: CommitOverview }> {
    const plan = await this.createImportPlanFromCsv(csv, orgId);
    const csvSha256 = crypto.createHash('sha256').update(csv, 'utf8').digest('hex');
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const result = await this.db.insert(importSessions).values({
      orgId,
      userId,
      filename,
      fileSize: csv.length,
      csvSha256,
      planJson: JSON.stringify(plan),
      status: 'pending',
      expiresAt
    }).returning({ id: importSessions.id });

    return {
      sessionId: result[0].id,
      overview: plan.overview
    };
  }

  /**
   * Get import session by ID
   */
  async getImportSession(sessionId: string, orgId: string): Promise<ImportSessionData | null> {
    const result = await this.db.select()
      .from(importSessions)
      .where(
        and(
          eq(importSessions.id, sessionId),
          eq(importSessions.orgId, orgId),
          gt(importSessions.expiresAt, new Date())
        )
      )
      .limit(1);

    if (result.length === 0) return null;

    const row = result[0];
    return {
      id: row.id,
      orgId: row.orgId,
      userId: row.userId,
      filename: row.filename,
      fileSize: row.fileSize,
      csvSha256: row.csvSha256,
      status: row.status,
      planJson: row.planJson,
      expiresAt: row.expiresAt,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt
    };
  }

  /**
   * Preview import session plan
   */
  async previewImportSession(sessionId: string, orgId: string): Promise<CommitResponse> {
    const session = await this.getImportSession(sessionId, orgId);
    if (!session) {
      throw new BadRequestException('Import session not found or expired');
    }

    if (!session.planJson) {
      throw new BadRequestException('Import session has no plan data');
    }

    return JSON.parse(session.planJson);
  }

  /**
   * Get validation summary for import session
   */
  getValidationSummary(validation: DataValidationResult): string {
    return this.validationService.getValidationSummary(validation);
  }

  /**
   * Get planning summary for import plan
   */
  getPlanSummary(response: CommitResponse): string {
    return this.planningService.getPlanSummary(response);
  }

  /**
   * Apply/commit import session
   */
  async applyImportSession(sessionId: string, orgId: string): Promise<ApplyReport> {
    const session = await this.getImportSession(sessionId, orgId);
    if (!session) {
      throw new BadRequestException('Import session not found or expired');
    }

    if (session.status !== 'pending') {
      throw new BadRequestException(`Import session is ${session.status}, cannot commit`);
    }

    const plan: CommitResponse = JSON.parse(session.planJson || '{}');
    const rows: ApplyResultRow[] = [];
    let createdUsers = 0, updatedUsers = 0, skipped = 0, errors = 0;
    let departmentsCreated = 0, membershipsLinked = 0, locationsCreated = 0;

    // Update session status to committed
    await this.db.update(importSessions)
      .set({ status: 'committed', updatedAt: new Date() })
      .where(eq(importSessions.id, sessionId));

    for (const rec of plan.records) {
      const incoming = rec.incoming;
      const email = incoming.email || null;
      const deptName = incoming.department || null;
      const locName = incoming.location || null;

      const ignoredFields: string[] = [];
      ['employeeId', 'startDate', 'birthDate', 'nationality', 'gender', 'phone', 'managerEmail']
        .forEach(f => { if (incoming[f as keyof typeof incoming] != null) ignoredFields.push(f); });

      try {
        if (!email || !rec.action) {
          skipped++; 
          rows.push({ email, action: 'skipped', ignoredFields, message: 'Missing email or action' });
          continue;
        }

        if (rec.action === 'create') {
          const existingUser = await this.identityPort.findUserByEmailOrg(email, orgId);
          const firstName = incoming.givenName || null;
          const lastName = incoming.familyName || null;

          const user = existingUser ?? await this.identityPort.createUser(
            orgId, email, firstName, lastName, 
            incoming.jobTitle || '', deptName || '', locName || '', 
            incoming.hireDate || new Date().toISOString().split('T')[0]
          );

          if (!existingUser) createdUsers++; 
          else updatedUsers++;

          if (existingUser) {
            await this.identityPort.updateUserNames(existingUser.id, firstName, lastName);
          }

          let membershipLinkedFlag = false;
          let locationCreatedFlag = false;

          if (deptName) {
            const { dept, created: deptCreated } = await this.identityPort.findOrCreateDepartment(orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identityPort.ensureMembership(user.id, dept.id as string);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true;
            }
          }

          if (locName) {
            const { created: locCreated } = await this.identityPort.findOrCreateLocation(orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreatedFlag = locCreated;
          }

          rows.push({
            email, action: existingUser ? 'updated' : 'created',
            userId: user.id,
            department: deptName,
            membershipLinked: membershipLinkedFlag,
            location: locName,
            locationCreated: locationCreatedFlag,
            ignoredFields
          });

        } else if (rec.action === 'update') {
          const user = await this.identityPort.findUserByEmailOrg(email, orgId);
          if (!user) {
            // Safety: create if user disappeared
            const firstName = incoming.givenName || null;
            const lastName = incoming.familyName || null;
            const newUser = await this.identityPort.createUser(
              orgId, email, firstName, lastName,
              incoming.jobTitle || '', deptName || '', locName || '',
              incoming.hireDate || new Date().toISOString().split('T')[0]
            );
            createdUsers++;
            
            rows.push({ email, action: 'created', userId: newUser.id, department: deptName, location: locName, ignoredFields });
            continue;
          }

          const firstName = incoming.givenName || null;
          const lastName = incoming.familyName || null;
          await this.identityPort.updateUserNames(user.id, firstName, lastName);
          updatedUsers++;

          let membershipLinkedFlag = false;
          let locationCreatedFlag = false;

          if (deptName) {
            const { dept, created: deptCreated } = await this.identityPort.findOrCreateDepartment(orgId, deptName);
            if (deptCreated) departmentsCreated++;
            if (dept) {
              const { created: membershipCreated } = await this.identityPort.ensureMembership(user.id, dept.id as string);
              if (membershipCreated) membershipsLinked++;
              membershipLinkedFlag = true;
            }
          }

          if (locName) {
            const { created: locCreated } = await this.identityPort.findOrCreateLocation(orgId, locName);
            if (locCreated) locationsCreated++;
            locationCreatedFlag = locCreated;
          }

          rows.push({ 
            email, action: 'updated', userId: user.id, 
            department: deptName, membershipLinked: membershipLinkedFlag, 
            location: locName, locationCreated: locationCreatedFlag, 
            ignoredFields 
          });

        } else {
          skipped++; 
          rows.push({ email, action: 'skipped', department: deptName, location: locName, ignoredFields });
        }
      } catch (e: unknown) {
        errors++;
        const errorMessage = e instanceof Error ? e.message : 'unknown error';
        rows.push({ email, action: 'error', department: deptName, location: locName, ignoredFields, message: errorMessage });
      }
    }

    return {
      createdUsers, updatedUsers, skipped, errors,
      departmentsCreated, membershipsLinked, locationsCreated,
      rows,
    };
  }

  /**
   * Cancel/delete import session
   */
  async cancelImportSession(sessionId: string, orgId: string): Promise<void> {
    await this.db.delete(importSessions)
      .where(
        and(
          eq(importSessions.id, sessionId),
          eq(importSessions.orgId, orgId)
        )
      );
  }
}