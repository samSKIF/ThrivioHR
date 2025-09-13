import { 
  Controller, 
  Post, 
  Get, 
  Delete, 
  Body, 
  Param, 
  Query, 
  Req,
  UseGuards, 
  UploadedFile, 
  UseInterceptors,
  BadRequestException,
  NotFoundException 
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { OrgScopeGuard } from '../auth/org-scope.guard';
import { ImportService } from './import.service';
import { ValidationResult, CommitResponse, ApplyReport } from './types';

export interface ImportSessionRequest {
  orgId: string;
  csv: string;
  filename: string;
}

export interface ImportSessionResponse {
  sessionId: string;
  overview: {
    creates: number;
    updates: number;
    skips: number;
    duplicates: number;
    invalid: number;
    newDepartments: string[];
    newLocations: string[];
  };
}

@Controller('import')
@UseGuards(JwtAuthGuard, OrgScopeGuard)
export class ImportController {
  constructor(private readonly importService: ImportService) {}

  /**
   * Validate CSV format and preview structure
   */
  @Post('validate')
  async validateCsv(@Body() body: { csv: string }): Promise<ValidationResult> {
    if (!body.csv) {
      throw new BadRequestException('CSV content is required');
    }
    return this.importService.validateCsv(body.csv);
  }

  /**
   * Create import plan from CSV
   */
  @Post('plan')
  async createPlan(
    @Body() body: { csv: string; orgId: string }
  ): Promise<CommitResponse> {
    if (!body.csv) {
      throw new BadRequestException('CSV content is required');
    }
    if (!body.orgId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.importService.createImportPlanFromCsv(body.csv, body.orgId);
  }

  /**
   * Upload file and create import session
   */
  @Post('session')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB limit
      files: 1
    },
    fileFilter: (req, file, callback) => {
      const allowedMimes = [
        'text/csv',
        'application/csv',
        'text/plain',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      // Check MIME type first
      if (allowedMimes.includes(file.mimetype)) {
        callback(null, true);
        return;
      }
      
      // For application/octet-stream, check file extension
      if (file.mimetype === 'application/octet-stream' && file.originalname) {
        const extension = file.originalname.toLowerCase().split('.').pop();
        if (extension === 'csv' || extension === 'xlsx') {
          callback(null, true);
          return;
        }
      }
      
      callback(new BadRequestException('Only CSV and Excel (.xlsx) files are allowed'), false);
    }
  }))
  async createSession(
    @UploadedFile() file: any,
    @Body() body: { orgId: string },
    @Req() req: { user: Record<string, unknown> }
  ): Promise<ImportSessionResponse & { validation: { isValid: boolean; summary: string } }> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!body.orgId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!req.user?.sub) {
      throw new BadRequestException('User authentication required');
    }

    try {
      const result = await this.importService.createImportSession(
        file.buffer,
        file.mimetype,
        file.originalname,
        body.orgId,
        req.user.sub as string
      );

      return {
        sessionId: result.sessionId,
        overview: result.overview,
        validation: {
          isValid: result.validation.isValid,
          summary: this.importService.getValidationSummary(result.validation)
        }
      };
    } catch (error) {
      throw new BadRequestException(`File processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Alternative endpoint to create session with raw CSV data
   */
  @Post('session/raw')
  async createSessionRaw(
    @Body() body: ImportSessionRequest,
    @Req() req: { user: Record<string, unknown> }
  ): Promise<ImportSessionResponse> {
    if (!body.csv) {
      throw new BadRequestException('CSV content is required');
    }
    if (!body.orgId) {
      throw new BadRequestException('Organization ID is required');
    }
    if (!body.filename) {
      throw new BadRequestException('Filename is required');
    }

    if (!req.user?.sub) {
      throw new BadRequestException('User authentication required');
    }

    const result = await this.importService.createImportSessionFromCsv(
      body.csv, 
      body.orgId, 
      req.user.sub as string, 
      body.filename
    );

    return {
      sessionId: result.sessionId,
      overview: result.overview
    };
  }

  /**
   * Preview import session plan
   */
  @Get('session/:id/preview')
  async previewSession(
    @Param('id') sessionId: string,
    @Query('orgId') orgId: string
  ): Promise<CommitResponse> {
    if (!orgId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.importService.previewImportSession(sessionId, orgId);
  }

  /**
   * Commit/apply import session
   */
  @Post('session/:id/commit')
  async commitSession(
    @Param('id') sessionId: string,
    @Body() body: { orgId: string }
  ): Promise<ApplyReport> {
    if (!body.orgId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.importService.applyImportSession(sessionId, body.orgId);
  }

  /**
   * Cancel/delete import session
   */
  @Delete('session/:id')
  async cancelSession(
    @Param('id') sessionId: string,
    @Query('orgId') orgId: string
  ): Promise<{ success: boolean }> {
    if (!orgId) {
      throw new BadRequestException('Organization ID is required');
    }
    await this.importService.cancelImportSession(sessionId, orgId);
    return { success: true };
  }

  /**
   * Download CSV template
   */
  @Get('template')
  async downloadTemplate(
    @Query('format') format: string = 'csv'
  ): Promise<{ content: string; filename: string; mimeType: string }> {
    if (format !== 'csv') {
      throw new BadRequestException('Only CSV format is currently supported');
    }

    // Template with required and optional fields clearly marked
    const csvHeaders = [
      // Required fields (marked with *)
      'email', // * Required
      'firstName', // * Required (maps to givenName)
      'lastName', // Optional (maps to familyName)
      'jobTitle', // * Required
      'department', // * Required
      'hireDate', // * Required (YYYY-MM-DD format)
      // Optional fields
      'location',
      'managerEmail',
      'employeeId',
      'phone',
      'birthDate', // YYYY-MM-DD format
      'nationality',
      'gender'
    ];

    const sampleData = [
      'john.doe@company.com,John,Doe,Software Engineer,Engineering,2024-01-15,New York,jane.manager@company.com,EMP001,+1-555-0123,1990-03-15,American,Male',
      'jane.smith@company.com,Jane,Smith,Product Manager,Product,2024-02-01,San Francisco,bob.director@company.com,EMP002,+1-555-0124,1985-07-22,Canadian,Female',
      'bob.jones@company.com,Bob,Jones,Senior Developer,Engineering,2023-12-01,Remote,,EMP003,+1-555-0125,,,,'
    ];

    const content = [
      '# Employee Import Template',
      '# Required fields: email, firstName, jobTitle, department, hireDate',
      '# Optional fields: lastName, location, managerEmail, employeeId, phone, birthDate, nationality, gender',
      '# Date format: YYYY-MM-DD (e.g., 2024-01-15)',
      csvHeaders.join(','), 
      ...sampleData
    ].join('\n');

    return {
      content,
      filename: 'employee-import-template.csv',
      mimeType: 'text/csv'
    };
  }
}