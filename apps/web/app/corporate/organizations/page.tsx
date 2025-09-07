"use client";
import React, { useEffect, useState } from "react";

interface Subscription {
  id: string;
  seatsLimit: number;
  planCode: string;
  status: string;
  startAt: string;
  endAt: string;
}

interface Organization {
  id: string;
  name: string;
  status: string;
  domain: string;
  websiteUrl: string;
  userCount: number;
  createdAt: string;
  subscription: Subscription | null;
}

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const res = await fetch("/api/corporate/organizations");
        if (!res.ok) {
          throw new Error("Failed to load organizations");
        }
        const data = await res.json();
        setOrganizations(data);
      } catch (err: any) {
        setError(err.message ?? "Error loading organizations");
      } finally {
        setLoading(false);
      }
    }
    fetchOrganizations();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubscriptionColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'active': return 'bg-blue-100 text-blue-800';
      case 'starter': return 'bg-blue-100 text-blue-800';
      case 'pro': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Organizations</h1>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors">
          Add Organization
        </button>
      </div>

      {error && <p className="text-red-600 mb-4">{error}</p>}
      
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <p className="text-gray-500">Loading organizations...</p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">No organizations found</p>
        </div>
      ) : (
        <div className="space-y-6">
          {organizations.map((org) => (
            <div key={org.id} className="bg-white rounded-lg border border-gray-200 p-6 shadow-sm">
              {/* Organization Header */}
              <div className="flex justify-between items-start mb-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{org.name}</h2>
                  <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(org.status)}`}>
                    {org.status}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {org.subscription && (
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(org.subscription.planCode)}`}>
                      {org.subscription.planCode}
                    </span>
                  )}
                  <button className="text-gray-400 hover:text-gray-600 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  <button className="text-blue-600 text-sm font-medium hover:text-blue-800 flex items-center gap-1">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Manage Organization
                  </button>
                </div>
              </div>

              {/* Organization Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">User Count</p>
                  <p className="text-lg font-semibold text-gray-900">{org.userCount}</p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Max Employees</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {org.subscription?.seatsLimit || "N/A"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Created</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {formatDate(org.createdAt)}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Subscription</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {org.subscription ? org.subscription.planCode : "No subscription"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Last Payment</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {org.subscription ? formatDate(org.subscription.startAt) : "N/A"}
                  </p>
                </div>
                
                <div className="space-y-1">
                  <p className="text-sm text-gray-600">Expiration</p>
                  <p className="text-lg font-semibold text-gray-900">
                    {org.subscription ? formatDate(org.subscription.endAt) : "N/A"}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}