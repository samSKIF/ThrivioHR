"use client";
import React, { useState, useEffect } from "react";
import { ArrowLeft, Plus, Upload, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import Header from "../../../components/Header";

interface Department {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  status: string;
}

const PREDEFINED_COLORS = [
  '#374151', // Gray
  '#EF4444', // Red  
  '#F97316', // Orange
  '#22D3EE', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#10B981', // Emerald
  '#EAB308', // Yellow
  '#84CC16'  // Lime
];

export default function DepartmentManagementPage() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<Department | null>(null);
  const [deletingDepartment, setDeletingDepartment] = useState<Department | null>(null);
  const [showActionMenu, setShowActionMenu] = useState<string | null>(null);
  
  // Form states
  const [departmentName, setDepartmentName] = useState("");
  const [selectedColor, setSelectedColor] = useState(PREDEFINED_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [nameError, setNameError] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const orgId = await loadOrgId();
      setOrgId(orgId);
      await loadDepartments(orgId);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Authentication required. Please log in to continue.');
    } finally {
      setLoading(false);
    }
  }

  async function loadOrgId() {
    const res = await fetch("/api/bff/auth/me", { credentials: "include" });
    if (!res.ok) {
      throw new Error('Authentication required');
    }
    const me = await res.json();
    return me.organizationId || me.organization_id || me.orgId;
  }

  async function loadDepartments(orgId: string) {
    const res = await fetch(`/api/bff/directory/departments?orgId=${orgId}`, { 
      credentials: "include" 
    });
    if (!res.ok) {
      throw new Error('Failed to load departments');
    }
    const data = await res.json();
    setDepartments(data);
  }

  const checkDuplicateName = (name: string, excludeId?: string) => {
    const trimmedName = name.trim().toLowerCase();
    return departments.some(dept => 
      dept.name.toLowerCase() === trimmedName && 
      (!excludeId || dept.id !== excludeId)
    );
  };

  const handleCreateDepartment = async () => {
    if (!departmentName.trim() || !orgId) return;
    
    // Check for duplicate names
    if (checkDuplicateName(departmentName)) {
      setNameError("A department with this name already exists. Please choose a different name.");
      return;
    }
    
    setIsSubmitting(true);
    setNameError("");
    
    try {
      const res = await fetch('/api/bff/directory/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: departmentName.trim(),
          color: selectedColor
        })
      });

      if (res.ok) {
        await loadDepartments(orgId);
        setShowCreateModal(false);
        setDepartmentName("");
        setSelectedColor(PREDEFINED_COLORS[0]);
      } else {
        const errorText = await res.text();
        console.error('Failed to create department:', errorText);
        alert('Failed to create department. Please try again.');
      }
    } catch (error) {
      console.error('Error creating department:', error);
      alert('Error creating department. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditDepartment = async () => {
    if (!departmentName.trim() || !editingDepartment || !orgId) return;
    
    // Check for duplicate names (excluding current department)
    if (checkDuplicateName(departmentName, editingDepartment.id)) {
      setNameError("A department with this name already exists. Please choose a different name.");
      return;
    }
    
    setIsSubmitting(true);
    setNameError("");
    
    try {
      const res = await fetch(`/api/bff/directory/departments/${editingDepartment.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: departmentName.trim(),
          color: selectedColor
        })
      });

      if (res.ok) {
        await loadDepartments(orgId);
        setShowEditModal(false);
        setEditingDepartment(null);
        setDepartmentName("");
        setSelectedColor(PREDEFINED_COLORS[0]);
      } else {
        const errorText = await res.text();
        console.error('Failed to update department:', errorText);
        alert('Failed to update department. Please try again.');
      }
    } catch (error) {
      console.error('Error updating department:', error);
      alert('Error updating department. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const openDeleteModal = (department: Department) => {
    setDeletingDepartment(department);
    setShowDeleteModal(true);
    setShowActionMenu(null);
  };

  const handleDeleteDepartment = async () => {
    if (!deletingDepartment || !orgId) return;
    
    try {
      const res = await fetch(`/api/bff/directory/departments/${deletingDepartment.id}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (res.ok) {
        await loadDepartments(orgId);
        setShowDeleteModal(false);
        setDeletingDepartment(null);
      } else {
        const error = await res.text();
        alert(error || 'Failed to delete department');
      }
    } catch (error) {
      console.error('Error deleting department:', error);
      alert('Failed to delete department');
    }
  };

  const openEditModal = (department: Department) => {
    setEditingDepartment(department);
    setDepartmentName(department.name);
    setSelectedColor(department.color);
    setNameError("");
    setShowEditModal(true);
    setShowActionMenu(null);
  };

  const openCreateModal = () => {
    setDepartmentName("");
    setSelectedColor(PREDEFINED_COLORS[0]);
    setNameError("");
    setShowCreateModal(true);
  };

  const totalDepartments = departments.length;
  const activeDepartments = departments.filter(d => d.status === 'Active').length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">Loading...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              onClick={() => window.location.href = '/login'}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            <span>Employee Directory</span>
            <span>{'>'}</span>
            <span className="text-gray-800">Department Management</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => window.location.href = '/directory/users'}
                className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>Back to Employees</span>
              </button>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Department Management</h1>
                <p className="text-gray-600">Organize your workforce by departments and manage organizational structure</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                <Upload className="w-4 h-4" />
                Mass Upload
              </button>
              <button 
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <Plus className="w-4 h-4" />
                Create Department
              </button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Departments</p>
                  <p className="text-2xl font-bold text-gray-900">{totalDepartments}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Employees</p>
                  <p className="text-2xl font-bold text-gray-900">{totalEmployees}</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-6 rounded-lg border border-gray-200">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Active Departments</p>
                  <p className="text-2xl font-bold text-gray-900">{activeDepartments}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Department Content */}
          {departments.length === 0 ? (
            /* Empty State */
            <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No Departments Yet</h3>
              <p className="text-gray-500 mb-6">Start organizing your company by creating your first department</p>
              <button 
                onClick={openCreateModal}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 mx-auto"
              >
                <Plus className="w-4 h-4" />
                Create Your First Department
              </button>
            </div>
          ) : (
            /* Department List */
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Departments</h2>
                <p className="text-sm text-gray-500">Manage and organize your company departments</p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Manager</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employees</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {departments.map((department) => (
                      <tr key={department.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: department.color }}
                            ></div>
                            <span className="text-sm font-medium text-gray-900">{department.name}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          No manager assigned
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-white">
                            {department.memberCount} employees
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="relative">
                            <button 
                              onClick={() => setShowActionMenu(showActionMenu === department.id ? null : department.id)}
                              className="text-gray-400 hover:text-gray-600"
                            >
                              <MoreHorizontal className="w-5 h-5" />
                            </button>
                            
                            {showActionMenu === department.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-10" 
                                  onClick={() => setShowActionMenu(null)}
                                ></div>
                                <div className="absolute right-0 top-8 w-40 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                                  <button 
                                    onClick={() => openEditModal(department)}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                                  >
                                    <Edit className="w-4 h-4 text-gray-500" />
                                    <span>Edit</span>
                                  </button>
                                  <button 
                                    onClick={() => openDeleteModal(department)}
                                    className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                                  >
                                    <Trash2 className="w-4 h-4 text-red-500" />
                                    <span>Delete</span>
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Department Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Create New Department</h3>
              <button 
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Add a new department to your organization structure</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Marketing"
                    value={departmentName}
                    onChange={(e) => {
                      setDepartmentName(e.target.value);
                      setNameError("");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateDepartment}
                disabled={!departmentName.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Creating...' : 'Create Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditModal && editingDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">Edit Department</h3>
              <button 
                onClick={() => setShowEditModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-4">Update department information</p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Department Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={departmentName}
                    onChange={(e) => {
                      setDepartmentName(e.target.value);
                      setNameError("");
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                  />
                  {nameError && <p className="text-red-500 text-xs mt-1">{nameError}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {PREDEFINED_COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${
                          selectedColor === color ? 'border-gray-400' : 'border-gray-200'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => setShowEditModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleEditDepartment}
                disabled={!departmentName.trim() || isSubmitting}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Updating...' : 'Update Department'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Department Modal */}
      {showDeleteModal && deletingDepartment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Delete Department</h3>
            </div>
            
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-base font-medium text-gray-900 mb-2">
                    Are you sure you want to delete "{deletingDepartment.name}"?
                  </h4>
                  <div className="text-sm text-gray-600 space-y-2">
                    <p>This action cannot be undone. Once deleted:</p>
                    <ul className="list-disc list-inside space-y-1 text-sm text-gray-500">
                      <li><strong>{deletingDepartment.memberCount} employees</strong> will have no department assigned</li>
                      <li>All department-related data and history will be permanently removed</li>
                      <li>Any reports or analytics tied to this department will be affected</li>
                    </ul>
                  </div>
                  
                  {deletingDepartment.memberCount > 0 && (
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-md">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.96-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <span className="text-sm font-medium text-amber-800">Warning</span>
                      </div>
                      <p className="text-sm text-amber-700 mt-1">
                        {deletingDepartment.memberCount} team member{deletingDepartment.memberCount !== 1 ? 's' : ''} will need to be reassigned to other departments.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-lg flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteModal(false);
                  setDeletingDepartment(null);
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteDepartment}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
              >
                Delete Department
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}