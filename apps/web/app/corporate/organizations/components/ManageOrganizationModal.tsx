'use client';

import { useState, useEffect } from 'react';
import DynamicNoSSR from '../../../../components/DynamicNoSSR';
import ModalSkeleton from '../../../../components/skeletons/ModalSkeleton';

interface Organization {
  id: string;
  name: string;
  status: string;
  domain: string;
  websiteUrl: string;
  userCount: number;
  createdAt: string;
  subscription: any;
  settings?: {
    industry?: string;
    contactName?: string;
    contactEmail?: string;
    contactPhone?: string;
    address?: {
      street?: string;
      country?: string;
      state?: string;
      city?: string;
      zipCode?: string;
    };
  };
  superuserEmail?: string;
}

interface ManageOrganizationModalProps {
  organization: Organization | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ManageOrganizationModal({ 
  organization, 
  isOpen, 
  onClose, 
  onUpdate 
}: ManageOrganizationModalProps) {
  const [activeTab, setActiveTab] = useState('details');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Organization Details Form State
  const [orgForm, setOrgForm] = useState({
    organizationName: '',
    status: 'active',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
    superuserEmail: '',
    businessActivity: '',
    streetAddress: '',
    country: '',
    stateRegion: '',
    city: '',
    zipPostalCode: ''
  });

  // Subscription Form State
  const [subForm, setSubForm] = useState({
    paymentDate: new Date().toISOString().split('T')[0],
    subscriptionPeriod: 'quarter',
    subscribedUsers: 50,
    pricePerUser: 10,
    totalMonthlyAmount: 500
  });

  // Wallet Form State
  const [walletForm, setWalletForm] = useState({
    amount: 100,
    description: 'Monthly credit allocation'
  });

  // Remove the isMounted pattern - using DynamicNoSSR instead

  // Load organization data when modal opens
  useEffect(() => {
    if (organization && isOpen) {
      // Extract settings data if available
      const settings = organization.settings || {};
      const address = settings.address || {};
      
      setOrgForm({
        organizationName: organization.name,
        status: organization.status,
        contactName: settings.contactName || '',
        contactEmail: settings.contactEmail || '',
        contactPhone: settings.contactPhone || '',
        superuserEmail: organization.superuserEmail || '',
        businessActivity: settings.industry || '',
        streetAddress: address.street || '',
        country: address.country || '',
        stateRegion: address.state || '',
        city: address.city || '',
        zipPostalCode: address.zipCode || ''
      });
      setError('');
      setSuccess('');
    }
  }, [organization, isOpen]);

  // Calculate total monthly amount
  useEffect(() => {
    setSubForm(prev => ({
      ...prev,
      totalMonthlyAmount: prev.subscribedUsers * prev.pricePerUser
    }));
  }, [subForm.subscribedUsers, subForm.pricePerUser]);

  const handleOrgFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setOrgForm(prev => ({ ...prev, [name]: value }));
  };

  const handleSubFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSubForm(prev => ({ ...prev, [name]: name.includes('Users') || name.includes('Price') ? parseInt(value) || 0 : value }));
  };

  const handleWalletFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setWalletForm(prev => ({ ...prev, [name]: name === 'amount' ? parseFloat(value) || 0 : value }));
  };

  const handleUpdateOrganization = async () => {
    if (!organization) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/corporate/organizations/${organization.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgForm),
      });

      if (!response.ok) {
        throw new Error('Failed to update organization');
      }

      setSuccess('Organization updated successfully!');
      onUpdate();
      
      setTimeout(() => {
        setSuccess('');
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Failed to update organization');
    } finally {
      setLoading(false);
    }
  };

  const handleResetAdminPassword = async () => {
    if (!organization) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/corporate/organizations/${organization.id}/reset-admin-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error('Failed to reset admin password');
      }

      const result = await response.json();
      setSuccess(`New admin password: ${result.tempPassword}`);

    } catch (err: any) {
      setError(err.message || 'Failed to reset admin password');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubscription = async () => {
    if (!organization) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/corporate/organizations/${organization.id}/subscription`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subForm),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription');
      }

      setSuccess('Subscription created successfully!');
      onUpdate();

    } catch (err: any) {
      setError(err.message || 'Failed to create subscription');
    } finally {
      setLoading(false);
    }
  };

  const handleCreditWallet = async () => {
    if (!organization) return;
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`/api/corporate/organizations/${organization.id}/wallet/credit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(walletForm),
      });

      if (!response.ok) {
        throw new Error('Failed to credit wallet');
      }

      setSuccess(`Wallet credited with $${walletForm.amount}!`);
      
    } catch (err: any) {
      setError(err.message || 'Failed to credit wallet');
    } finally {
      setLoading(false);
    }
  };

  // Don't render if modal is not open or no organization selected
  if (!isOpen || !organization) return null;

  const modalContent = (
    <div 
      className="fixed inset-0"
      style={{ 
        zIndex: 999999, 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        right: 0, 
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    >
      <div 
        className="bg-white rounded-lg shadow-2xl"
        style={{ 
          width: '90%',
          maxWidth: '1024px',
          maxHeight: '90vh',
          overflowY: 'auto',
          margin: '0 auto'
        }}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Manage {organization.name}</h2>
            <p className="text-gray-600 text-sm mt-1">Complete organization management for {organization.name}</p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'details', label: 'Organization Details' },
              { id: 'admin', label: 'Admin Access' },
              { id: 'subscription', label: 'Subscription' },
              { id: 'wallet', label: 'Wallet' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Success/Error Messages */}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-800">{success}</p>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Organization Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Organization Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="organizationName"
                    value={orgForm.organizationName}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                  <select
                    name="status"
                    value={orgForm.status}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Contact Information</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="contactName"
                    value={orgForm.contactName}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="contactEmail"
                    value={orgForm.contactEmail}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                  <input
                    type="tel"
                    name="contactPhone"
                    value={orgForm.contactPhone}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Superuser Email <span className="text-red-500">*</span></label>
                  <input
                    type="email"
                    name="superuserEmail"
                    value={orgForm.superuserEmail}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Business Activity <span className="text-red-500">*</span></label>
                <select
                  name="businessActivity"
                  value={orgForm.businessActivity}
                  onChange={handleOrgFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select business activity</option>
                  <option value="technology">Technology</option>
                  <option value="healthcare">Healthcare</option>
                  <option value="finance">Finance</option>
                  <option value="manufacturing">Manufacturing</option>
                  <option value="retail">Retail</option>
                  <option value="education">Education</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <h3 className="text-lg font-semibold text-gray-900 border-b border-gray-200 pb-2">Address Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Street Address</label>
                <input
                  type="text"
                  name="streetAddress"
                  value={orgForm.streetAddress}
                  onChange={handleOrgFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Country <span className="text-red-500">*</span></label>
                  <select
                    name="country"
                    value={orgForm.country}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select country</option>
                    <option value="US">United States</option>
                    <option value="CA">Canada</option>
                    <option value="GB">United Kingdom</option>
                    <option value="DE">Germany</option>
                    <option value="FR">France</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">City</label>
                  <input
                    type="text"
                    name="city"
                    value={orgForm.city}
                    onChange={handleOrgFormChange}
                    placeholder="Enter city"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">State/Region</label>
                  <input
                    type="text"
                    name="stateRegion"
                    value={orgForm.stateRegion}
                    onChange={handleOrgFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">ZIP/Postal Code</label>
                  <input
                    type="text"
                    name="zipPostalCode"
                    value={orgForm.zipPostalCode}
                    onChange={handleOrgFormChange}
                    placeholder="e.g. 0000, 12345"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div className="pt-4">
                <button
                  onClick={handleUpdateOrganization}
                  disabled={loading}
                  className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Updating...' : 'Update Organization'}
                </button>
              </div>
            </div>
          )}

          {/* Admin Access Tab */}
          {activeTab === 'admin' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Admin Password Management</h3>
                <p className="text-gray-600 mb-6">Reset the admin password for {organization.name}</p>
                
                <div className="bg-red-50 border border-red-200 rounded-lg p-6">
                  <button
                    onClick={handleResetAdminPassword}
                    disabled={loading}
                    className="bg-red-500 text-white px-6 py-2 rounded hover:bg-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {loading ? 'Resetting...' : 'Reset Admin Password'}
                  </button>
                  <p className="text-red-700 text-sm mt-3">
                    This will generate a new random password and display it once. Make sure to save it securely.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Subscription Tab */}
          {activeTab === 'subscription' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Create Subscription</h3>
              
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Payment Date</label>
                  <input
                    type="date"
                    name="paymentDate"
                    value={subForm.paymentDate}
                    onChange={handleSubFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subscription Period</label>
                  <select
                    name="subscriptionPeriod"
                    value={subForm.subscriptionPeriod}
                    onChange={handleSubFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="quarter">Quarter (90 days)</option>
                    <option value="month">Monthly (30 days)</option>
                    <option value="year">Yearly (365 days)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Subscribed Users</label>
                  <input
                    type="number"
                    name="subscribedUsers"
                    value={subForm.subscribedUsers}
                    onChange={handleSubFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Price Per User/Month ($)</label>
                  <input
                    type="number"
                    name="pricePerUser"
                    value={subForm.pricePerUser}
                    onChange={handleSubFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Total Monthly Amount ($)</label>
                <input
                  type="number"
                  value={subForm.totalMonthlyAmount}
                  readOnly
                  className="w-full px-3 py-2 border border-gray-300 rounded bg-gray-50"
                />
              </div>

              <button
                onClick={handleCreateSubscription}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Subscription'}
              </button>

              <div className="border-t border-gray-200 pt-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-3">Organization Features</h4>
                <p className="text-gray-600 mb-4">Control which modules are available for this organization</p>
                
                <div className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id="recognition-rewards"
                      className="mt-1"
                      defaultChecked
                    />
                    <div>
                      <label htmlFor="recognition-rewards" className="font-medium text-gray-900">
                        Recognition & Rewards Module
                      </label>
                      <p className="text-gray-600 text-sm">
                        Enable peer-to-peer recognition, points economy, and reward shop features
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Wallet Tab */}
          {activeTab === 'wallet' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Credit Organization Wallet</h3>
                <p className="text-gray-600 mb-6">Add funds to {organization.name}'s wallet for rewards and purchases</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Amount ($)</label>
                <input
                  type="number"
                  name="amount"
                  value={walletForm.amount}
                  onChange={handleWalletFormChange}
                  step="0.01"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  name="description"
                  value={walletForm.description}
                  onChange={handleWalletFormChange}
                  placeholder="e.g. Monthly credit allocation"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <button
                onClick={handleCreditWallet}
                disabled={loading}
                className="w-full bg-blue-500 text-white py-3 rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
                </svg>
                {loading ? 'Processing...' : 'Credit Wallet'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <DynamicNoSSR fallback={<ModalSkeleton isOpen={isOpen} />}>
      {modalContent}
    </DynamicNoSSR>
  );
}