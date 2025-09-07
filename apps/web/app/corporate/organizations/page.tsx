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
        <div className="space-y-4">
          {organizations.map((org) => (
            <div key={org.id} className="bg-white rounded-lg border p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">{org.name}</h2>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(org.status)} mt-1`}>
                    {org.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  {org.subscription && (
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSubscriptionColor(org.subscription.planCode)}`}>
                      {org.subscription.planCode}
                    </span>
                  )}
                  <button className="text-gray-600 hover:text-gray-800 p-1">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                    </svg>
                  </button>
                  <span className="text-blue-600 text-sm font-medium cursor-pointer hover:text-blue-800">
                    Manage Organization
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6 text-sm">
                <div>
                  <p className="text-gray-600 font-medium">User Count</p>
                  <p className="text-gray-900 font-semibold">{org.userCount}</p>
                </div>
                
                <div>
                  <p className="text-gray-600 font-medium">Max Employees</p>
                  <p className="text-gray-900 font-semibold">
                    {org.subscription?.seatsLimit || "N/A"}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-600 font-medium">Created</p>
                  <p className="text-gray-900 font-semibold">
                    {/* We need to add createdAt to the API response */}
                    N/A
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-600 font-medium">Subscription</p>
                  <p className="text-gray-900 font-semibold">
                    {org.subscription ? org.subscription.planCode : "No subscription"}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-600 font-medium">Last Payment</p>
                  <p className="text-gray-900 font-semibold">
                    {org.subscription ? formatDate(org.subscription.startAt) : "N/A"}
                  </p>
                </div>
                
                <div>
                  <p className="text-gray-600 font-medium">Expiration</p>
                  <p className="text-gray-900 font-semibold">
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