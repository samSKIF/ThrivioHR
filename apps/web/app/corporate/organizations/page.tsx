"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Organizations</h2>
        <Link href="/corporate/organizations/create">
          <button className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700">
            Add Organization
          </button>
        </Link>
      </div>
      {error && <p className="text-red-600">{error}</p>}
      <div className="flex flex-col gap-4">
        {organizations.map((org) => (
          <div
            key={org.id}
            className="bg-white border border-gray-200 rounded-lg shadow p-4"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-semibold">{org.name}</div>
                <span
                  className={`mt-1 inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${
                    org.status === "active"
                      ? "bg-green-100 text-green-800"
                      : "bg-gray-200 text-gray-800"
                  }`}
                >
                  {org.status}
                </span>
              </div>
                <button
                  onClick={() => handleManage(org)}
                  className="bg-gray-100 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-200"
                >
                  Manage Organization
                </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 text-sm">
              <div>
                <strong>User Count</strong>
                <br />
                {org.userCount}
              </div>
              <div>
                <strong>Max Employees</strong>
                <br />
                {org.maxUsers ?? "N/A"}
              </div>
              <div>
                <strong>Created</strong>
                <br />
                {new Date(org.createdAt).toLocaleDateString()}
              </div>
              <div>
                <strong>Subscription</strong>
                <br />
                {org.subscription
                  ? org.subscription.subscriptionPeriod
                  : "No subscription"}
              </div>
              <div>
                <strong>Last Payment</strong>
                <br />
                {org.subscription?.lastPaymentDate ?? "N/A"}
              </div>
              <div>
                <strong>Expiration</strong>
                <br />
                {org.subscription?.expirationDate ?? "N/A"}
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