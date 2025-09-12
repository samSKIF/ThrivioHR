import { Injectable } from '@nestjs/common';
import { NormalizedRow, ValidationResult } from '../types';

export type FieldValidationRule = {
  field: string;
  required: boolean;
  validator?: (value: any) => boolean;
  message?: string;
};

export type ValidationOptions = {
  allowDuplicateEmails?: boolean;
  strictDateValidation?: boolean;
  maxRowsToValidate?: number;
};

export type DataValidationResult = {
  isValid: boolean;
  rowsProcessed: number;
  validRows: number;
  invalidRows: number;
  duplicateEmails: string[];
  fieldErrors: Record<string, number>; // field -> error count
  sampleErrors: Array<{ row: number; field?: string; message: string }>;
  requiredHeaders: string[];
  missingHeaders: string[];
  normalizedData: NormalizedRow[];
};

@Injectable()
export class ValidationService {
  // Field validation rules based on user requirements
  private readonly validationRules: FieldValidationRule[] = [
    { field: 'email', required: true, validator: this.validateEmail, message: 'Invalid email format' },
    { field: 'givenName', required: true, message: 'First name is required' },
    { field: 'jobTitle', required: true, message: 'Job title is required' },
    { field: 'department', required: true, message: 'Department is required' },
    { field: 'hireDate', required: true, validator: this.validateDate, message: 'Invalid hire date format (use YYYY-MM-DD)' },
    { field: 'familyName', required: false }, // lastName is optional per user requirements
    { field: 'managerEmail', required: false, validator: this.validateEmail, message: 'Invalid manager email format' },
    { field: 'location', required: false },
    { field: 'phone', required: false, validator: this.validatePhone, message: 'Invalid phone number format' },
    { field: 'birthDate', required: false, validator: this.validateDate, message: 'Invalid birth date format (use YYYY-MM-DD)' },
    { field: 'employeeId', required: false },
    { field: 'nationality', required: false },
    { field: 'gender', required: false }
  ];

  private readonly requiredHeaders = ['email', 'givenName', 'jobTitle', 'department', 'hireDate'];

  /**
   * Check if a required field is present in headers (accounting for field aliases)
   */
  private isRequiredFieldPresent(requiredField: string, headers: string[]): boolean {
    // Direct match first
    if (headers.includes(requiredField)) {
      return true;
    }

    // Check for field aliases
    const aliases = {
      'givenName': ['firstName', 'first_name', 'given_name'],
      'familyName': ['lastName', 'last_name', 'family_name']
    };

    if (aliases[requiredField]) {
      return aliases[requiredField].some(alias => headers.includes(alias));
    }

    return false;
  }

  /**
   * Validate CSV format and structure
   */
  validateCsvStructure(csv: string): ValidationResult {
    if (!csv?.trim()) {
      return {
        rows: 0,
        valid: 0,
        invalid: 0,
        requiredHeaders: this.requiredHeaders,
        missingHeaders: this.requiredHeaders,
        inferredHeaders: [],
        preview: [],
        sampleErrors: [{ row: 0, message: 'CSV body is empty' }]
      };
    }

    // Basic CSV parsing to check structure
    const lines = csv.split('\n').filter(line => line.trim());
    if (lines.length === 0) {
      return {
        rows: 0,
        valid: 0,
        invalid: 0,
        requiredHeaders: this.requiredHeaders,
        missingHeaders: this.requiredHeaders,
        inferredHeaders: [],
        preview: [],
        sampleErrors: [{ row: 0, message: 'CSV contains no data' }]
      };
    }

    const headerLine = lines[0];
    const headers = headerLine.split(',').map(h => h.trim().replace(/['"]/g, ''));
    const missingHeaders = this.requiredHeaders.filter(h => !this.isRequiredFieldPresent(h, headers));

    // Basic row count validation
    const dataRows = lines.slice(1);
    const sampleErrors: Array<{ row: number; message: string }> = [];
    
    if (dataRows.length === 0) {
      sampleErrors.push({ row: 1, message: 'No data rows found' });
    }

    return {
      rows: dataRows.length,
      valid: missingHeaders.length === 0 ? dataRows.length : 0,
      invalid: missingHeaders.length > 0 ? 1 : 0,
      requiredHeaders: this.requiredHeaders,
      missingHeaders,
      inferredHeaders: headers,
      preview: [],
      sampleErrors
    };
  }

  /**
   * Validate parsed data rows
   */
  validateData(
    rows: Record<string, unknown>[],
    headers: string[],
    options: ValidationOptions = {}
  ): DataValidationResult {
    const opts = {
      allowDuplicateEmails: false,
      strictDateValidation: true,
      maxRowsToValidate: 10000,
      ...options
    };

    const normalizedData: NormalizedRow[] = [];
    const sampleErrors: Array<{ row: number; field?: string; message: string }> = [];
    const fieldErrors: Record<string, number> = {};
    const emailSet = new Set<string>();
    const duplicateEmails: string[] = [];
    let validRows = 0;
    let invalidRows = 0;

    // Check for missing required headers
    const missingHeaders = this.requiredHeaders.filter(h => !this.isRequiredFieldPresent(h, headers));
    if (missingHeaders.length > 0) {
      sampleErrors.push({
        row: 0,
        message: `Missing required headers: ${missingHeaders.join(', ')}`
      });
      invalidRows = rows.length;
    }

    const rowsToProcess = Math.min(rows.length, opts.maxRowsToValidate);

    for (let i = 0; i < rowsToProcess; i++) {
      const row = rows[i];
      const rowNumber = i + 2; // +2 for header and 1-indexed
      const normalizedRow: NormalizedRow = this.normalizeRow(row);
      const rowErrors: string[] = [];

      // Validate each field according to rules
      for (const rule of this.validationRules) {
        const value = normalizedRow[rule.field as keyof NormalizedRow];
        const hasValue = value != null && String(value).trim() !== '';

        if (rule.required && !hasValue) {
          rowErrors.push(`${rule.field} is required`);
          fieldErrors[rule.field] = (fieldErrors[rule.field] || 0) + 1;
        } else if (hasValue && rule.validator && !rule.validator(value)) {
          rowErrors.push(rule.message || `Invalid ${rule.field}`);
          fieldErrors[rule.field] = (fieldErrors[rule.field] || 0) + 1;
        }
      }

      // Check for duplicate emails
      if (normalizedRow.email) {
        const emailLower = normalizedRow.email.toLowerCase().trim();
        if (!opts.allowDuplicateEmails) {
          if (emailSet.has(emailLower)) {
            rowErrors.push('Duplicate email address');
            duplicateEmails.push(normalizedRow.email);
          } else {
            emailSet.add(emailLower);
          }
        }
      }

      // Record sample errors (limit to first 10 per type)
      if (rowErrors.length > 0) {
        invalidRows++;
        for (const error of rowErrors.slice(0, 3)) { // Max 3 errors per row
          if (sampleErrors.length < 50) { // Limit total sample errors
            sampleErrors.push({
              row: rowNumber,
              message: error
            });
          }
        }
      } else {
        validRows++;
      }

      normalizedData.push(normalizedRow);
    }

    return {
      isValid: invalidRows === 0 && missingHeaders.length === 0,
      rowsProcessed: rowsToProcess,
      validRows,
      invalidRows,
      duplicateEmails: [...new Set(duplicateEmails)],
      fieldErrors,
      sampleErrors,
      requiredHeaders: this.requiredHeaders,
      missingHeaders,
      normalizedData
    };
  }

  /**
   * Normalize a raw row to standard field names
   */
  private normalizeRow(row: Record<string, unknown>): NormalizedRow {
    const normalized: NormalizedRow = {};

    // Map and clean each field
    for (const [key, value] of Object.entries(row)) {
      const cleanValue = this.cleanFieldValue(value);
      
      // Map to normalized field names
      switch (key) {
        case 'email':
          normalized.email = cleanValue;
          break;
        case 'givenName':
        case 'firstName':
          normalized.givenName = cleanValue;
          break;
        case 'familyName':
        case 'lastName':
          normalized.familyName = cleanValue;
          break;
        case 'jobTitle':
          normalized.jobTitle = cleanValue;
          break;
        case 'department':
          normalized.department = cleanValue;
          break;
        case 'location':
          normalized.location = cleanValue;
          break;
        case 'hireDate':
          normalized.hireDate = cleanValue;
          break;
        case 'managerEmail':
          normalized.managerEmail = cleanValue;
          break;
        case 'employeeId':
          normalized.employeeId = cleanValue;
          break;
        case 'phone':
          normalized.phone = cleanValue;
          break;
        case 'birthDate':
          normalized.birthDate = cleanValue;
          break;
        case 'nationality':
          normalized.nationality = cleanValue;
          break;
        case 'gender':
          normalized.gender = cleanValue;
          break;
        default:
          // Handle unmapped fields gracefully
          break;
      }
    }

    return normalized;
  }

  /**
   * Clean and normalize field values
   */
  private cleanFieldValue(value: unknown): string | undefined {
    if (value == null || value === '') {
      return undefined;
    }
    
    const str = String(value).trim();
    return str === '' ? undefined : str;
  }

  /**
   * Validate email format
   */
  private validateEmail(email: any): boolean {
    if (typeof email !== 'string') return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  private validateDate(date: any): boolean {
    if (typeof date !== 'string') return false;
    
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date.trim())) return false;
    
    // Check if it's a valid date
    const dateObj = new Date(date.trim());
    return !isNaN(dateObj.getTime()) && dateObj.toISOString().split('T')[0] === date.trim();
  }

  /**
   * Validate phone number format (basic validation)
   */
  private validatePhone(phone: any): boolean {
    if (typeof phone !== 'string') return false;
    
    // Allow various phone formats
    const phoneRegex = /^[\+]?[\d\s\-\(\)\.]+$/;
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    return phoneRegex.test(phone) && cleaned.length >= 7 && cleaned.length <= 15;
  }

  /**
   * Get validation summary
   */
  getValidationSummary(result: DataValidationResult): string {
    if (result.isValid) {
      return `✅ All ${result.rowsProcessed} rows are valid`;
    }

    const issues: string[] = [];
    if (result.missingHeaders.length > 0) {
      issues.push(`Missing required headers: ${result.missingHeaders.join(', ')}`);
    }
    if (result.invalidRows > 0) {
      issues.push(`${result.invalidRows} invalid rows`);
    }
    if (result.duplicateEmails.length > 0) {
      issues.push(`${result.duplicateEmails.length} duplicate emails`);
    }

    return `❌ Validation failed: ${issues.join(', ')}`;
  }
}