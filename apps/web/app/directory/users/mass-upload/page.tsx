"use client";
import { useEffect, useState, useRef } from "react";
import { ChevronLeft, Download, Upload, X, AlertCircle, CheckCircle, Clock, FileText, Users } from "lucide-react";
import Header from "../../../../components/Header";
import { useRouter } from "next/navigation";
import * as XLSX from 'xlsx';

type Employee = {
  name: string;
  surname: string;
  email: string;
  department: string;
  job_title: string;
  location?: string;
  phone_number?: string;
  manager_email?: string;
  hire_date?: string;
  birth_date?: string;
  nationality?: string;
  sex?: string;
};

type UploadResult = {
  rows: number;
  valid: number;
  invalid: number;
  preview: Employee[];
  sampleErrors: { row: number; message: string }[];
};

type PreviewData = {
  statistics: {
    newEmployees: number;
    willBeUpdated: number;
    newDepartments: number;
  };
  employees: {
    email: string;
    name: string;
    action: 'create' | 'update';
    changes?: string[];
  }[];
};

export default function MassUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  useEffect(() => {
    // Load orgId from auth
    loadOrgId();
  }, []);

  async function loadOrgId() {
    try {
      const res = await fetch("/api/bff/auth/me", { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error('Authentication required');
      const me = await res.json();
      setOrgId(me.organizationId || me.organization_id || me.orgId);
    } catch (error) {
      console.error('Failed to load user info:', error);
    }
  }

  const downloadTemplate = (format: 'csv' | 'excel') => {
    const templateData = [
      {
        name: 'John',
        surname: 'Doe',
        email: 'john.doe@company.com',
        department: 'Engineering',
        job_title: 'Senior Developer',
        location: 'New York',
        phone_number: '+1234567890',
        manager_email: 'manager@company.com',
        hire_date: '2024-01-15',
        birth_date: '1990-05-20',
        nationality: 'American',
        sex: 'Male'
      }
    ];

    if (format === 'csv') {
      const headers = Object.keys(templateData[0]).join(',');
      const csvContent = headers + '\n' + templateData.map(row => 
        Object.values(row).map(value => `"${value}"`).join(',')
      ).join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'employee-template.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      const ws = XLSX.utils.json_to_sheet(templateData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Employees');
      XLSX.writeFile(wb, 'employee-template.xlsx');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    processFile(file);
  };

  const processFile = async (file: File) => {
    try {
      setIsProcessing(true);
      
      let csvContent: string;
      
      if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
        // Parse Excel file
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(new Uint8Array(arrayBuffer), { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        csvContent = XLSX.utils.sheet_to_csv(worksheet);
      } else {
        // Parse CSV file
        csvContent = await file.text();
      }

      // Create import session
      const sessionResponse = await fetch('/api/bff/directory/import/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ csv: csvContent })
      });

      if (!sessionResponse.ok) {
        throw new Error('Failed to create import session');
      }

      const sessionResult = await sessionResponse.json();
      setSessionToken(sessionResult.token);
      
      // Get preview data
      const previewResponse = await fetch(`/api/bff/directory/import/session/preview?token=${sessionResult.token}`, {
        credentials: 'include'
      });

      if (!previewResponse.ok) {
        throw new Error('Failed to get preview data');
      }

      const preview = await previewResponse.json();
      
      // Transform the preview data to match our UI expectations
      const transformedPreview: PreviewData = {
        statistics: {
          newEmployees: preview.plan?.creates || 0,
          willBeUpdated: preview.plan?.updates || 0,
          newDepartments: preview.plan?.newDepartments?.length || 0
        },
        employees: preview.plan?.records?.slice(0, 10).map((record: any) => ({
          email: record.incoming?.email || '',
          name: `${record.incoming?.givenName || ''} ${record.incoming?.familyName || ''}`.trim(),
          action: record.action === 'create' ? 'create' : 'update',
          changes: record.action === 'update' && record.changes ? 
            record.changes.map((c: any) => `${c.field}: ${c.from} → ${c.to}`) : []
        })) || []
      };
      
      setPreviewData(transformedPreview);
      setUploadResult({
        rows: preview.plan?.records?.length || 0,
        valid: (preview.plan?.creates || 0) + (preview.plan?.updates || 0),
        invalid: preview.plan?.invalid || 0,
        preview: [],
        sampleErrors: preview.plan?.sampleErrors || []
      });
      setShowPreview(true);
      
    } catch (error) {
      console.error('Error processing file:', error);
      alert('Error processing file: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handlePreviewClose = () => {
    setShowPreview(false);
  };

  const handleProcess = async () => {
    if (!sessionToken) return;
    
    try {
      setIsProcessing(true);
      
      const response = await fetch('/api/bff/directory/import/session/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: sessionToken })
      });

      if (!response.ok) {
        throw new Error('Failed to process import');
      }

      const result = await response.json();
      
      alert(`Import completed successfully!\n\nCreated: ${result.createdUsers || 0} employees\nUpdated: ${result.updatedUsers || 0} employees\nErrors: ${result.errors || 0}`);
      
      // Reset form and redirect back to users page
      setSelectedFile(null);
      setUploadResult(null);
      setShowPreview(false);
      setSessionToken(null);
      router.push('/directory/users');
      
    } catch (error) {
      console.error('Error processing import:', error);
      alert('Error processing import: ' + (error as Error).message);
    } finally {
      setIsProcessing(false);
    }
  };

  const requiredFields = [
    "name (employee's first name)",
    "email (unique email address)", 
    "department (existing or new department)",
    "job_title (employee's role)"
  ];

  const optionalFields = [
    "surname (last name)",
    "location (office location)",
    "phone_number (contact number)",
    "manager_email (direct supervisor's email)",
    "hire_date (YYYY-MM-DD format)",
    "birth_date (YYYY-MM-DD format)",
    "nationality (employee's nationality)",
    "sex (Male/Female/Other)"
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <div className="max-w-4xl mx-auto p-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-6">
          <button 
            onClick={() => router.push('/directory/users')}
            className="flex items-center gap-1 hover:text-gray-800"
          >
            <ChevronLeft className="w-4 h-4" />
            Employee Directory
          </button>
          <span>/</span>
          <span className="text-gray-800">Mass Upload</span>
        </div>

        {/* Page Title */}
        <h1 className="text-2xl font-bold text-gray-900 mb-8">Mass Employee Upload</h1>

        {/* Upload Instructions */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Instructions</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                Required Fields
              </h3>
              <ul className="space-y-2">
                {requiredFields.map((field, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
                Optional Fields
              </h3>
              <ul className="space-y-2">
                {optionalFields.map((field, index) => (
                  <li key={index} className="text-sm text-gray-600 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {field}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Download Template */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Download Template</h2>
          <p className="text-gray-600 mb-4">Download a template file with the correct column headers and sample data.</p>
          
          <div className="flex gap-3">
            <button
              onClick={() => downloadTemplate('csv')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download CSV Template
            </button>
            <button
              onClick={() => downloadTemplate('excel')}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <Download className="w-4 h-4" />
              Download Excel Template
            </button>
          </div>
        </div>

        {/* File Upload */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Employee File</h2>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
            {!selectedFile ? (
              <>
                <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 mb-4">Choose a CSV or Excel file to upload</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Choose File
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <p className="text-sm text-gray-500 mt-2">Supported formats: CSV, Excel (.xlsx, .xls)</p>
              </>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-8 h-8 text-blue-600" />
                  <div>
                    <p className="font-medium text-gray-900">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500">{(selectedFile.size / 1024).toFixed(1)} KB</p>
                  </div>
                </div>
                
                {isProcessing ? (
                  <div className="flex items-center justify-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Processing file...
                  </div>
                ) : uploadResult ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-center gap-4 text-sm">
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        Valid: {uploadResult.valid}
                      </span>
                      {uploadResult.invalid > 0 && (
                        <span className="flex items-center gap-1 text-red-600">
                          <AlertCircle className="w-4 h-4" />
                          Invalid: {uploadResult.invalid}
                        </span>
                      )}
                    </div>
                    
                    {uploadResult.valid > 0 && (
                      <button
                        onClick={() => setShowPreview(true)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        Preview Changes
                      </button>
                    )}
                  </div>
                ) : null}
                
                <button
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadResult(null);
                    setPreviewData(null);
                    setSessionToken(null);
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Choose different file
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-900">Preview Changes</h2>
              <button
                onClick={handlePreviewClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            {/* Statistics */}
            <div className="p-6 border-b bg-gray-50">
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{previewData.statistics.newEmployees}</div>
                  <div className="text-sm text-gray-600">New Employees</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{previewData.statistics.willBeUpdated}</div>
                  <div className="text-sm text-gray-600">Will be Updated</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{previewData.statistics.newDepartments}</div>
                  <div className="text-sm text-gray-600">New Departments</div>
                </div>
              </div>
            </div>
            
            {/* Employee List */}
            <div className="p-6 max-h-96 overflow-y-auto">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Employee Changes Preview
              </h3>
              
              <div className="space-y-3">
                {previewData.employees.map((employee, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <span className="font-medium text-gray-900">{employee.name}</span>
                        <span className="text-sm text-gray-600 ml-2">({employee.email})</span>
                      </div>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        employee.action === 'create' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {employee.action === 'create' ? 'New' : 'Update'}
                      </span>
                    </div>
                    
                    {employee.changes && employee.changes.length > 0 && (
                      <div className="text-sm text-gray-600">
                        <strong>Changes:</strong> {employee.changes.join(', ')}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            
            {/* Footer */}
            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
              <button
                onClick={handlePreviewClose}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                disabled={isProcessing}
              >
                Cancel
              </button>
              <button
                onClick={handleProcess}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Processing...
                  </>
                ) : (
                  'Process Import'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}