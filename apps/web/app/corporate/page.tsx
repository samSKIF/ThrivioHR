"use client";
import React, { useEffect, useState } from "react";

interface DashboardData {
  organizations: number;
  users: number;
  subscriptions: number;
  revenue: number;
  status: string;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/corporate/dashboard");
        if (!res.ok) {
          throw new Error("Failed to load dashboard");
        }
        const json = await res.json();
        setData(json);
      } catch (err: any) {
        setError(err.message ?? "Error loading dashboard");
      }
    }
    fetchData();
  }, []);

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Overview</h2>
      {error && <p className="text-red-600">{error}</p>}
      {!data ? (
        <p>Loading dashboard...</p>
      ) : (
        <div className="dashboard-grid">
          <div className="dashboard-card">
            <div className="card-title">Organizations</div>
            <div className="card-value">{data.organizations}</div>
          </div>
          <div className="dashboard-card">
            <div className="card-title">Users</div>
            <div className="card-value">{data.users}</div>
          </div>
          <div className="dashboard-card">
            <div className="card-title">Subscriptions</div>
            <div className="card-value">{data.subscriptions}</div>
          </div>
          <div className="dashboard-card">
            <div className="card-title">Revenue</div>
            <div className="card-value">${data.revenue}</div>
          </div>
          <div className="dashboard-card">
            <div className="card-title">Status</div>
            <div className="card-value">{data.status}</div>
          </div>
        </div>
      )}
    </div>
  );
}