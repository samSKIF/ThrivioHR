"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Settings } from "lucide-react";
import ManageOrganizationModal from "./components/ManageOrganizationModal";

interface OrgListItem {
  id: string;
  name: string;
  status: string;
  userCount: number;
  maxUsers?: number;
  createdAt: string;
  subscription?: {
    status: string;
    subscriptionPeriod: string;
    lastPaymentDate?: string;
    expirationDate?: string;
  };
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<OrgListItem[]>([]);
  const [error, setError] = useState("");
  const [selectedOrg, setSelectedOrg] = useState<OrgListItem | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    async function fetchOrgs() {
      try {
        const res = await fetch("/api/corporate/organizations");
        if (!res.ok) throw new Error("Failed to load organizations");
        const json = await res.json();
        setOrganizations(json);
      } catch (err: any) {
        setError(err.message ?? "Error loading organizations");
      }
    }
    fetchOrgs();
  }, []);

  function handleManage(org: OrgListItem) {
    setSelectedOrg(org);
    setIsModalOpen(true);
  }

  function closeModal() {
    setSelectedOrg(null);
    setIsModalOpen(false);
  }

  async function reloadOrganizations() {
    try {
      const res = await fetch("/api/corporate/organizations");
      if (!res.ok) throw new Error("Failed to reload organizations");
      const json = await res.json();
      setOrganizations(json);
    } catch (err: any) {
      setError(err.message ?? "Error reloading organizations");
    }
  }

  function getSubscriptionBadge(subscription?: OrgListItem['subscription']) {
    if (!subscription || !subscription.subscriptionPeriod || subscription.subscriptionPeriod === 'none') {
      return <span className="text-gray-600">No subscription</span>;
    }
    
    const periodMap: Record<string, { text: string; class: string }> = {
      'monthly': { text: 'monthly', class: 'bg-blue-100 text-blue-800' },
      'quarterly': { text: 'quarterly', class: 'bg-blue-100 text-blue-800' },
      'yearly': { text: 'yearly', class: 'bg-blue-100 text-blue-800' }
    };
    
    const period = periodMap[subscription.subscriptionPeriod.toLowerCase()] || 
                  { text: subscription.subscriptionPeriod.toLowerCase(), class: 'bg-blue-100 text-blue-800' };
    
    return (
      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${period.class}`}>
        {period.text}
      </span>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold">Organizations</h2>
        <Link href="/corporate/organizations/create">
          <button className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2">
            <span>+</span>
            Add Organization
          </button>
        </Link>
      </div>
      
      {error && <p className="text-red-600">{error}</p>}
      
      <div className="space-y-4">
        {organizations.map((org) => (
          <div key={org.id} className="bg-white border border-gray-200 rounded-lg p-6">
            {/* Header Row */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{org.name}</h3>
                <p className="text-sm text-gray-500">Status: {org.status}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-medium ${
                  org.status === 'active' 
                    ? 'bg-blue-500 text-white' 
                    : 'bg-gray-400 text-white'
                }`}>
                  {org.status}
                </span>
                <button
                  onClick={() => handleManage(org)}
                  className="inline-flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900"
                >
                  <Settings size={16} />
                  Manage Organization
                </button>
              </div>
            </div>

            {/* Details Grid */}
            <div className="grid grid-cols-6 gap-4 text-sm">
              <div>
                <p className="text-gray-500 font-medium">User Count</p>
                <p className="text-gray-900 font-semibold">{org.userCount}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Max Employees</p>
                <p className="text-gray-900 font-semibold">{org.maxUsers ?? "N/A"}</p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Created</p>
                <p className="text-gray-900 font-semibold">
                  {new Date(org.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Subscription</p>
                <div className="mt-1">
                  {getSubscriptionBadge(org.subscription)}
                </div>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Last Payment</p>
                <p className="text-gray-900 font-semibold">
                  {org.subscription?.lastPaymentDate 
                    ? new Date(org.subscription.lastPaymentDate).toLocaleDateString()
                    : "N/A"
                  }
                </p>
              </div>
              <div>
                <p className="text-gray-500 font-medium">Expiration</p>
                <p className="text-gray-900 font-semibold">
                  {org.subscription?.expirationDate 
                    ? new Date(org.subscription.expirationDate).toLocaleDateString()
                    : "N/A"
                  }
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {selectedOrg && (
        <ManageOrganizationModal
          organization={selectedOrg}
          isOpen={isModalOpen}
          onClose={closeModal}
          onUpdate={reloadOrganizations}
        />
      )}
    </div>
  );
}