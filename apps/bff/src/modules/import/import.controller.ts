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
    return this.importService.createImportPlan(body.csv, body.orgId);
  }

  /**
   * Upload file and create import session
   */
  @Post('session')
  @UseInterceptors(FileInterceptor('file'))
  async createSession(
    @UploadedFile() file: any,
    @Body() body: { orgId: string },
    @Req() req: { user: Record<string, unknown> }
  ): Promise<ImportSessionResponse> {
    if (!file) {
      throw new BadRequestException('File is required');
    }
    if (!body.orgId) {
      throw new BadRequestException('Organization ID is required');
    }

    const csv = file.buffer.toString('utf-8');
    const result = await this.importService.createImportSession(
      csv, 
      body.orgId, 
      req.user.id as string, 
      file.originalname
    );

    return {
      sessionId: result.sessionId,
      overview: result.overview
    };
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

    const result = await this.importService.createImportSession(
      body.csv, 
      body.orgId, 
      req.user.id as string, 
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

    const csvHeaders = [
      'email',
      'firstName', 
      'lastName',
      'jobTitle',
      'department',
      'location',
      'hireDate',
      'managerEmail',
      'employeeId',
      'phone'
    ];

    const sampleData = [
      'john.doe@company.com,John,Doe,Software Engineer,Engineering,New York,2024-01-15,jane.manager@company.com,EMP001,+1-555-0123',
      'jane.smith@company.com,Jane,Smith,Product Manager,Product,San Francisco,2024-02-01,bob.director@company.com,EMP002,+1-555-0124'
    ];

    const content = [csvHeaders.join(','), ...sampleData].join('\n');

    return {
      content,
      filename: 'employee-import-template.csv',
      mimeType: 'text/csv'
    };
  }
}