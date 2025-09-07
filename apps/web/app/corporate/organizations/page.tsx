"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";

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

  return (
    <div>
      <div className="orgs-header">
        <h2>Organizations</h2>
        <Link href="/corporate/organizations/create">
          <button className="primary-button">Add Organization</button>
        </Link>
      </div>
      {error && <p className="text-red-600 mb-4">{error}</p>}
      <div className="orgs-list">
        {organizations.map(org => (
          <div key={org.id} className="org-card">
            <div className="org-card-row">
              <span className="org-name">{org.name}</span>
              <span className={`status-badge ${org.status}`}>{org.status}</span>
              <button className="manage-button">Manage Organization</button>
            </div>
            <div className="org-card-details">
              <div><strong>User Count</strong><br />{org.userCount}</div>
              <div><strong>Max Employees</strong><br />{org.maxUsers ?? "N/A"}</div>
              <div><strong>Created</strong><br />{new Date(org.createdAt).toLocaleDateString()}</div>
              <div>
                <strong>Subscription</strong><br />
                {org.subscription ? (
                  <span className={`sub-badge ${org.subscription.status}`}>
                    {org.subscription.subscriptionPeriod}
                  </span>
                ) : (
                  "No subscription"
                )}
              </div>
              <div><strong>Last Payment</strong><br />{org.subscription?.lastPaymentDate ?? "N/A"}</div>
              <div><strong>Expiration</strong><br />{org.subscription?.expirationDate ?? "N/A"}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}