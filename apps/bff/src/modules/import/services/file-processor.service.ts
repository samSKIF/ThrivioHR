import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';
import { parse } from 'csv-parse/sync';
import { NormalizedRow } from '../types';

export type ParsedFileResult = {
  headers: string[];
  rows: Record<string, unknown>[];
  totalRows: number;
  fileType: 'csv' | 'xlsx';
  errors: Array<{ row: number; message: string }>;
};

export type FileProcessorOptions = {
  maxFileSize?: number; // bytes
  maxRows?: number;
  supportedTypes?: string[];
};

@Injectable()
export class FileProcessorService {
  private readonly defaultOptions: Required<FileProcessorOptions> = {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxRows: 10000,
    supportedTypes: [
      'text/csv', 
      'application/csv', 
      'text/plain',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/octet-stream'
    ]
  };

  /**
   * Process uploaded file buffer and extract data
   */
  processFile(
    buffer: Buffer, 
    mimetype: string, 
    filename: string,
    options?: Partial<FileProcessorOptions>
  ): ParsedFileResult {
    const opts = { ...this.defaultOptions, ...options };
    
    // Validate file size
    if (buffer.length > opts.maxFileSize) {
      throw new BadRequestException(`File size exceeds maximum limit of ${this.formatFileSize(opts.maxFileSize)}`);
    }

    // Validate file type
    if (!opts.supportedTypes.includes(mimetype)) {
      throw new BadRequestException(`Unsupported file type. Supported types: ${opts.supportedTypes.join(', ')}`);
    }

    const fileExtension = this.getFileExtension(filename);
    
    // Determine file type based on MIME type and extension
    const isCsvType = mimetype === 'text/csv' || 
                     mimetype === 'application/csv' || 
                     mimetype === 'text/plain' ||
                     fileExtension === '.csv';
    
    const isExcelType = mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                       mimetype === 'application/vnd.ms-excel' ||
                       (mimetype === 'application/octet-stream' && fileExtension === '.xlsx') ||
                       fileExtension === '.xlsx';

    if (isCsvType) {
      return this.processCsvFile(buffer, opts);
    } else if (isExcelType) {
      return this.processExcelFile(buffer, opts);
    } else {
      throw new BadRequestException('Unsupported file format. Please upload CSV or Excel (.xlsx) files only.');
    }
  }

  /**
   * Process CSV file
   */
  private processCsvFile(buffer: Buffer, options: Required<FileProcessorOptions>): ParsedFileResult {
    const csvContent = buffer.toString('utf-8');
    const errors: Array<{ row: number; message: string }> = [];
    
    if (!csvContent.trim()) {
      throw new BadRequestException('CSV file is empty');
    }

    try {
      const records = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relaxColumnCount: true,
        skipRecordsWithError: false,
        onRecord: (record, context) => {
          if (context.lines > options.maxRows + 1) { // +1 for header
            errors.push({ 
              row: context.lines, 
              message: `File contains too many rows. Maximum allowed: ${options.maxRows}` 
            });
            return null;
          }
          return record;
        }
      }) as Record<string, unknown>[];

      if (records.length === 0) {
        throw new BadRequestException('CSV file contains no data rows');
      }

      const headers = Object.keys(records[0] ?? {});
      if (headers.length === 0) {
        throw new BadRequestException('CSV file has no headers');
      }

      return {
        headers: this.normalizeHeaders(headers),
        rows: records,
        totalRows: records.length,
        fileType: 'csv',
        errors
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse CSV file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process Excel file
   */
  private processExcelFile(buffer: Buffer, options: Required<FileProcessorOptions>): ParsedFileResult {
    const errors: Array<{ row: number; message: string }> = [];
    
    try {
      const workbook = XLSX.read(buffer, { type: 'buffer' });
      
      if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
        throw new BadRequestException('Excel file contains no worksheets');
      }

      // Use first worksheet
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      
      if (!worksheet) {
        throw new BadRequestException('Failed to read Excel worksheet');
      }

      // Convert to JSON with header row
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        header: 1,
        defval: null,
        blankrows: false
      }) as unknown[][];

      if (jsonData.length === 0) {
        throw new BadRequestException('Excel file contains no data');
      }

      if (jsonData.length === 1) {
        throw new BadRequestException('Excel file contains only headers, no data rows');
      }

      if (jsonData.length - 1 > options.maxRows) {
        errors.push({ 
          row: options.maxRows + 1, 
          message: `File contains too many rows. Maximum allowed: ${options.maxRows}` 
        });
      }

      // Extract headers from first row
      const headerRow = jsonData[0] as string[];
      const headers = headerRow.filter(h => h != null && h !== '').map(h => String(h));
      
      if (headers.length === 0) {
        throw new BadRequestException('Excel file has no valid headers');
      }

      // Convert data rows to objects
      const records: Record<string, unknown>[] = [];
      const normalizedHeaders = this.normalizeHeaders(headers);
      
      for (let i = 1; i < Math.min(jsonData.length, options.maxRows + 1); i++) {
        const row = jsonData[i] as unknown[];
        const record: Record<string, unknown> = {};
        
        for (let j = 0; j < headers.length; j++) {
          const value = row[j];
          record[normalizedHeaders[j]] = this.normalizeExcelValue(value);
        }
        
        records.push(record);
      }

      return {
        headers: normalizedHeaders,
        rows: records,
        totalRows: records.length,
        fileType: 'xlsx',
        errors
      };
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to parse Excel file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Normalize headers to match database field names
   */
  private normalizeHeaders(headers: string[]): string[] {
    const headerMap: Record<string, string> = {
      // Standard mappings
      'email': 'email',
      'firstname': 'givenName',
      'first name': 'givenName',
      'first_name': 'givenName',
      'givenname': 'givenName',
      'given_name': 'givenName',
      'lastname': 'familyName',
      'last name': 'familyName',
      'last_name': 'familyName',
      'surname': 'familyName',
      'familyname': 'familyName',
      'family_name': 'familyName',
      'jobtitle': 'jobTitle',
      'job title': 'jobTitle',
      'job_title': 'jobTitle',
      'title': 'jobTitle',
      'position': 'jobTitle',
      'role': 'jobTitle',
      'department': 'department',
      'dept': 'department',
      'division': 'department',
      'team': 'department',
      'location': 'location',
      'office': 'location',
      'site': 'location',
      'city': 'location',
      'hiredate': 'hireDate',
      'hire date': 'hireDate',
      'hire_date': 'hireDate',
      'start date': 'hireDate',
      'start_date': 'hireDate',
      'startdate': 'hireDate',
      'manageremail': 'managerEmail',
      'manager email': 'managerEmail',
      'manager_email': 'managerEmail',
      'manager': 'managerEmail',
      'supervisor': 'managerEmail',
      'employeeid': 'employeeId',
      'employee id': 'employeeId',
      'employee_id': 'employeeId',
      'emp id': 'employeeId',
      'emp_id': 'employeeId',
      'id': 'employeeId',
      'phone': 'phone',
      'telephone': 'phone',
      'mobile': 'phone',
      'cell': 'phone',
      'contact': 'phone',
      'birthdate': 'birthDate',
      'birth date': 'birthDate',
      'birth_date': 'birthDate',
      'dob': 'birthDate',
      'date of birth': 'birthDate',
      'nationality': 'nationality',
      'country': 'nationality',
      'citizenship': 'nationality',
      'gender': 'gender',
      'sex': 'gender'
    };

    return headers.map(header => {
      const normalized = header.toLowerCase().trim();
      return headerMap[normalized] || header;
    });
  }

  /**
   * Normalize Excel cell values
   */
  private normalizeExcelValue(value: unknown): string | null {
    if (value == null || value === '') {
      return null;
    }
    
    // Handle dates - Excel stores dates as numbers
    if (typeof value === 'number' && value > 25000 && value < 50000) {
      // Likely an Excel date serial number
      try {
        const date = XLSX.SSF.parse_date_code(value);
        if (date) {
          return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`;
        }
      } catch {
        // If date parsing fails, treat as regular number
      }
    }
    
    return String(value).trim();
  }

  /**
   * Get file extension from filename
   */
  private getFileExtension(filename: string): string {
    return filename.toLowerCase().substring(filename.lastIndexOf('.'));
  }

  /**
   * Format file size for error messages
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}