"use client";
import { useEffect, useState } from "react";
import { Search, Download, Upload, Settings, Plus, MoreVertical, User, Building2, Users, TrendingUp } from "lucide-react";
import Header from "../../../components/Header";

type Employee = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  displayName?: string;
  jobTitle?: string;
  department?: string;
  location?: string;
  status?: 'active' | 'inactive' | 'pending';
  hireDate?: string;
  lastConnected?: string;
  organizationId?: string;
};

type Department = {
  id: string;
  name: string;
};

type Location = {
  id: string;
  name: string;
};

type OrgStats = {
  totalEmployees: number;
  subscriptionLimit: number;
  departmentCount: number;
};

export default function EmployeeDirectoryPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [filteredEmployees, setFilteredEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [orgStats, setOrgStats] = useState<OrgStats>({ totalEmployees: 0, subscriptionLimit: 500, departmentCount: 0 });
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Form states for Add Employee
  const [newEmployee, setNewEmployee] = useState({
    firstName: "",
    lastName: "",
    email: "",
    tempPassword: "",
    phoneNumber: "",
    jobTitle: "",
    department: "",
    location: "",
    managerEmail: "",
    hireDate: "",
    gender: "",
    nationality: "",
    birthDate: "",
    status: "active",
    isAdmin: false
  });

  async function loadOrgId() {
    try {
      const res = await fetch("/api/bff/auth/me", { credentials: "include", headers: { Accept: "application/json" } });
      if (!res.ok) {
        // Return fallback org ID for development when auth is not available
        return "demo-org";
      }
      const me = await res.json();
      return me.organizationId || me.organization_id || me.orgId || "demo-org";
    } catch (error) {
      // Fallback for development when auth service is not available
      return "demo-org";
    }
  }

  async function fetchEmployees(id: string) {
    try {
      const res = await fetch(`/api/bff/directory/users?orgId=${id}&limit=100`, { credentials: "include" });
      if (!res.ok) {
        // Return mock data when API is not available
        return generateMockEmployeeData();
      }
      const data = await res.json();
      return data;
    } catch (error) {
      // Fallback to mock data when API is not available
      return generateMockEmployeeData();
    }
  }

  async function fetchSubscription(orgId: string) {
    try {
      const response = await fetch(`/api/bff/directory/subscription?orgId=${orgId}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch subscription from API:', error);
      return { seatsLimit: 500 }; // Fallback to default
    }
  }

  async function fetchDepartments(orgId: string) {
    try {
      const response = await fetch(`/api/bff/directory/departments?orgId=${orgId}`, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.warn('Failed to fetch departments from API, using mock data:', error);
      return await fetchMockDepartments(); // Fallback to mock data
    }
  }

  function generateMockEmployeeData() {
    // Generate realistic mock employee data for demonstration
    const mockEmployees = [
      {
        id: "1",
        email: "sarah.johnson@company.com",
        firstName: "Sarah",
        lastName: "Johnson",
        displayName: "Sarah Johnson"
      },
      {
        id: "2", 
        email: "mike.chen@company.com",
        firstName: "Mike",
        lastName: "Chen",
        displayName: "Mike Chen"
      },
      {
        id: "3",
        email: "emma.wilson@company.com", 
        firstName: "Emma",
        lastName: "Wilson",
        displayName: "Emma Wilson"
      },
      {
        id: "4",
        email: "david.brown@company.com",
        firstName: "David", 
        lastName: "Brown",
        displayName: "David Brown"
      },
      {
        id: "5",
        email: "lisa.garcia@company.com",
        firstName: "Lisa",
        lastName: "Garcia", 
        displayName: "Lisa Garcia"
      }
    ];
    return { users: mockEmployees };
  }

  async function fetchMockDepartments() {
    // Mock departments until we have real API
    return [
      { id: "hr", name: "Human Resources" },
      { id: "sales", name: "Sales" },
      { id: "marketing", name: "Marketing" },
      { id: "tech", name: "Information Technology" },
      { id: "finance", name: "Finance" },
      { id: "operations", name: "Operations" },
      { id: "legal", name: "Legal" },
      { id: "design", name: "Design" },
    ];
  }

  async function fetchMockLocations() {
    // Mock locations until we have real API  
    return [
      { id: "ny", name: "New York" },
      { id: "dubai", name: "Dubai" },
      { id: "london", name: "London" },
      { id: "paris", name: "Paris" },
      { id: "singapore", name: "Singapore" },
    ];
  }

  // Transform basic user data to employee data with mock additional fields
  function transformToEmployee(user: any): Employee {
    const mockJobTitles = ["Software Engineer", "Product Manager", "Designer", "Sales Manager", "HR Specialist", "Marketing Coordinator", "Finance Analyst", "Operations Manager"];
    const mockStatuses = ["active", "active", "active", "active", "pending", "inactive"] as const;
    
    // Use email hash to consistently assign mock data
    const emailHash = user.email ? user.email.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a; }, 0) : 0;
    
    return {
      ...user,
      jobTitle: mockJobTitles[Math.abs(emailHash) % mockJobTitles.length],
      department: departments[Math.abs(emailHash) % departments.length]?.name || "Information Technology",
      location: locations[Math.abs(emailHash) % locations.length]?.name || "New York", 
      status: mockStatuses[Math.abs(emailHash) % mockStatuses.length],
      hireDate: new Date(2020 + (Math.abs(emailHash) % 5), Math.abs(emailHash) % 12, 1).toISOString().split('T')[0],
      lastConnected: `${Math.abs(emailHash) % 30} days ago`
    };
  }

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const id = await loadOrgId();
        if (!id) throw new Error("No organizationId found on current user.");
        setOrgId(id);
        
        const [employeesData, departmentsData, locationsData, subscriptionData] = await Promise.all([
          fetchEmployees(id),
          fetchDepartments(id),
          fetchMockLocations(),
          fetchSubscription(id)
        ]);
        
        setDepartments(departmentsData);
        setLocations(locationsData);
        
        const users = Array.isArray(employeesData?.users) ? employeesData.users : [];
        const transformedEmployees = users.map(transformToEmployee);
        setEmployees(transformedEmployees);
        
        // Calculate stats
        const activeEmployees = transformedEmployees.filter(u => u.status !== 'inactive').length;
        setOrgStats({
          totalEmployees: activeEmployees,
          subscriptionLimit: subscriptionData?.seatsLimit || 500, // Real subscription limit
          departmentCount: departmentsData.length
        });
        
        setError(null);
      } catch (e: any) {
        setError(e?.message || "Failed to load directory.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter employees based on search and filters
  useEffect(() => {
    let filtered = employees.filter(employee => {
      const matchesSearch = searchQuery === "" || 
        employee.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.jobTitle?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesDepartment = selectedDepartment === "" || employee.department === selectedDepartment;
      const matchesStatus = selectedStatus === "" || employee.status === selectedStatus;
      const matchesLocation = selectedLocation === "" || employee.location === selectedLocation;
      
      return matchesSearch && matchesDepartment && matchesStatus && matchesLocation;
    });
    
    setFilteredEmployees(filtered);
  }, [employees, searchQuery, selectedDepartment, selectedStatus, selectedLocation]);

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800 border-green-200';
      case 'pending': return 'bg-orange-100 text-orange-800 border-orange-200';  
      case 'inactive': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const handleAddEmployee = async () => {
    try {
      // API call to create employee would go here
      console.log('Creating employee:', newEmployee);
      setShowAddEmployee(false);
      // Reset form
      setNewEmployee({
        firstName: "", lastName: "", email: "", tempPassword: "", phoneNumber: "",
        jobTitle: "", department: "", location: "", managerEmail: "", hireDate: "",
        gender: "", nationality: "", birthDate: "", status: "active", isAdmin: false
      });
      // Refresh employee list
      // await refetchEmployees();
    } catch (error) {
      console.error('Failed to create employee:', error);
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Email', 'Job Title', 'Department', 'Location', 'Status', 'Hire Date', 'Last Connected'],
      ...filteredEmployees.map(emp => [
        emp.displayName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim(),
        emp.email,
        emp.jobTitle || '',
        emp.department || '',
        emp.location || '',
        emp.status || '',
        emp.hireDate || '',
        emp.lastConnected || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employees.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (loading && employees.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading employee directory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-gray-900">Employee Directory</h1>
            <p className="text-gray-600">Manage your team members and their information</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={exportToCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Download className="w-4 h-4" />
              Export
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
              <Upload className="w-4 h-4" />
              Mass Upload
            </button>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors opacity-50 cursor-not-allowed">
              <Settings className="w-4 h-4" />
              Manage Departments
            </button>
            <button 
              onClick={() => setShowAddEmployee(true)}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Team Members</p>
                <p className="text-3xl font-semibold text-gray-900">{orgStats.totalEmployees}</p>
                <p className="text-xs text-gray-500">Not active & pending are hidden</p>
              </div>
              <div className="w-12 h-12 bg-emerald-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-emerald-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subscription Usage</p>
                <p className="text-3xl font-semibold text-gray-900">{orgStats.totalEmployees}/{orgStats.subscriptionLimit}</p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min((orgStats.totalEmployees / orgStats.subscriptionLimit) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Departments</p>
                <p className="text-3xl font-semibold text-gray-900">{orgStats.departmentCount}</p>
                <p className="text-xs text-gray-500">Try to have minimum</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Building2 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Search & Filter */}
        <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200/60 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-gray-900">Search & Filter</h3>
            <p className="text-sm text-gray-500">Find specific employees or filter by criteria</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="relative">
              <Search className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search employees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all"
              />
            </div>

            <select 
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.name}>{dept.name}</option>
              ))}
            </select>

            <select 
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="inactive">Inactive</option>
            </select>

            <select 
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
              className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white transition-all"
            >
              <option value="">All Locations</option>
              {locations.map(loc => (
                <option key={loc.id} value={loc.name}>{loc.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Employee List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200/60">
          <div className="px-6 py-4 border-b border-gray-200/60">
            <h3 className="font-medium text-gray-900">Employee List ({filteredEmployees.length})</h3>
          </div>

          {error && (
            <div className="m-6 rounded-lg border border-red-300 bg-red-50 p-3">
              <div className="font-semibold mb-1 text-red-800">Error</div>
              <div className="text-sm text-red-700">{error}</div>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200/60">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Job Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hire Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Last Connected</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200/60">
                {filteredEmployees.map((employee) => {
                  const name = employee.displayName || [employee.firstName, employee.lastName].filter(Boolean).join(" ") || "—";
                  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  
                  return (
                    <tr key={employee.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-emerald-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {initials || <User className="w-5 h-5" />}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{name}</div>
                            <div className="text-sm text-gray-500">{employee.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.jobTitle || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.department || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.location || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full border ${getStatusBadgeColor(employee.status || 'active')}`}>
                          {(employee.status || 'active').charAt(0).toUpperCase() + (employee.status || 'active').slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.hireDate || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{employee.lastConnected || "—"}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="relative">
                          <button 
                            onClick={() => setShowActionMenu(showActionMenu === employee.id ? null : employee.id)}
                            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                          >
                            <MoreVertical className="w-4 h-4 text-gray-500" />
                          </button>
                          
                          {showActionMenu === employee.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200/60 py-1 z-10">
                              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                                <User className="w-4 h-4" />
                                View Profile
                              </button>
                              <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left">
                                <Settings className="w-4 h-4" />
                                Edit Employee
                              </button>
                              <button className="flex items-center gap-2 px-4 py-2 text-sm text-red-700 hover:bg-red-50 w-full text-left">
                                <span className="w-4 h-4 flex items-center justify-center text-red-500">✕</span>
                                Delete Employee
                              </button>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredEmployees.length === 0 && !loading && (
              <div className="text-center py-12">
                <User className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg font-medium">No employees found</p>
                <p className="text-sm text-gray-400">Try adjusting your search or filters</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Employee Modal */}
      {showAddEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full h-fit">
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Create New Employee</h3>
              </div>
              <button 
                onClick={() => setShowAddEmployee(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5">
              {/* Basic Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter first name"
                      value={newEmployee.firstName}
                      onChange={(e) => setNewEmployee({...newEmployee, firstName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Enter last name"
                      value={newEmployee.lastName}
                      onChange={(e) => setNewEmployee({...newEmployee, lastName: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={newEmployee.email}
                    onChange={(e) => setNewEmployee({...newEmployee, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>

                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Temporary Password <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    placeholder="Enter temporary password"
                    value={newEmployee.tempPassword}
                    onChange={(e) => setNewEmployee({...newEmployee, tempPassword: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Employee will be prompted to change password on first login</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    placeholder="Enter phone number"
                    value={newEmployee.phoneNumber}
                    onChange={(e) => setNewEmployee({...newEmployee, phoneNumber: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Work Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Work Information</h4>
                
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Job Title
                    </label>
                    <input
                      type="text"
                      placeholder="Enter job title"
                      value={newEmployee.jobTitle}
                      onChange={(e) => setNewEmployee({...newEmployee, jobTitle: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Department
                    </label>
                    <select
                      value={newEmployee.department}
                      onChange={(e) => setNewEmployee({...newEmployee, department: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="">Select department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.name}>{dept.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location
                    </label>
                    <select
                      value={newEmployee.location}
                      onChange={(e) => setNewEmployee({...newEmployee, location: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="">Select location</option>
                      {locations.map(loc => (
                        <option key={loc.id} value={loc.name}>{loc.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Manager Email
                    </label>
                    <input
                      type="email"
                      placeholder="Enter manager's email"
                      value={newEmployee.managerEmail}
                      onChange={(e) => setNewEmployee({...newEmployee, managerEmail: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hire Date
                  </label>
                  <input
                    type="date"
                    placeholder="dd/mm/yyyy"
                    value={newEmployee.hireDate}
                    onChange={(e) => setNewEmployee({...newEmployee, hireDate: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Personal Information */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Personal Information</h4>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Gender
                    </label>
                    <select
                      value={newEmployee.gender}
                      onChange={(e) => setNewEmployee({...newEmployee, gender: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                    >
                      <option value="">Select gender</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nationality
                    </label>
                    <input
                      type="text"
                      placeholder="Enter nationality"
                      value={newEmployee.nationality}
                      onChange={(e) => setNewEmployee({...newEmployee, nationality: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Birth Date
                    </label>
                    <input
                      type="date"
                      placeholder="dd/mm/yyyy"
                      value={newEmployee.birthDate}
                      onChange={(e) => setNewEmployee({...newEmployee, birthDate: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>

              {/* Access & Permissions */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Access & Permissions</h4>
                
                <div className="mb-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={newEmployee.status}
                    onChange={(e) => setNewEmployee({...newEmployee, status: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 bg-white"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>

                <div className="flex items-center mb-3">
                  <input
                    type="checkbox"
                    id="adminPrivileges"
                    checked={newEmployee.isAdmin}
                    onChange={(e) => setNewEmployee({...newEmployee, isAdmin: e.target.checked})}
                    className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-gray-300 rounded"
                  />
                  <label htmlFor="adminPrivileges" className="ml-2 block text-sm text-gray-900">
                    Grant administrator privileges
                  </label>
                </div>
                
                <div className="text-sm">
                  <p className="font-medium text-gray-900">Generated Username</p>
                  <p className="text-xs text-gray-500">Username will be generated based on name and email</p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button 
                onClick={() => setShowAddEmployee(false)}
                className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 transition-colors text-gray-700"
              >
                Cancel
              </button>
              <button 
                onClick={handleAddEmployee}
                className="px-4 py-2 text-sm bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition-colors"
              >
                Create Employee
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Click outside to close action menu */}
      {showActionMenu && (
        <div 
          className="fixed inset-0 z-10" 
          onClick={() => setShowActionMenu(null)}
        />
      )}
    </div>
  );
}